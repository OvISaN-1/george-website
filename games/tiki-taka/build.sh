#!/usr/bin/env bash
# Builds the game engine (Rust) into WebAssembly and copies it where the website loads it from.
# Needs Rust with the wasm target:  rustup target add wasm32-unknown-unknown
set -euo pipefail
cd "$(dirname "$0")"
cargo test --release
cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/tiki_taka.wasm ../../quiz-zone/tiki-taka/tiki_taka.wasm
ls -l ../../quiz-zone/tiki-taka/tiki_taka.wasm
