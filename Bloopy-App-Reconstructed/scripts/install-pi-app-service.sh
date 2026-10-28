#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${HOME}/bloopy-app"
SERVICE_DIR="${HOME}/.config/systemd/user"
SERVICE_FILE="${SERVICE_DIR}/bloopy-app.service"

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "Bloopy app not found at ${APP_DIR}" >&2
  exit 1
fi

mkdir -p "${SERVICE_DIR}"
cat > "${SERVICE_FILE}" <<SERVICE
[Unit]
Description=Bloopy Next.js App
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
SERVICE

systemctl --user daemon-reload
systemctl --user enable --now bloopy-app.service
systemctl --user status bloopy-app.service --no-pager

echo
echo "Bloopy app service installed."
echo "Local UI:     http://127.0.0.1:3000"
echo "Health check: http://127.0.0.1:3000/api/health"
