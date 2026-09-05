#!/usr/bin/env bash
set -euo pipefail

verify_url="${1:-http://127.0.0.1:4173}"
node scripts/verify-url.mjs "$verify_url"
