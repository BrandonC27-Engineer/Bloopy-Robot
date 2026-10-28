#!/usr/bin/env bash
set -euo pipefail

APP_URL="${BLOOPY_KIOSK_URL:-http://127.0.0.1:3000/app}"
HEALTH_URL="${BLOOPY_KIOSK_HEALTH_URL:-http://127.0.0.1:3000/api/health}"
LOCAL_BIN="${HOME}/.local/bin"
KIOSK_SCRIPT="${LOCAL_BIN}/bloopy-kiosk"
LABWC_DIR="${HOME}/.config/labwc"
AUTOSTART_FILE="${LABWC_DIR}/autostart"
AUTOSTART_MARKER="# Bloopy touchscreen kiosk"

mkdir -p "${LOCAL_BIN}" "${LABWC_DIR}"

cat > "${KIOSK_SCRIPT}" <<SCRIPT
#!/usr/bin/env bash
set -u

APP_URL='${APP_URL}'
HEALTH_URL='${HEALTH_URL}'

CHROMIUM="\$(command -v chromium || command -v chromium-browser || true)"
if [[ -z "\${CHROMIUM}" ]]; then
  echo "Bloopy kiosk: Chromium is not installed." >&2
  exit 1
fi

# Wait for the local Next.js service instead of racing it at desktop login.
for _ in \$(seq 1 75); do
  if curl -fsS --max-time 1 "\${HEALTH_URL}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS --max-time 2 "\${HEALTH_URL}" >/dev/null 2>&1; then
  echo "Bloopy kiosk: app did not become ready at \${HEALTH_URL}." >&2
  exit 1
fi

exec "\${CHROMIUM}" \
  --kiosk \
  --start-maximized \
  --no-first-run \
  --no-default-browser-check \
  --noerrdialogs \
  --disable-session-crashed-bubble \
  --disable-infobars \
  --disable-translate \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --ozone-platform=wayland \
  --user-data-dir="\${HOME}/.config/chromium-bloopy" \
  "\${APP_URL}"
SCRIPT

chmod +x "${KIOSK_SCRIPT}"
touch "${AUTOSTART_FILE}"

if ! grep -Fq "${AUTOSTART_MARKER}" "${AUTOSTART_FILE}"; then
  cat >> "${AUTOSTART_FILE}" <<AUTOSTART

${AUTOSTART_MARKER}
${KIOSK_SCRIPT} &
AUTOSTART
fi

cat <<INFO
Bloopy kiosk startup installed.

Labwc autostart: ${AUTOSTART_FILE}
Kiosk launcher:  ${KIOSK_SCRIPT}
Kiosk URL:       ${APP_URL}

The desktop session must auto-login for the touchscreen kiosk to appear after boot.
On first launch, sign in to Bloopy once; the dedicated Chromium profile will keep that session.
INFO
