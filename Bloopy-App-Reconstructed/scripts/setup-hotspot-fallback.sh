#!/usr/bin/env bash
# Raspberry Pi NetworkManager: primary home Wi-Fi, secondary phone hotspot.
# Safe to run via SSH because it modifies saved profiles but does not activate
# a new connection or restart NetworkManager.
set -euo pipefail
set +x

DEVICE="${BLOOPY_WIFI_DEVICE:-wlan0}"
HOTSPOT_PROFILE="Bloopy-Phone-Hotspot"

if [[ "$EUID" -ne 0 ]]; then
  echo "Run: sudo bash scripts/setup-hotspot-fallback.sh"
  exit 1
fi
command -v nmcli >/dev/null || { echo "NetworkManager (nmcli) is required"; exit 1; }
ACTIVE_PROFILE="$(nmcli -g GENERAL.CONNECTION device show "$DEVICE" | head -n1)"
if [[ -z "$ACTIVE_PROFILE" || "$ACTIVE_PROFILE" == "--" ]]; then
  echo "Could not detect active home Wi-Fi profile on $DEVICE. Keep home Wi-Fi connected for setup."
  exit 1
fi
if [[ "$ACTIVE_PROFILE" == "$HOTSPOT_PROFILE" ]]; then
  echo "You're on the hotspot; connect to home Wi-Fi first to configure the preferred profile."
  exit 1
fi

echo "Current home Wi-Fi profile: $ACTIVE_PROFILE"
read -r -p "Your phone hotspot's Wi-Fi name (SSID): " HOTSPOT_SSID
[[ -n "$HOTSPOT_SSID" ]] || { echo "Hotspot SSID cannot be empty"; exit 1; }
read -r -s -p "Your phone hotspot's Wi-Fi password (hidden): " HOTSPOT_PSK
printf '\n'
if (( ${#HOTSPOT_PSK} < 8 || ${#HOTSPOT_PSK} > 63 )); then
  echo "Use a standard WPA2 hotspot password of 8-63 characters."
  exit 1
fi

if ! nmcli -g connection.id connection show | grep -Fxq "$HOTSPOT_PROFILE"; then
  nmcli connection add type wifi ifname "$DEVICE" con-name "$HOTSPOT_PROFILE" ssid "$HOTSPOT_SSID" >/dev/null
fi
nmcli connection modify "$HOTSPOT_PROFILE" \
  802-11-wireless.ssid "$HOTSPOT_SSID" \
  802-11-wireless.mode infrastructure \
  802-11-wireless-security.key-mgmt wpa-psk \
  802-11-wireless-security.psk "$HOTSPOT_PSK" \
  connection.autoconnect yes \
  connection.autoconnect-priority 50 \
  connection.autoconnect-retries 2 \
  ipv4.method auto
unset HOTSPOT_PSK
nmcli connection modify "$ACTIVE_PROFILE" \
  connection.autoconnect yes \
  connection.autoconnect-priority 100 \
  connection.autoconnect-retries 2

# Hotspot gets DNS from the phone. Home DNS settings are untouched.
echo
echo "Profiles saved; current Wi-Fi was NOT disconnected."
echo "Home Wi-Fi: $ACTIVE_PROFILE (priority 100)"
echo "Hotspot: $HOTSPOT_PROFILE (priority 50)"
echo "Enable your phone hotspot before booting Bloopy away from home."
echo "Check later: nmcli -f GENERAL.CONNECTION,IP4.ADDRESS device show $DEVICE"
echo "If connected home Wi-Fi has no internet, this setup does not detect that case."
