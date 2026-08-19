#!/usr/bin/env bash
# Start the host and both remotes together. Ctrl+C stops all three.
set -e
trap 'kill 0' EXIT

(cd remote-invoices && bun run dev) &
(cd remote-reports && bun run dev) &
(cd host && bun run dev) &

wait
