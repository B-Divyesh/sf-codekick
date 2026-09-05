FROM rust:1.90-bookworm AS builder
WORKDIR /build
COPY realtime/Cargo.toml realtime/Cargo.toml
COPY realtime/src realtime/src
RUN cargo build --manifest-path realtime/Cargo.toml --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /build/realtime/target/release/codekick-realtime /usr/local/bin/codekick-realtime
ENV PORT=8080 DATA_DIR=/data
EXPOSE 8080
USER 65532:65532
CMD ["codekick-realtime"]
