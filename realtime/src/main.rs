use std::{
    collections::{HashMap, HashSet, VecDeque},
    env,
    net::{IpAddr, SocketAddr},
    path::{Path as FilePath, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use axum::{
    Json, Router,
    extract::{
        ConnectInfo, Path, Query, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    http::{HeaderValue, Method, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use futures_util::{SinkExt, StreamExt};
use rand::{Rng, distributions::Alphanumeric};
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use tokio::{net::TcpListener, sync::broadcast, time};
use tower_http::{cors::CorsLayer, set_header::SetResponseHeaderLayer};

const ROOM_TTL_SECONDS: i64 = 6 * 60 * 60;
const RATE_WINDOW: Duration = Duration::from_secs(60);
const RATE_LIMIT: usize = 12;
const FIELD_WIDTH: f64 = 960.0;
const FIELD_HEIGHT: f64 = 540.0;
const PLAYER_RADIUS: f64 = 22.0;
const BALL_RADIUS: f64 = 10.0;
const RULES: [&str; 3] = ["Crosswind", "Spring turf", "Pinched goals"];
const SLOTS: [&str; 4] = ["sun-1", "tide-1", "sun-2", "tide-2"];

#[derive(Clone)]
struct AppState {
    database_path: PathBuf,
    rooms: Arc<Mutex<HashMap<String, Room>>>,
    requests: Arc<Mutex<HashMap<IpAddr, VecDeque<Instant>>>>,
    match_seconds: f64,
}

#[derive(Clone)]
struct Room {
    code: String,
    match_state: MatchState,
    members: Vec<Member>,
    inputs: HashMap<String, PlayerInput>,
    connected: HashMap<String, usize>,
    updated_at: i64,
    expires_at: i64,
    tick: u64,
    sender: broadcast::Sender<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Member {
    token: String,
    slot: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MatchState {
    players: Vec<Player>,
    ball: Ball,
    score: Score,
    time_left: f64,
    phase: String,
    phase_timer: f64,
    rule: String,
    mode: String,
    combo_until: f64,
    selected_a: String,
    selected_b: String,
    paused_from: String,
}

#[derive(Clone, Serialize, Deserialize)]
struct Player {
    id: String,
    team: String,
    x: f64,
    y: f64,
    vx: f64,
    vy: f64,
    selected: bool,
}

#[derive(Clone, Serialize, Deserialize)]
struct Ball {
    x: f64,
    y: f64,
    vx: f64,
    vy: f64,
    owner: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
struct Score {
    sun: u16,
    tide: u16,
}

#[derive(Clone, Default, Deserialize)]
struct PlayerInput {
    #[serde(default)]
    up: bool,
    #[serde(default)]
    down: bool,
    #[serde(default)]
    left: bool,
    #[serde(default)]
    right: bool,
    #[serde(default)]
    pass: bool,
    #[serde(default)]
    shot: bool,
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum ClientMessage {
    Input {
        #[serde(default)]
        up: bool,
        #[serde(default)]
        down: bool,
        #[serde(default)]
        left: bool,
        #[serde(default)]
        right: bool,
        #[serde(default)]
        pass: bool,
        #[serde(default)]
        shot: bool,
    },
    Pause,
    Rematch,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RoomResponse {
    code: String,
    player_token: String,
    slot: String,
    expires_at: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot<'a> {
    r#type: &'static str,
    room_code: &'a str,
    state: &'a MatchState,
    connected_players: usize,
    claimed_players: usize,
    tick: u64,
}

#[derive(Serialize, Deserialize)]
struct PersistedRoom {
    state: MatchState,
    members: Vec<Member>,
    updated_at: i64,
    expires_at: i64,
    tick: u64,
}

impl MatchState {
    fn new(seconds: f64) -> Self {
        Self {
            players: starting_players(),
            ball: Ball {
                x: FIELD_WIDTH / 2.0,
                y: FIELD_HEIGHT / 2.0,
                vx: 0.0,
                vy: 0.0,
                owner: None,
            },
            score: Score { sun: 0, tide: 0 },
            time_left: seconds,
            phase: "waiting".into(),
            phase_timer: 1.0,
            rule: RULES[0].into(),
            mode: "local".into(),
            combo_until: 0.0,
            selected_a: "sun-1".into(),
            selected_b: "tide-1".into(),
            paused_from: "playing".into(),
        }
    }

    fn reset(&mut self, seconds: f64) {
        let next = RULES
            .iter()
            .position(|rule| *rule == self.rule)
            .map(|index| (index + 1) % RULES.len())
            .unwrap_or(0);
        *self = MatchState::new(seconds);
        self.phase = "kickoff".into();
        self.rule = RULES[next].into();
    }

    fn advance(&mut self, dt: f64, members: &[Member], inputs: &mut HashMap<String, PlayerInput>) {
        if matches!(self.phase.as_str(), "waiting" | "paused" | "ended") {
            return;
        }
        if matches!(self.phase.as_str(), "kickoff" | "goal") {
            self.phase_timer -= dt;
            if self.phase_timer <= 0.0 {
                self.phase = "playing".into();
            }
            return;
        }

        self.time_left = (self.time_left - dt).max(0.0);
        self.combo_until = (self.combo_until - dt).max(0.0);
        let claimed: HashSet<&str> = members.iter().map(|member| member.slot.as_str()).collect();
        for member in members {
            let input = inputs.get(&member.slot).cloned().unwrap_or_default();
            self.move_player(&member.slot, &input, dt);
            if input.pass {
                self.kick(&member.slot, false);
            }
            if input.shot {
                self.kick(&member.slot, true);
            }
            if let Some(stored) = inputs.get_mut(&member.slot) {
                stored.pass = false;
                stored.shot = false;
            }
        }
        for id in SLOTS {
            if !claimed.contains(id) {
                self.move_bot(id, dt);
            }
        }
        self.move_ball(dt);
        self.try_pickup();
        self.check_goal();
        if self.time_left <= 0.0 && self.phase == "playing" {
            self.phase = "ended".into();
        }
    }

    fn move_player(&mut self, id: &str, input: &PlayerInput, dt: f64) {
        let Some(player) = self.players.iter_mut().find(|player| player.id == id) else {
            return;
        };
        let dx = i8::from(input.right) as f64 - i8::from(input.left) as f64;
        let dy = i8::from(input.down) as f64 - i8::from(input.up) as f64;
        let magnitude = dx.hypot(dy).max(1.0);
        player.vx = dx / magnitude * 235.0;
        player.vy = dy / magnitude * 235.0;
        player.x = (player.x + player.vx * dt).clamp(27.0, FIELD_WIDTH - 27.0);
        player.y = (player.y + player.vy * dt).clamp(27.0, FIELD_HEIGHT - 27.0);
    }

    fn move_bot(&mut self, id: &str, dt: f64) {
        let ball_x = self.ball.x;
        let ball_y = self.ball.y;
        let Some(player) = self.players.iter_mut().find(|player| player.id == id) else {
            return;
        };
        let dx = ball_x - player.x;
        let dy = ball_y - player.y;
        let distance = dx.hypot(dy).max(1.0);
        player.vx = dx / distance * 162.0;
        player.vy = dy / distance * 162.0;
        player.x = (player.x + player.vx * dt).clamp(27.0, FIELD_WIDTH - 27.0);
        player.y = (player.y + player.vy * dt).clamp(27.0, FIELD_HEIGHT - 27.0);
        if self.ball.owner.as_deref() == Some(id) {
            self.kick(id, true);
        }
    }

    fn kick(&mut self, id: &str, shot: bool) {
        if self.phase != "playing" || self.ball.owner.as_deref() != Some(id) {
            return;
        }
        let Some(player) = self.players.iter().find(|player| player.id == id) else {
            return;
        };
        let direction = if player.team == "sun" { 1.0 } else { -1.0 };
        let teammate = self
            .players
            .iter()
            .find(|candidate| candidate.team == player.team && candidate.id != id);
        let target_x = if shot {
            if direction > 0.0 {
                FIELD_WIDTH + 30.0
            } else {
                -30.0
            }
        } else {
            teammate
                .map(|p| p.x)
                .unwrap_or(player.x + direction * 110.0)
        };
        let target_y = if shot {
            FIELD_HEIGHT / 2.0
        } else {
            teammate.map(|p| p.y).unwrap_or(FIELD_HEIGHT / 2.0)
        };
        let dx = target_x - player.x;
        let dy = target_y - player.y;
        let distance = dx.hypot(dy).max(1.0);
        let pace = if shot { 690.0 } else { 440.0 };
        self.ball.owner = None;
        self.ball.x = player.x + direction * (PLAYER_RADIUS + BALL_RADIUS + 2.0);
        self.ball.y = player.y;
        self.ball.vx = dx / distance * pace;
        self.ball.vy = dy / distance * pace;
    }

    fn move_ball(&mut self, dt: f64) {
        if let Some(owner_id) = self.ball.owner.clone() {
            if let Some(owner) = self.players.iter().find(|player| player.id == owner_id) {
                let direction = if owner.team == "sun" { 1.0 } else { -1.0 };
                self.ball.x = owner.x + direction * (PLAYER_RADIUS + BALL_RADIUS + 2.0);
                self.ball.y = owner.y;
                self.ball.vx = owner.vx;
                self.ball.vy = owner.vy;
            }
            return;
        }
        if self.rule == "Crosswind" {
            self.ball.vy += (self.time_left * 0.7).sin() * 28.0 * dt;
        }
        self.ball.x += self.ball.vx * dt;
        self.ball.y += self.ball.vy * dt;
        let drag = if self.rule == "Spring turf" {
            0.996
        } else {
            0.993
        };
        self.ball.vx *= drag;
        self.ball.vy *= drag;
        if self.ball.y < BALL_RADIUS || self.ball.y > FIELD_HEIGHT - BALL_RADIUS {
            self.ball.y = self.ball.y.clamp(BALL_RADIUS, FIELD_HEIGHT - BALL_RADIUS);
            self.ball.vy *= if self.rule == "Spring turf" {
                -0.92
            } else {
                -0.72
            };
        }
    }

    fn try_pickup(&mut self) {
        if self.ball.owner.is_some() {
            return;
        }
        for player in &self.players {
            if (player.x - self.ball.x).hypot(player.y - self.ball.y)
                < PLAYER_RADIUS + BALL_RADIUS + 5.0
                && self.ball.vx.hypot(self.ball.vy) < 330.0
            {
                self.ball.owner = Some(player.id.clone());
                self.combo_until = 2.0;
                if player.team == "sun" {
                    self.selected_a = player.id.clone();
                } else {
                    self.selected_b = player.id.clone();
                }
                break;
            }
        }
    }

    fn check_goal(&mut self) {
        let goal_half_height = if self.rule == "Pinched goals" {
            70.0
        } else {
            90.0
        };
        if (self.ball.y - FIELD_HEIGHT / 2.0).abs() > goal_half_height {
            return;
        }
        if self.ball.x < -35.0 {
            self.score.tide += 1;
        } else if self.ball.x > FIELD_WIDTH + 35.0 {
            self.score.sun += 1;
        } else {
            return;
        }
        self.players = starting_players();
        self.ball = Ball {
            x: FIELD_WIDTH / 2.0,
            y: FIELD_HEIGHT / 2.0,
            vx: 0.0,
            vy: 0.0,
            owner: None,
        };
        self.combo_until = 0.0;
        self.phase = if self.time_left <= 0.0 {
            "ended"
        } else {
            "goal"
        }
        .into();
        self.phase_timer = 1.2;
    }
}

fn starting_players() -> Vec<Player> {
    vec![
        Player {
            id: "sun-1".into(),
            team: "sun".into(),
            x: 330.0,
            y: 210.0,
            vx: 0.0,
            vy: 0.0,
            selected: true,
        },
        Player {
            id: "sun-2".into(),
            team: "sun".into(),
            x: 330.0,
            y: 330.0,
            vx: 0.0,
            vy: 0.0,
            selected: false,
        },
        Player {
            id: "tide-1".into(),
            team: "tide".into(),
            x: 630.0,
            y: 210.0,
            vx: 0.0,
            vy: 0.0,
            selected: true,
        },
        Player {
            id: "tide-2".into(),
            team: "tide".into(),
            x: 630.0,
            y: 330.0,
            vx: 0.0,
            vy: 0.0,
            selected: false,
        },
    ]
}

impl AppState {
    fn open(path: impl AsRef<FilePath>, match_seconds: f64) -> Result<Self, String> {
        let database_path = path.as_ref().to_path_buf();
        let connection = Connection::open(&database_path).map_err(|error| error.to_string())?;
        connection
            .busy_timeout(Duration::from_secs(3))
            .map_err(|error| error.to_string())?;
        connection
            .execute_batch(
                "CREATE TABLE IF NOT EXISTS rooms (
                code TEXT PRIMARY KEY,
                room_json TEXT NOT NULL,
                expires_at INTEGER NOT NULL
            );",
            )
            .map_err(|error| error.to_string())?;
        let state = Self {
            database_path,
            rooms: Arc::new(Mutex::new(HashMap::new())),
            requests: Arc::new(Mutex::new(HashMap::new())),
            match_seconds,
        };
        state.load_rooms()?;
        Ok(state)
    }

    fn connection(&self) -> Result<Connection, String> {
        let connection =
            Connection::open(&self.database_path).map_err(|error| error.to_string())?;
        connection
            .busy_timeout(Duration::from_secs(3))
            .map_err(|error| error.to_string())?;
        Ok(connection)
    }

    fn load_rooms(&self) -> Result<(), String> {
        let now = unix_time();
        let connection = self.connection()?;
        connection
            .execute("DELETE FROM rooms WHERE expires_at <= ?1", [now])
            .map_err(|error| error.to_string())?;
        let mut statement = connection
            .prepare("SELECT code, room_json FROM rooms WHERE expires_at > ?1")
            .map_err(|error| error.to_string())?;
        let rows = statement
            .query_map([now], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|error| error.to_string())?;
        let mut rooms = self
            .rooms
            .lock()
            .map_err(|_| "Room lock failed".to_string())?;
        for row in rows {
            let (code, json) = row.map_err(|error| error.to_string())?;
            let saved: PersistedRoom =
                serde_json::from_str(&json).map_err(|error| error.to_string())?;
            let (sender, _) = broadcast::channel(64);
            rooms.insert(
                code.clone(),
                Room {
                    code,
                    match_state: saved.state,
                    members: saved.members,
                    inputs: HashMap::new(),
                    connected: HashMap::new(),
                    updated_at: saved.updated_at,
                    expires_at: saved.expires_at,
                    tick: saved.tick,
                    sender,
                },
            );
        }
        Ok(())
    }

    fn save_room(&self, room: &Room) -> Result<(), String> {
        let payload = PersistedRoom {
            state: room.match_state.clone(),
            members: room.members.clone(),
            updated_at: room.updated_at,
            expires_at: room.expires_at,
            tick: room.tick,
        };
        let json = serde_json::to_string(&payload).map_err(|error| error.to_string())?;
        self.connection()?.execute(
            "INSERT INTO rooms(code, room_json, expires_at) VALUES(?1, ?2, ?3)
             ON CONFLICT(code) DO UPDATE SET room_json=excluded.room_json, expires_at=excluded.expires_at",
            params![room.code, json, room.expires_at],
        ).map_err(|error| error.to_string())?;
        Ok(())
    }

    fn allowed(&self, address: IpAddr) -> bool {
        let now = Instant::now();
        let mut requests = self.requests.lock().expect("rate limiter lock");
        let recent = requests.entry(address).or_default();
        while recent
            .front()
            .is_some_and(|request| now.duration_since(*request) >= RATE_WINDOW)
        {
            recent.pop_front();
        }
        if recent.len() >= RATE_LIMIT {
            return false;
        }
        recent.push_back(now);
        true
    }
}

fn unix_time() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn random_token() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect()
}

fn random_code() -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut random = rand::thread_rng();
    (0..6)
        .map(|_| ALPHABET[random.gen_range(0..ALPHABET.len())] as char)
        .collect()
}

fn json_error(status: StatusCode, message: &str) -> Response {
    (status, Json(serde_json::json!({ "error": message }))).into_response()
}

fn rate_limited() -> Response {
    let mut response = json_error(
        StatusCode::TOO_MANY_REQUESTS,
        "Too many room requests. Wait one minute and try again.",
    );
    response
        .headers_mut()
        .insert(header::RETRY_AFTER, HeaderValue::from_static("60"));
    response
}

async fn health(State(state): State<AppState>) -> Response {
    match state.connection().and_then(|connection| {
        connection
            .query_row("SELECT 1", [], |_| Ok(()))
            .map_err(|error| error.to_string())
    }) {
        Ok(()) => (
            StatusCode::OK,
            Json(serde_json::json!({ "status": "ok", "storage": "sqlite" })),
        )
            .into_response(),
        Err(_) => json_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "Room storage is unavailable.",
        ),
    }
}

async fn create_room(
    State(state): State<AppState>,
    ConnectInfo(address): ConnectInfo<SocketAddr>,
) -> Response {
    if !state.allowed(address.ip()) {
        return rate_limited();
    }
    let now = unix_time();
    let token = random_token();
    let mut rooms = state.rooms.lock().expect("room lock");
    let mut code = random_code();
    while rooms.contains_key(&code) {
        code = random_code();
    }
    let (sender, _) = broadcast::channel(64);
    let room = Room {
        code: code.clone(),
        match_state: MatchState::new(state.match_seconds),
        members: vec![Member {
            token: token.clone(),
            slot: SLOTS[0].into(),
        }],
        inputs: HashMap::new(),
        connected: HashMap::new(),
        updated_at: now,
        expires_at: now + ROOM_TTL_SECONDS,
        tick: 0,
        sender,
    };
    if state.save_room(&room).is_err() {
        return json_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "The room could not be saved. Try again.",
        );
    }
    let response = RoomResponse {
        code: code.clone(),
        player_token: token,
        slot: SLOTS[0].into(),
        expires_at: room.expires_at,
    };
    rooms.insert(code, room);
    (StatusCode::CREATED, Json(response)).into_response()
}

async fn join_room(
    State(state): State<AppState>,
    ConnectInfo(address): ConnectInfo<SocketAddr>,
    Path(raw_code): Path<String>,
) -> Response {
    if !state.allowed(address.ip()) {
        return rate_limited();
    }
    let code = raw_code.trim().to_ascii_uppercase();
    if code.len() != 6
        || !code
            .chars()
            .all(|character| character.is_ascii_alphanumeric())
    {
        return json_error(
            StatusCode::BAD_REQUEST,
            "Enter the six-character room code.",
        );
    }
    let now = unix_time();
    let mut rooms = state.rooms.lock().expect("room lock");
    let Some(room) = rooms.get_mut(&code) else {
        return json_error(
            StatusCode::NOT_FOUND,
            "That room was not found. Check the code and try again.",
        );
    };
    if room.expires_at <= now {
        return json_error(StatusCode::GONE, "That room expired. Create a new room.");
    }
    if room.members.len() >= SLOTS.len() {
        return json_error(StatusCode::CONFLICT, "That room already has four players.");
    }
    let token = random_token();
    let slot = SLOTS[room.members.len()].to_string();
    room.members.push(Member {
        token: token.clone(),
        slot: slot.clone(),
    });
    room.updated_at = now;
    room.expires_at = now + ROOM_TTL_SECONDS;
    if room.members.len() == 2 && room.match_state.phase == "waiting" {
        room.match_state.phase = "kickoff".into();
    }
    if state.save_room(room).is_err() {
        return json_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "The room could not be saved. Try again.",
        );
    }
    let response = RoomResponse {
        code,
        player_token: token,
        slot,
        expires_at: room.expires_at,
    };
    (StatusCode::OK, Json(response)).into_response()
}

#[derive(Deserialize)]
struct ConnectQuery {
    token: String,
}

async fn connect_room(
    websocket: WebSocketUpgrade,
    State(state): State<AppState>,
    Path(raw_code): Path<String>,
    Query(query): Query<ConnectQuery>,
) -> Response {
    let code = raw_code.to_ascii_uppercase();
    let valid = state
        .rooms
        .lock()
        .expect("room lock")
        .get(&code)
        .is_some_and(|room| {
            room.members
                .iter()
                .any(|member| member.token == query.token)
                && room.expires_at > unix_time()
        });
    if !valid {
        return json_error(
            StatusCode::UNAUTHORIZED,
            "This room link is no longer valid.",
        );
    }
    websocket
        .on_upgrade(move |socket| handle_socket(socket, state, code, query.token))
        .into_response()
}

async fn handle_socket(socket: WebSocket, state: AppState, code: String, token: String) {
    let (mut sender, mut receiver) = socket.split();
    let (initial_snapshot, mut room_receiver) = {
        let mut rooms = state.rooms.lock().expect("room lock");
        let Some(room) = rooms.get_mut(&code) else {
            return;
        };
        *room.connected.entry(token.clone()).or_insert(0) += 1;
        room.updated_at = unix_time();
        room.expires_at = room.updated_at + ROOM_TTL_SECONDS;
        let snapshot = snapshot_json(room);
        let _ = room.sender.send(snapshot.clone());
        (snapshot, room.sender.subscribe())
    };
    if sender
        .send(Message::Text(initial_snapshot.into()))
        .await
        .is_err()
    {
        return;
    }

    loop {
        tokio::select! {
            incoming = receiver.next() => {
                let Some(Ok(message)) = incoming else { break };
                match message {
                    Message::Text(text) => {
                        if let Ok(command) = serde_json::from_str::<ClientMessage>(&text) {
                            apply_client_message(&state, &code, &token, command);
                        }
                    }
                    Message::Close(_) => break,
                    _ => {}
                }
            }
            outgoing = room_receiver.recv() => {
                match outgoing {
                    Ok(text) => {
                        if sender.send(Message::Text(text.into())).await.is_err() { break; }
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                    _ => {}
                }
            }
        }
    }
    if let Some(room) = state.rooms.lock().expect("room lock").get_mut(&code) {
        if let Some(count) = room.connected.get_mut(&token) {
            *count = count.saturating_sub(1);
            if *count == 0 {
                room.connected.remove(&token);
            }
        }
        if let Some(slot) = room
            .members
            .iter()
            .find(|member| member.token == token)
            .map(|member| member.slot.clone())
        {
            room.inputs.remove(&slot);
        }
        let _ = room.sender.send(snapshot_json(room));
    }
}

fn apply_client_message(state: &AppState, code: &str, token: &str, message: ClientMessage) {
    let mut rooms = state.rooms.lock().expect("room lock");
    let Some(room) = rooms.get_mut(code) else {
        return;
    };
    let Some(slot) = room
        .members
        .iter()
        .find(|member| member.token == token)
        .map(|member| member.slot.clone())
    else {
        return;
    };
    room.updated_at = unix_time();
    room.expires_at = room.updated_at + ROOM_TTL_SECONDS;
    match message {
        ClientMessage::Input {
            up,
            down,
            left,
            right,
            pass,
            shot,
        } => {
            room.inputs.insert(
                slot,
                PlayerInput {
                    up,
                    down,
                    left,
                    right,
                    pass,
                    shot,
                },
            );
        }
        ClientMessage::Pause => {
            if room.match_state.phase == "paused" {
                room.match_state.phase = room.match_state.paused_from.clone();
            } else if matches!(
                room.match_state.phase.as_str(),
                "kickoff" | "playing" | "goal"
            ) {
                room.match_state.paused_from = room.match_state.phase.clone();
                room.match_state.phase = "paused".into();
            }
        }
        ClientMessage::Rematch => room.match_state.reset(state.match_seconds),
    }
}

fn snapshot_json(room: &Room) -> String {
    serde_json::to_string(&Snapshot {
        r#type: "state",
        room_code: &room.code,
        state: &room.match_state,
        connected_players: room.connected.values().filter(|count| **count > 0).count(),
        claimed_players: room.members.len(),
        tick: room.tick,
    })
    .unwrap_or_else(|_| "{\"type\":\"error\"}".into())
}

async fn tick_rooms(state: AppState) {
    let mut interval = time::interval(Duration::from_micros(16_667));
    let mut persist_counter = 0u8;
    loop {
        interval.tick().await;
        persist_counter = persist_counter.wrapping_add(1);
        let now = unix_time();
        let mut expired = Vec::new();
        let mut saves = Vec::new();
        {
            let mut rooms = state.rooms.lock().expect("room lock");
            for (code, room) in rooms.iter_mut() {
                if room.expires_at <= now {
                    expired.push(code.clone());
                    continue;
                }
                if !room.connected.is_empty() {
                    room.match_state
                        .advance(1.0 / 60.0, &room.members, &mut room.inputs);
                    room.tick += 1;
                    if room.tick % 3 == 0 {
                        let _ = room.sender.send(snapshot_json(room));
                    }
                }
                if persist_counter % 60 == 0 {
                    saves.push(room.clone());
                }
            }
            for code in &expired {
                rooms.remove(code);
            }
        }
        for room in saves {
            let _ = state.save_room(&room);
        }
        if !expired.is_empty() {
            if let Ok(connection) = state.connection() {
                for code in expired {
                    let _ = connection.execute("DELETE FROM rooms WHERE code = ?1", [code]);
                }
            }
        }
    }
}

fn router(state: AppState) -> Router {
    let origins = [
        HeaderValue::from_static("https://codekick.sociobot.in"),
        HeaderValue::from_static("http://127.0.0.1:4173"),
        HeaderValue::from_static("http://localhost:5173"),
    ];
    Router::new()
        .route(
            "/",
            get(|| async {
                Json(serde_json::json!({ "service": "Codekick rooms", "health": "/health" }))
            }),
        )
        .route("/health", get(health))
        .route("/rooms", post(create_room))
        .route("/rooms/{code}/join", post(join_room))
        .route("/rooms/{code}/connect", get(connect_room))
        .layer(
            CorsLayer::new()
                .allow_origin(origins)
                .allow_methods([Method::GET, Method::POST])
                .allow_headers([header::CONTENT_TYPE]),
        )
        .layer(SetResponseHeaderLayer::if_not_present(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .with_state(state)
}

#[tokio::main]
async fn main() {
    let port = env::var("PORT")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(8080);
    let data_dir = env::var("DATA_DIR").unwrap_or_else(|_| "/data".into());
    std::fs::create_dir_all(&data_dir).expect("create data directory");
    let seconds = env::var("MATCH_SECONDS")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(240.0);
    let state = AppState::open(FilePath::new(&data_dir).join("codekick.sqlite3"), seconds)
        .expect("open room database");
    tokio::spawn(tick_rooms(state.clone()));
    let listener = TcpListener::bind(("0.0.0.0", port))
        .await
        .expect("bind room service");
    axum::serve(
        listener,
        router(state).into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .expect("serve room service");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_state(directory: &tempfile::TempDir) -> AppState {
        AppState::open(directory.path().join("rooms.sqlite3"), 4.0).unwrap()
    }

    #[test]
    fn claim_room_persistence_survives_restart() {
        let directory = tempfile::tempdir().unwrap();
        let state = test_state(&directory);
        let (sender, _) = broadcast::channel(8);
        let room = Room {
            code: "KICK24".into(),
            match_state: MatchState::new(240.0),
            members: vec![Member {
                token: "private-token".into(),
                slot: "sun-1".into(),
            }],
            inputs: HashMap::new(),
            connected: HashMap::new(),
            updated_at: unix_time(),
            expires_at: unix_time() + ROOM_TTL_SECONDS,
            tick: 42,
            sender,
        };
        state.save_room(&room).unwrap();
        drop(state);
        let restarted = test_state(&directory);
        let rooms = restarted.rooms.lock().unwrap();
        let restored = rooms.get("KICK24").unwrap();
        assert_eq!(restored.tick, 42);
        assert_eq!(restored.members[0].slot, "sun-1");
        assert!(restored.expires_at - unix_time() >= ROOM_TTL_SECONDS - 2);
    }

    #[test]
    fn online_match_uses_a_four_minute_clock() {
        let state = MatchState::new(240.0);
        assert_eq!(state.time_left, 240.0);
        assert_eq!(state.score.sun, 0);
        assert_eq!(state.score.tide, 0);
    }

    #[tokio::test]
    async fn health_checks_sqlite() {
        let directory = tempfile::tempdir().unwrap();
        let response = health(State(test_state(&directory))).await;
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn rate_limit_returns_429_with_retry_after() {
        let directory = tempfile::tempdir().unwrap();
        let state = test_state(&directory);
        let address = SocketAddr::from(([127, 0, 0, 1], 5000));
        for _ in 0..RATE_LIMIT {
            assert_eq!(
                create_room(State(state.clone()), ConnectInfo(address))
                    .await
                    .status(),
                StatusCode::CREATED
            );
        }
        let limited = create_room(State(state), ConnectInfo(address)).await;
        assert_eq!(limited.status(), StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(limited.headers().get(header::RETRY_AFTER).unwrap(), "60");
    }
}
