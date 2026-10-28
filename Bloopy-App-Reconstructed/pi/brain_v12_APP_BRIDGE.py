import time
import cv2
import serial
import subprocess
import threading
import queue
import select
import re
import os
import signal
import socket
import sys
import math
import wave
from array import array
from collections import deque
import base64
import numpy as np
import webrtcvad
import json
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from picamera2 import Picamera2
from piper import PiperVoice


# =========================================================
# BLOOPY BRAIN v1.2 - APP BRIDGE
#
# Adds to v0.4:
#   - "Hey Bloopy" wake detection with whisper-command
#   - microphone handoff after wake
#   - free-form sentence recording with PipeWire pw-record
#   - free-form transcription with whisper-cli
#   - local command routing:
#       hello
#       look at me
#       go to sleep
#   - all other speech becomes CONVERSATION input
#   - Claude AI response layer
#   - current camera frame + sensor context sent with conversation
#   - spoken AI replies through MAX98357A I2S amplifier
#   - wake listener held while Bloopy is speaking
#   - adaptive end-of-speech detection (no fixed 6-second wait)
#   - follow-up conversation window without repeating wake word
#   - persistent Piper model for faster speech startup
#   - listening + processing earcons
#   - camera image only when the question is visual
#   - WebRTC speech detection for faster end-of-speech
#   - persistent I2S audio stream to suppress start/stop pops
#   - direct Piper audio streaming (no WAV->ffmpeg->aplay chain)
#   - timing diagnostics for Whisper / Claude / Piper
#   - loopback-only HTTP bridge for the Bloopy touchscreen app
#   - live sensor/status API + approved low-risk app controls
#
# Preserved systems:
#   - ESP32 telemetry
#   - OLED eye commands
#   - camera
#   - face/person tracking
#   - left/center/right eye tracking
#   - short-term target memory
#   - automatic darkness behavior
#   - manual voice sleep/wake
# =========================================================

WHISPER_COMMAND = "/home/brandon/whisper.cpp/build/bin/whisper-command"
WHISPER_CLI = "/home/brandon/whisper.cpp/build/bin/whisper-cli"
WHISPER_SERVER = "/home/brandon/whisper.cpp/build/bin/whisper-server"
WHISPER_SERVER_HOST = "127.0.0.1"
WHISPER_SERVER_PORT = 8080
WHISPER_SERVER_URL = (
    f"http://{WHISPER_SERVER_HOST}:{WHISPER_SERVER_PORT}/inference"
)
WHISPER_SERVER_AUDIO_CTX = 768
WHISPER_SERVER_BEST_OF = 1
WHISPER_SERVER_PROMPT = (
    "Bloopy is a small AI robot assistant. "
    "The user is speaking to Bloopy."
)
WHISPER_MODEL = "/home/brandon/whisper.cpp/models/ggml-tiny.en.bin"
WHISPER_COMMAND_LIST = "/home/brandon/bloopy/whisper_commands.txt"
FREEFORM_WAV = "/home/brandon/bloopy/freeform_live.wav"
PW_RECORD = "pw-record"
FREEFORM_PROMPT = (
    "Bloopy is a small AI robot assistant. "
    "The user is speaking to Bloopy."
)

# =========================================================
# BLOOPY VOICE v0.8 - PIPER NEURAL TTS
#
# Uses the local Piper neural voice model:
#   en_US-lessac-medium
#
# The generated mono WAV is converted to stereo 44.1 kHz and
# reduced to 25% amplitude before MAX98357A playback.
# =========================================================

PIPER_MODEL = "/home/brandon/bloopy/en_US-lessac-medium.onnx"
TTS_CONVERTER = "ffmpeg"
TTS_PLAYER = "aplay"
TTS_ALSA_DEVICE = os.environ.get(
    "BLOOPY_AUDIO_DEVICE",
    "plughw:CARD=MAX98357A,DEV=0",
).strip()
TTS_MONO_WAV = "/home/brandon/bloopy/bloopy_tts_mono.wav"
TTS_STEREO_WAV = "/home/brandon/bloopy/bloopy_tts_stereo.wav"
TTS_VOLUME = 0.25

# Runtime speaker amplitude. The app may change this through the local bridge.
tts_volume = TTS_VOLUME

# Loopback-only bridge used by the Next.js app running on the same Pi.
# Binding to 127.0.0.1 keeps the hardware API off the LAN.
BLOOPY_BRIDGE_HOST = os.environ.get("BLOOPY_BRIDGE_HOST", "127.0.0.1").strip()
BLOOPY_BRIDGE_PORT = int(os.environ.get("BLOOPY_BRIDGE_PORT", "8765"))

AUDIO_OUT_RATE = 44100
AUDIO_OUT_CHANNELS = 2
AUDIO_OUT_SAMPLE_WIDTH = 2
AUDIO_OUT_CHUNK_MS = 20
AUDIO_OUT_CHUNK_BYTES = int(
    AUDIO_OUT_RATE
    * AUDIO_OUT_CHANNELS
    * AUDIO_OUT_SAMPLE_WIDTH
    * AUDIO_OUT_CHUNK_MS
    / 1000
)

EARCON_LISTEN_WAV = "/home/brandon/bloopy/earcon_listen.wav"
EARCON_THINK_WAV = "/home/brandon/bloopy/earcon_think.wav"
EARCON_AMPLITUDE = 0.03

# =========================================================
# BLOOPY AI v0.6
#
# Keep API secrets OUT of this source file.
# Before starting Bloopy, set:
#   export ANTHROPIC_API_KEY="your-key"
#
# Optional model override:
#   export BLOOPY_AI_MODEL="claude-haiku-5-5"
# =========================================================

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
ANTHROPIC_MODEL = os.environ.get(
    "BLOOPY_AI_MODEL",
    "claude-haiku-5-5",
).strip()

AI_TIMEOUT_SECONDS = 35
AI_MAX_TOKENS = 90
AI_JPEG_QUALITY = 72

BLOOPY_SYSTEM_PROMPT = """
You are Bloopy, a small loyal AI companion robot.

You are running inside a physical robot. The user is speaking directly to you.
The current camera image, when attached, is what your camera sees right now.
The sensor context is current robot telemetry.

Rules:
- Answer as Bloopy in first person.
- Sound warm, calm, loyal, curious, and a little playful.
- Sound natural and conversational.
- Be concise: default to one short sentence; use two only when needed.
- For visual questions, ground your answer in the attached current camera image.
- Use sensor data only when it genuinely helps answer what the user said.
- Do not mention darkness, distance, sound level, or other telemetry just because
  it is available.
- Do not invent objects, people, measurements, or events that are not supported.
- If the image or telemetry is insufficient, say what you can determine.
- Do not end every reply with a question, suggestion, or "Would you like me to..."
  offer. Ask a question only when it is genuinely useful to the conversation.
- The local FACE/PERSON detector is only a coarse detector; do not treat it as
  a complete description of the scene.
""".strip()

SERIAL_PORT = (
    "/dev/serial/by-id/"
    "usb-Silicon_Labs_CP2104_USB_to_UART_Bridge_Controller_02707313-if00-port0"
)
BAUD = 115200

FRAME_WIDTH = 320
FRAME_HEIGHT = 240
PERSON_SCAN_EVERY = 4
CONFIRM_FRAMES = 2
TARGET_LOST_TIMEOUT = 3.0
MEMORY_WINDOW = 5.0

GREETING_TIME = 1.5
HELLO_HAPPY_TIME = 2.0
LOOK_FOR_ME_TIME = 8.0
COMMAND_KEEPALIVE = 5.0
DARK_THRESHOLD = 20.0

WHISPER_THREADS = 4
WHISPER_AUDIO_CONTEXT = 128
MIN_WAKE_CONFIDENCE = 0.80
SPEECH_DEBOUNCE_SECONDS = 1.2

# Natural speech capture with WebRTC VAD.
# 30 ms frames are classified as speech/non-speech. Bloopy begins processing
# after about 0.36 s of detected silence instead of using an RMS threshold.
AUDIO_RATE = 16000
AUDIO_CHANNELS = 1
AUDIO_SAMPLE_WIDTH = 2
VAD_FRAME_MS = 30
VAD_FRAME_BYTES = int(
    AUDIO_RATE * AUDIO_CHANNELS * AUDIO_SAMPLE_WIDTH * VAD_FRAME_MS / 1000
)
VAD_MODE = 3
VAD_START_WINDOW_FRAMES = 10
VAD_START_REQUIRED_VOICED = 6
VAD_END_SILENCE_FRAMES = 15
VAD_END_SILENCE_SECONDS = VAD_END_SILENCE_FRAMES * VAD_FRAME_MS / 1000
VAD_PRE_ROLL_FRAMES = 10
MAX_UTTERANCE_SECONDS = 8.0
INITIAL_WAIT_FOR_SPEECH_SECONDS = 5.0
FOLLOWUP_WAIT_FOR_SPEECH_SECONDS = 4.0
EARCON_SETTLE_SECONDS = 0.05
VAD_ARMING_GRACE_SECONDS = 0.55

# After Bloopy answers, this allows a natural reply such as "yes", "why?",
# or "tell me more" without saying "Hey Bloopy" again.
FOLLOWUP_ENABLED = True

WAKE_PHRASES = {
    "hey bloopy",
    "hey blue p",
    "hey blue pea",
    "hey bluepy",
}

TRACK_COMMANDS = {
    "LEFT": "EYES:LEFT",
    "CENTER": "EYES:CENTER",
    "RIGHT": "EYES:RIGHT",
}

sensors = {
    "lux": None,
    "distance_mm": None,
    "tilt_deg": None,
    "motion": None,
    "sound": None,
    "esp_state": None,
}

vision = {
    "visible": False,
    "target_type": None,
    "zone": None,
    "last_seen": 0.0,
}

memory = {
    "target_present": False,
    "last_target_type": None,
    "last_zone": None,
    "lost_at": None,
    "appearances": 0,
    "wake_count": 0,
    "last_wake_time": None,
    "command_count": 0,
    "last_command": None,
    "conversation_count": 0,
    "last_conversation": None,
    "ai_response_count": 0,
    "last_ai_response": None,
    "tts_count": 0,
    "last_spoken": None,
}

brain_state = "STARTING"
speech_mode = "STARTING"
manual_sleep = False
look_for_me = False
look_for_me_until = 0.0
greeting_until = 0.0
hello_until = 0.0

speech_events = queue.Queue()
speech_stop_event = threading.Event()

# When set, the speech-manager must not restart whisper-command.
# This prevents Bloopy's own speaker from waking/listening to itself.
speech_hold_event = threading.Event()

# Set after a successful spoken AI reply. The speech thread will listen once
# for a follow-up before returning to wake-word mode.
followup_event = threading.Event()

# A small text-only history makes short replies such as "yes" or "why?"
# understandable without repeatedly sending old camera images.
conversation_history = []
MAX_CONVERSATION_MESSAGES = 6

whisper_process = None
whisper_server_process = None
whisper_server_owned = False
last_detected_phrase = None
last_detected_time = 0.0

brain_started_at = time.monotonic()
last_telemetry_at = None
bridge_action_queue = queue.Queue()
bridge_server = None
bridge_thread = None

print("Connecting Bloopy Brain to ESP32...")
esp = serial.Serial(SERIAL_PORT, BAUD, timeout=0.01)
print("Waiting for ESP32...")
time.sleep(7)
esp.reset_input_buffer()

current_command = None
last_command_time = 0.0


def send_command(command, force=False):
    global current_command, last_command_time

    now = time.monotonic()
    keepalive_due = now - last_command_time >= COMMAND_KEEPALIVE

    if not force and command == current_command and not keepalive_due:
        return

    esp.write((command + "\n").encode())
    esp.flush()

    current_command = command
    last_command_time = now
    print(f"BRAIN -> ESP32: {command}")


def parse_telemetry(line):
    global last_telemetry_at

    if not line.startswith("Lux:"):
        return

    try:
        fields = {}
        for part in line.split("|"):
            if ":" not in part:
                continue
            key, value = part.split(":", 1)
            fields[key.strip()] = value.strip()

        sensors["lux"] = float(fields["Lux"])

        distance = fields["Distance"].replace("mm", "").strip()
        sensors["distance_mm"] = None if distance == "OUT" else int(distance)

        sensors["tilt_deg"] = float(
            fields["Tilt"].replace("deg", "").strip()
        )
        sensors["motion"] = float(fields["Motion"])
        sensors["sound"] = int(fields["Sound"])
        sensors["esp_state"] = fields["STATE"]
        last_telemetry_at = time.monotonic()
    except (KeyError, ValueError):
        pass


def read_serial():
    while esp.in_waiting:
        line = esp.readline().decode("utf-8", errors="replace").strip()

        if not line:
            continue

        if line.startswith("ACK:"):
            print(f"ESP32 -> BRAIN: {line}")
            continue

        parse_telemetry(line)


def normalize_phrase(text):
    text = re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", text)
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s']", " ", text)
    return " ".join(text.split())


WHISPER_DETECTION_PATTERN = re.compile(
    r"detected command:\s*(.*?)\s*\|\s*p\s*=\s*([0-9.]+)"
)


def parse_whisper_detection(line):
    match = WHISPER_DETECTION_PATTERN.search(line)
    if match is None:
        return None

    return normalize_phrase(match.group(1)), float(match.group(2))


def terminate_process(process):
    """
    Stop whisper-command and every process/thread helper in its process group.

    The normal Popen.terminate() path was enough to close the parent process,
    but on the Pi the ALSA capture device could remain owned briefly, causing:
        arecord: audio open error: Device or resource busy
    """
    if process is None:
        return

    try:
        pgid = os.getpgid(process.pid)
    except Exception:
        pgid = None

    try:
        if pgid is not None:
            os.killpg(pgid, signal.SIGINT)
        else:
            process.terminate()

        process.wait(timeout=3.0)
        return
    except Exception:
        pass

    try:
        if pgid is not None:
            os.killpg(pgid, signal.SIGKILL)
        else:
            process.kill()

        process.wait(timeout=1.5)
    except Exception:
        pass




def _whisper_server_port_open():
    try:
        with socket.create_connection(
            (WHISPER_SERVER_HOST, WHISPER_SERVER_PORT),
            timeout=0.35,
        ):
            return True
    except OSError:
        return False


def start_whisper_server():
    """
    Start whisper-server once and keep tiny.en loaded in RAM.

    If a server is already listening on the configured port, Bloopy reuses it
    instead of launching another copy.
    """
    global whisper_server_process
    global whisper_server_owned

    if _whisper_server_port_open():
        whisper_server_process = None
        whisper_server_owned = False
        print(
            f"Whisper server: REUSING existing "
            f"{WHISPER_SERVER_HOST}:{WHISPER_SERVER_PORT}"
        )
        return

    command = [
        WHISPER_SERVER,
        "-m", WHISPER_MODEL,
        "-t", str(WHISPER_THREADS),
        "--host", WHISPER_SERVER_HOST,
        "--port", str(WHISPER_SERVER_PORT),
    ]

    print("Starting persistent Whisper server...")

    whisper_server_process = subprocess.Popen(
        command,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    whisper_server_owned = True

    deadline = time.monotonic() + 20.0

    while time.monotonic() < deadline:
        if whisper_server_process.poll() is not None:
            raise RuntimeError(
                "whisper-server exited before becoming ready."
            )

        if _whisper_server_port_open():
            print("Persistent Whisper server: READY")
            return

        time.sleep(0.15)

    terminate_process(whisper_server_process)
    whisper_server_process = None
    whisper_server_owned = False
    raise RuntimeError("Timed out waiting for whisper-server to start.")


def stop_whisper_server():
    global whisper_server_process

    if whisper_server_owned and whisper_server_process is not None:
        terminate_process(whisper_server_process)
        whisper_server_process = None


def _multipart_form(fields, file_field, file_path):
    boundary = "----BloopyWhisperBoundary7MA4YWxkTrZu0gW"
    body = bytearray()

    def add_line(value=b""):
        if isinstance(value, str):
            value = value.encode("utf-8")
        body.extend(value)
        body.extend(b"\r\n")

    for name, value in fields.items():
        add_line(f"--{boundary}")
        add_line(
            f'Content-Disposition: form-data; name="{name}"'
        )
        add_line()
        add_line(str(value))

    file_name = os.path.basename(file_path)
    with open(file_path, "rb") as source:
        file_bytes = source.read()

    add_line(f"--{boundary}")
    add_line(
        f'Content-Disposition: form-data; name="{file_field}"; '
        f'filename="{file_name}"'
    )
    add_line("Content-Type: audio/wav")
    add_line()
    body.extend(file_bytes)
    body.extend(b"\r\n")

    add_line(f"--{boundary}--")

    return bytes(body), f"multipart/form-data; boundary={boundary}"


def start_wake_process():
    command = [
        "stdbuf", "-oL", "-eL",
        WHISPER_COMMAND,
        "-m", WHISPER_MODEL,
        "-cmd", WHISPER_COMMAND_LIST,
        "-ac", str(WHISPER_AUDIO_CONTEXT),
        "-t", str(WHISPER_THREADS),
        "-c", "0",
    ]

    return subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        start_new_session=True,
    )


def _stop_process_group(process):
    if process is None:
        return

    try:
        os.killpg(os.getpgid(process.pid), signal.SIGINT)
        process.wait(timeout=1.5)
        return
    except Exception:
        pass

    try:
        os.killpg(os.getpgid(process.pid), signal.SIGKILL)
    except Exception:
        try:
            process.kill()
        except Exception:
            pass

    try:
        process.wait(timeout=1.0)
    except Exception:
        pass


def record_freeform(wait_for_speech_seconds):
    """
    Capture 16 kHz mono PCM from PipeWire and use WebRTC VAD to decide
    when speech starts and ends.

    This is intentionally more speech-aware than the old RMS threshold, so
    room noise is less likely to keep Bloopy waiting after the user stops.
    """
    try:
        if os.path.exists(FREEFORM_WAV):
            os.remove(FREEFORM_WAV)
    except Exception:
        pass

    command = [
        PW_RECORD,
        "--raw",
        "--rate", str(AUDIO_RATE),
        "--channels", str(AUDIO_CHANNELS),
        "--format", "s16",
        "-",
    ]

    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        start_new_session=True,
    )

    if process.stdout is None:
        _stop_process_group(process)
        raise RuntimeError("pw-record did not provide an audio stream.")

    vad = webrtcvad.Vad(VAD_MODE)

    start_time = time.monotonic()
    speech_started = False
    speech_started_at = None
    silence_run = 0

    pre_roll = deque(maxlen=VAD_PRE_ROLL_FRAMES)
    start_window = deque(maxlen=VAD_START_WINDOW_FRAMES)
    frames = []

    try:
        while not speech_stop_event.is_set():
            now = time.monotonic()

            if not speech_started:
                if now - start_time >= wait_for_speech_seconds:
                    break
            else:
                if now - speech_started_at >= MAX_UTTERANCE_SECONDS:
                    print("Maximum utterance length reached.")
                    break

            chunk = process.stdout.read(VAD_FRAME_BYTES)

            if not chunk:
                if process.poll() is not None:
                    break
                continue

            if len(chunk) < VAD_FRAME_BYTES:
                continue

            try:
                voiced = vad.is_speech(chunk, AUDIO_RATE)
            except Exception:
                voiced = False

            if not speech_started:
                pre_roll.append(chunk)

                # Give the user a brief moment after the listening cue before
                # Bloopy is allowed to declare "speech started". We still keep
                # these frames in pre-roll, so starting immediately is not lost.
                if now - start_time < VAD_ARMING_GRACE_SECONDS:
                    start_window.clear()
                    continue

                start_window.append(1 if voiced else 0)

                if (
                    len(start_window) == VAD_START_WINDOW_FRAMES
                    and sum(start_window) >= VAD_START_REQUIRED_VOICED
                ):
                    speech_started = True
                    speech_started_at = now
                    frames.extend(pre_roll)
                    pre_roll.clear()
                    silence_run = 0
                    print("Speech detected.")

            else:
                frames.append(chunk)

                if voiced:
                    silence_run = 0
                else:
                    silence_run += 1

                if (
                    silence_run >= VAD_END_SILENCE_FRAMES
                    and now - speech_started_at >= 0.35
                ):
                    print(
                        "End of speech detected "
                        f"({VAD_END_SILENCE_SECONDS:.2f}s silence)."
                    )
                    break

    finally:
        _stop_process_group(process)

    if not speech_started or not frames:
        return False

    with wave.open(FREEFORM_WAV, "wb") as wav_file:
        wav_file.setnchannels(AUDIO_CHANNELS)
        wav_file.setsampwidth(AUDIO_SAMPLE_WIDTH)
        wav_file.setframerate(AUDIO_RATE)
        wav_file.writeframes(b"".join(frames))

    return os.path.getsize(FREEFORM_WAV) > 44


def transcribe_freeform():
    """
    Send the recorded WAV to the already-running local whisper-server.

    Optimized request values are based on Bloopy's measured Raspberry Pi test:
    best_of=1 + audio_ctx=768 cut the same recording from ~4.55s to ~2.47s.
    """
    transcribe_started = time.monotonic()

    if not os.path.exists(FREEFORM_WAV):
        raise RuntimeError(
            f"Free-form WAV is missing: {FREEFORM_WAV}"
        )

    if not _whisper_server_port_open():
        raise RuntimeError(
            "Persistent whisper-server is not reachable."
        )

    fields = {
        "language": "en",
        "no_timestamps": "true",
        "response_format": "json",
        "best_of": str(WHISPER_SERVER_BEST_OF),
        "audio_ctx": str(WHISPER_SERVER_AUDIO_CTX),
        "temperature": "0",
        "temperature_inc": "0",
        "prompt": WHISPER_SERVER_PROMPT,
    }

    body, content_type = _multipart_form(
        fields,
        "file",
        FREEFORM_WAV,
    )

    request = urllib.request.Request(
        WHISPER_SERVER_URL,
        data=body,
        method="POST",
        headers={
            "Content-Type": content_type,
            "Content-Length": str(len(body)),
        },
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=20,
        ) as response:
            raw = response.read().decode(
                "utf-8",
                errors="replace",
            )
    except urllib.error.HTTPError as error:
        details = error.read().decode(
            "utf-8",
            errors="replace",
        )
        raise RuntimeError(
            f"Whisper server HTTP {error.code}: {details[:500]}"
        ) from error
    except urllib.error.URLError as error:
        raise RuntimeError(
            f"Could not reach whisper-server: {error.reason}"
        ) from error

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as error:
        raise RuntimeError(
            f"Whisper server returned invalid JSON: {raw[:500]}"
        ) from error

    transcript = normalize_phrase(
        data.get("text", "")
    )

    print(
        f"TIMING Whisper server: "
        f"{time.monotonic() - transcribe_started:.2f}s"
    )

    return transcript


audio_output_queue = queue.Queue()
audio_output_stop_event = threading.Event()
audio_output_process = None
audio_output_thread = None
earcon_pcm = {}


def _pcm_to_output_format(
    pcm_bytes,
    sample_rate,
    sample_channels=1,
    volume=1.0,
):
    """
    Convert signed 16-bit PCM to Bloopy's permanent 44.1-kHz stereo stream.
    A lightweight linear resampler is enough for speech/earcons and removes
    the old ffmpeg subprocess from every spoken response.
    """
    samples = np.frombuffer(pcm_bytes, dtype="<i2").astype(np.float32)

    if sample_channels > 1:
        usable = (len(samples) // sample_channels) * sample_channels
        samples = samples[:usable].reshape(-1, sample_channels).mean(axis=1)

    if sample_rate != AUDIO_OUT_RATE and len(samples) > 1:
        new_length = max(
            1,
            int(round(len(samples) * AUDIO_OUT_RATE / sample_rate)),
        )

        old_positions = np.arange(len(samples), dtype=np.float32)
        new_positions = np.linspace(
            0,
            len(samples) - 1,
            new_length,
            dtype=np.float32,
        )
        samples = np.interp(new_positions, old_positions, samples)

    samples *= float(volume)
    samples = np.clip(samples, -32768, 32767).astype("<i2")

    stereo = np.repeat(samples[:, None], 2, axis=1)
    return stereo.reshape(-1).tobytes()


def _audio_output_worker():
    global audio_output_process

    command = [
        TTS_PLAYER,
        "-q",
        "-D", TTS_ALSA_DEVICE,
        "-t", "raw",
        "-f", "S16_LE",
        "-r", str(AUDIO_OUT_RATE),
        "-c", str(AUDIO_OUT_CHANNELS),
        "--buffer-time=60000",
        "--period-time=20000",
        "-",
    ]

    audio_output_process = subprocess.Popen(
        command,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        start_new_session=True,
    )

    if audio_output_process.stdin is None:
        raise RuntimeError("Could not open persistent MAX98357A audio stream.")

    silence = bytes(AUDIO_OUT_CHUNK_BYTES)

    try:
        while not audio_output_stop_event.is_set():
            try:
                pcm_bytes, done_event = audio_output_queue.get_nowait()
            except queue.Empty:
                pcm_bytes = silence
                done_event = None

            offset = 0

            while offset < len(pcm_bytes):
                piece = pcm_bytes[
                    offset : offset + AUDIO_OUT_CHUNK_BYTES
                ]

                if len(piece) < AUDIO_OUT_CHUNK_BYTES:
                    piece += bytes(AUDIO_OUT_CHUNK_BYTES - len(piece))

                audio_output_process.stdin.write(piece)
                audio_output_process.stdin.flush()
                offset += AUDIO_OUT_CHUNK_BYTES

            if done_event is not None:
                done_event.set()

    except BrokenPipeError:
        pass

    finally:
        try:
            audio_output_process.stdin.close()
        except Exception:
            pass

        _stop_process_group(audio_output_process)
        audio_output_process = None


def start_audio_output():
    global audio_output_thread

    audio_output_thread = threading.Thread(
        target=_audio_output_worker,
        daemon=True,
    )
    audio_output_thread.start()

    # Give ALSA time to start clocks before any earcon or speech.
    time.sleep(0.25)


def stop_audio_output():
    audio_output_stop_event.set()

    if audio_output_thread is not None:
        try:
            audio_output_thread.join(timeout=2.0)
        except Exception:
            pass

    _stop_process_group(audio_output_process)


def queue_audio(pcm_bytes, wait=False):
    if not pcm_bytes:
        return None

    done_event = threading.Event()
    audio_output_queue.put((pcm_bytes, done_event))

    if wait:
        done_event.wait(timeout=30.0)

    return done_event


def _make_earcon_pcm(notes):
    sample_rate = AUDIO_OUT_RATE
    samples = []
    peak = 32767 * EARCON_AMPLITUDE

    for frequency, duration_s in notes:
        frame_count = max(1, int(sample_rate * duration_s))
        i = np.arange(frame_count, dtype=np.float32)

        wave_data = np.sin(
            2.0 * np.pi * frequency * i / sample_rate
        )

        fade_frames = max(1, int(sample_rate * 0.012))
        envelope = np.ones(frame_count, dtype=np.float32)

        fade_len = min(fade_frames, frame_count // 2)

        if fade_len > 0:
            fade = np.linspace(0.0, 1.0, fade_len, dtype=np.float32)
            envelope[:fade_len] *= fade
            envelope[-fade_len:] *= fade[::-1]

        mono = wave_data * envelope * peak
        mono = np.clip(mono, -32768, 32767).astype("<i2")
        stereo = np.repeat(mono[:, None], 2, axis=1).reshape(-1)
        samples.append(stereo)

        gap_frames = int(sample_rate * 0.020)
        samples.append(np.zeros(gap_frames * 2, dtype="<i2"))

    if not samples:
        return b""

    return np.concatenate(samples).astype("<i2").tobytes()


def ensure_earcons():
    earcon_pcm["listen"] = _make_earcon_pcm(
        [
            (660.0, 0.050),
            (880.0, 0.060),
        ]
    )

    earcon_pcm["think"] = _make_earcon_pcm(
        [
            (520.0, 0.045),
            (650.0, 0.045),
        ]
    )


def play_earcon(name, wait=True):
    pcm_bytes = earcon_pcm.get(name, b"")

    if pcm_bytes:
        queue_audio(pcm_bytes, wait=wait)


def speak_bloopy(text):
    """
    Stream Piper's generated PCM directly into one persistent MAX98357A stream.
    This avoids opening/closing ALSA for every response and avoids the old
    Piper -> WAV -> ffmpeg -> aplay startup chain.
    """
    spoken = " ".join(str(text).split()).strip()
    if not spoken:
        return

    print(f'TTS -> "{spoken}"')

    synth_started = time.monotonic()
    first_audio_at = None
    last_event = None

    for chunk in piper_voice.synthesize(spoken):
        if first_audio_at is None:
            first_audio_at = time.monotonic()

        pcm_out = _pcm_to_output_format(
            chunk.audio_int16_bytes,
            chunk.sample_rate,
            chunk.sample_channels,
            tts_volume,
        )

        last_event = queue_audio(pcm_out, wait=False)

    if last_event is not None:
        last_event.wait(timeout=30.0)

    elapsed = time.monotonic() - synth_started

    if first_audio_at is not None:
        print(
            "TIMING Piper first audio: "
            f"{first_audio_at - synth_started:.2f}s"
        )

    print(f"TIMING Piper total/playback: {elapsed:.2f}s")

    memory["tts_count"] += 1
    memory["last_spoken"] = spoken


def format_sensor_context():
    """
    Build compact grounded context for the AI.
    """
    return (
        "CURRENT BLOOPY STATE\n"
        f"- light_lux: {sensors['lux']}\n"
        f"- distance_mm: {sensors['distance_mm']}\n"
        f"- tilt_deg: {sensors['tilt_deg']}\n"
        f"- motion: {sensors['motion']}\n"
        f"- sound: {sensors['sound']}\n"
        f"- esp_state: {sensors['esp_state']}\n"
        f"- local_vision_visible: {vision['visible']}\n"
        f"- local_vision_target: {vision['target_type']}\n"
        f"- local_vision_zone: {vision['zone']}\n"
        f"- short_term_target_present: {memory['target_present']}\n"
        f"- last_target_type: {memory['last_target_type']}\n"
        f"- last_target_zone: {memory['last_zone']}\n"
        f"- manual_sleep: {manual_sleep}\n"
    )


def needs_camera_image(user_text):
    phrase = normalize_phrase(user_text)

    visual_phrases = (
        "what can you see",
        "what do you see",
        "can you see",
        "look at",
        "look around",
        "in front of you",
        "in front of me",
        "camera",
        "what am i wearing",
        "what color",
        "read this",
        "read that",
        "what is this",
        "what is that",
        "who is there",
        "where am i",
    )

    return any(item in phrase for item in visual_phrases)


def capture_ai_camera_image():
    """
    Capture a fresh camera frame and return it as base64 JPEG.
    """
    frame = camera.capture_array()

    # Picamera2 is configured RGB888. OpenCV JPEG encoding expects BGR.
    bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

    ok, encoded = cv2.imencode(
        ".jpg",
        bgr,
        [int(cv2.IMWRITE_JPEG_QUALITY), AI_JPEG_QUALITY],
    )

    if not ok:
        raise RuntimeError("Could not encode camera frame for AI.")

    return base64.b64encode(encoded.tobytes()).decode("ascii")


def extract_ai_text(response_data):
    """
    Extract text blocks robustly. Newer Claude models may return other
    content block types before/alongside text.
    """
    pieces = []

    for block in response_data.get("content", []):
        if block.get("type") == "text":
            value = block.get("text", "").strip()
            if value:
                pieces.append(value)

    return " ".join(pieces).strip()


def ask_bloopy_ai(user_text):
    """
    Send the user's sentence plus current telemetry to Claude.

    A fresh camera image is attached only when the user's sentence is visual.
    Short text-only conversation history is kept so follow-up replies make sense.
    """
    if not ANTHROPIC_API_KEY:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. "
            "Export it in the Pi terminal before starting brain_v111.py."
        )

    context = format_sensor_context()
    content = []

    if needs_camera_image(user_text):
        try:
            image_b64 = capture_ai_camera_image()
            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": image_b64,
                    },
                }
            )
            context += "- fresh_camera_image_attached: true\n"
        except Exception as error:
            context += f"- camera_capture_error: {error}\n"
    else:
        context += "- fresh_camera_image_attached: false\n"

    content.append(
        {
            "type": "text",
            "text": (
                f"{context}\n"
                f"USER SAID:\n{user_text}\n\n"
                "Respond directly to the user as Bloopy."
            ),
        }
    )

    messages = list(conversation_history[-MAX_CONVERSATION_MESSAGES:])
    messages.append(
        {
            "role": "user",
            "content": content,
        }
    )

    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": AI_MAX_TOKENS,
        "thinking": {"type": "disabled"},
        "system": BLOOPY_SYSTEM_PROMPT,
        "messages": messages,
    }

    body = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        ANTHROPIC_API_URL,
        data=body,
        method="POST",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )

    ai_started = time.monotonic()

    try:
        with urllib.request.urlopen(
            request,
            timeout=AI_TIMEOUT_SECONDS,
        ) as response:
            response_data = json.loads(
                response.read().decode("utf-8")
            )

    except urllib.error.HTTPError as error:
        try:
            details = error.read().decode("utf-8", errors="replace")
        except Exception:
            details = ""

        raise RuntimeError(
            f"Claude API HTTP {error.code}: "
            f"{details[:500] or error.reason}"
        ) from error

    except urllib.error.URLError as error:
        raise RuntimeError(
            f"Could not reach Claude API: {error.reason}"
        ) from error

    answer = extract_ai_text(response_data)

    print(
        f"TIMING Claude API: {time.monotonic() - ai_started:.2f}s"
    )

    if not answer:
        stop_reason = response_data.get("stop_reason")
        raise RuntimeError(
            "Claude returned no text response"
            + (f" (stop_reason={stop_reason})" if stop_reason else "")
            + "."
        )

    conversation_history.append(
        {
            "role": "user",
            "content": user_text,
        }
    )
    conversation_history.append(
        {
            "role": "assistant",
            "content": answer,
        }
    )

    if len(conversation_history) > MAX_CONVERSATION_MESSAGES:
        del conversation_history[
            :len(conversation_history) - MAX_CONVERSATION_MESSAGES
        ]

    return answer


def capture_and_transcribe(followup=False):
    mode = "followup" if followup else "initial"
    wait_seconds = (
        FOLLOWUP_WAIT_FOR_SPEECH_SECONDS
        if followup
        else INITIAL_WAIT_FOR_SPEECH_SECONDS
    )

    speech_events.put(("RECORDING", mode, 0.0))
    play_earcon("listen", wait=True)
    time.sleep(EARCON_SETTLE_SECONDS)

    captured = record_freeform(wait_seconds)

    if not captured:
        if followup:
            speech_events.put(("FOLLOWUP_TIMEOUT", "", 0.0))
        else:
            speech_events.put(("NO_SPEECH", "", 0.0))
        return

    # Immediate feedback at the moment the user stops talking.
    play_earcon("think", wait=False)
    speech_events.put(("TRANSCRIBING", mode, 0.0))

    transcript = transcribe_freeform()

    # A few common silence hallucinations are not real conversation turns.
    if transcript in {
        "blank audio",
        "silence",
        "no audio",
    }:
        transcript = ""

    if transcript:
        # Block wake-word restart while the main brain is thinking/speaking.
        speech_hold_event.set()
        speech_events.put(("FREEFORM", transcript, 1.0))
    else:
        if followup:
            speech_events.put(("FOLLOWUP_TIMEOUT", "", 0.0))
        else:
            speech_events.put(("NO_SPEECH", "", 0.0))


def speech_manager():
    global whisper_process
    global last_detected_phrase
    global last_detected_time

    print("Speech manager ONLINE")

    while not speech_stop_event.is_set():
        try:
            # The AI/TTS path owns the conversation while this event is set.
            while (
                speech_hold_event.is_set()
                and not speech_stop_event.is_set()
            ):
                time.sleep(0.03)

            if speech_stop_event.is_set():
                break

            # Natural follow-up: after Bloopy speaks, listen once without
            # requiring another "Hey Bloopy".
            if FOLLOWUP_ENABLED and followup_event.is_set():
                followup_event.clear()
                print("Follow-up window OPEN")
                capture_and_transcribe(followup=True)
                continue

            print("Wake listener starting...")
            whisper_process = start_wake_process()
            wake_detected = False

            while not speech_stop_event.is_set():
                if whisper_process.poll() is not None:
                    print("Wake listener stopped unexpectedly.")
                    break

                ready, _, _ = select.select(
                    [whisper_process.stdout],
                    [],
                    [],
                    0.25,
                )

                if not ready:
                    continue

                line = whisper_process.stdout.readline()
                if not line:
                    continue

                result = parse_whisper_detection(line.strip())
                if result is None:
                    continue

                phrase, confidence = result
                now = time.monotonic()

                if confidence < MIN_WAKE_CONFIDENCE:
                    continue

                if (
                    phrase == last_detected_phrase
                    and now - last_detected_time < SPEECH_DEBOUNCE_SECONDS
                ):
                    continue

                last_detected_phrase = phrase
                last_detected_time = now

                if phrase not in WAKE_PHRASES:
                    continue

                print(
                    f'WHISPER WAKE -> "{phrase}" '
                    f'confidence={confidence:.3f}'
                )

                speech_events.put(("WAKE", phrase, confidence))
                wake_detected = True
                break

            terminate_process(whisper_process)
            whisper_process = None

            if speech_stop_event.is_set():
                break

            if not wake_detected:
                time.sleep(0.25)
                continue

            print("Wake listener stopped.")
            capture_and_transcribe(followup=False)

        except Exception as error:
            speech_events.put(("ERROR", str(error), 0.0))
            terminate_process(whisper_process)
            whisper_process = None
            time.sleep(0.5)

    terminate_process(whisper_process)
    whisper_process = None



def _module_status(state, detail):
    return {"state": state, "detail": detail}


def build_bridge_status():
    now = time.monotonic()
    telemetry_age = None
    if last_telemetry_at is not None:
        telemetry_age = max(0.0, now - last_telemetry_at)

    esp_online = telemetry_age is not None and telemetry_age < 3.5

    mic_detail = "Wake listener ready"
    mic_state = "ready"
    if manual_sleep:
        mic_detail = 'Wake phrase still available while Bloopy rests'
        mic_state = "sleeping"
    elif speech_mode in {"LISTENING", "TRANSCRIBING", "AI", "SPEAKING"}:
        mic_detail = f"Current speech mode: {speech_mode.lower()}"
        mic_state = "busy"

    return {
        "ok": True,
        "schemaVersion": 1,
        "timestamp": time.time(),
        "robot": {
            "name": "Bloopy",
            "version": "1.2",
            "uptimeSeconds": round(max(0.0, now - brain_started_at), 1),
            "brainState": brain_state,
            "speechMode": speech_mode,
            "manualSleep": bool(manual_sleep),
            "lookForMe": bool(look_for_me),
        },
        "sensors": {
            "lux": sensors["lux"],
            "distanceMm": sensors["distance_mm"],
            "tiltDeg": sensors["tilt_deg"],
            "motion": sensors["motion"],
            "sound": sensors["sound"],
            "espState": sensors["esp_state"],
            "telemetryAgeSeconds": None if telemetry_age is None else round(telemetry_age, 2),
        },
        "vision": {
            "visible": bool(vision["visible"]),
            "targetType": vision["target_type"],
            "zone": vision["zone"],
            "rememberingTarget": bool(memory["target_present"]),
        },
        "audio": {
            "volume": round(float(tts_volume), 3),
            "volumePercent": int(round(float(tts_volume) * 100)),
        },
        "conversation": {
            "wakeCount": memory["wake_count"],
            "conversationCount": memory["conversation_count"],
            "lastHeard": memory["last_conversation"],
            "lastResponse": memory["last_ai_response"],
            "lastSpoken": memory["last_spoken"],
        },
        "modules": {
            "brain": _module_status("ready", "Raspberry Pi brain is running"),
            "esp32": _module_status(
                "ready" if esp_online else "offline",
                "Live ESP32 telemetry" if esp_online else "Waiting for ESP32 telemetry",
            ),
            "camera": _module_status("ready", "Pi camera + local face/person detection"),
            "microphone": _module_status(mic_state, mic_detail),
            "speaker": _module_status("ready", "MAX98357A I2S speaker output"),
            "ai": _module_status(
                "ready" if bool(ANTHROPIC_API_KEY) else "offline",
                f"Claude model: {ANTHROPIC_MODEL}" if ANTHROPIC_API_KEY else "Anthropic key is not configured",
            ),
            "fan": _module_status("always-on", "Direct Pi power · on whenever the Pi is powered"),
            "movement": _module_status("not-installed", "No drive motors are installed in Bloopy v0"),
            "battery": _module_status("not-monitored", "No battery telemetry is connected yet"),
        },
        "capabilities": {
            "sleep": True,
            "wake": True,
            "lookAtMe": True,
            "setVolume": True,
            "movement": False,
            "fanControl": False,
            "batteryTelemetry": False,
        },
    }


def _apply_bridge_action(action, params, now):
    global manual_sleep
    global look_for_me
    global look_for_me_until
    global brain_state
    global speech_mode
    global tts_volume

    if action == "sleep":
        manual_sleep = True
        look_for_me = False
        brain_state = "SLEEPING"
        speech_mode = "WAKE"
        send_command("EYES:SLEEP", force=True)
        return "Bloopy is resting. The wake phrase still works."

    if action == "wake":
        manual_sleep = False
        look_for_me = False
        resume_behavior()
        return "Bloopy is awake."

    if action == "look_at_me":
        manual_sleep = False
        speech_mode = "WAKE"
        look_for_me = True
        look_for_me_until = now + LOOK_FOR_ME_TIME

        if vision["visible"] and vision["zone"] in TRACK_COMMANDS:
            brain_state = "TRACKING"
            send_command(TRACK_COMMANDS[vision["zone"]], force=True)
            look_for_me = False
            return "Bloopy already sees a nearby person and is tracking them."

        brain_state = "LOOKING_FOR_PERSON"
        send_command("EYES:CURIOUS", force=True)
        return "Bloopy is looking for you."

    if action == "set_volume":
        raw = params.get("volume")
        try:
            value = float(raw)
        except (TypeError, ValueError):
            raise ValueError("volume must be a number")

        if value < 0.0 or value > 0.35:
            raise ValueError("volume must be between 0 and 0.35")

        tts_volume = value
        return f"Bloopy speaker volume is now {round(value * 100)}%."

    raise ValueError("unsupported action")


def process_bridge_actions(now):
    while True:
        try:
            item = bridge_action_queue.get_nowait()
        except queue.Empty:
            return

        action = item.get("action")
        params = item.get("params") or {}
        result_queue = item.get("result_queue")

        try:
            message = _apply_bridge_action(action, params, now)
            result = {
                "ok": True,
                "action": action,
                "message": message,
                "status": build_bridge_status(),
            }
        except Exception as error:
            result = {
                "ok": False,
                "action": action,
                "message": str(error),
            }

        if result_queue is not None:
            try:
                result_queue.put_nowait(result)
            except Exception:
                pass


class BloopyBridgeHandler(BaseHTTPRequestHandler):
    server_version = "BloopyBridge/1.0"

    def log_message(self, format, *args):
        # Keep the brain console readable; status polling would otherwise spam it.
        return

    def _send_json(self, status_code, payload):
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/status":
            self._send_json(200, build_bridge_status())
            return
        self._send_json(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if self.path != "/action":
            self._send_json(404, {"ok": False, "error": "not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 8192:
                raise ValueError("invalid request body")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            action = payload.get("action")
            params = payload.get("params") or {}
            if action not in {"sleep", "wake", "look_at_me", "set_volume"}:
                raise ValueError("unsupported action")
            if not isinstance(params, dict):
                raise ValueError("params must be an object")
        except Exception as error:
            self._send_json(400, {"ok": False, "error": str(error)})
            return

        result_queue = queue.Queue(maxsize=1)
        bridge_action_queue.put({
            "action": action,
            "params": params,
            "result_queue": result_queue,
        })

        try:
            result = result_queue.get(timeout=2.5)
        except queue.Empty:
            self._send_json(504, {"ok": False, "error": "Bloopy brain action timed out"})
            return

        self._send_json(200 if result.get("ok") else 400, result)


def start_app_bridge():
    global bridge_server
    global bridge_thread

    bridge_server = ThreadingHTTPServer(
        (BLOOPY_BRIDGE_HOST, BLOOPY_BRIDGE_PORT),
        BloopyBridgeHandler,
    )
    bridge_thread = threading.Thread(
        target=bridge_server.serve_forever,
        daemon=True,
        name="bloopy-app-bridge",
    )
    bridge_thread.start()
    print(
        f"Bloopy app bridge: READY at "
        f"http://{BLOOPY_BRIDGE_HOST}:{BLOOPY_BRIDGE_PORT}"
    )


def stop_app_bridge():
    if bridge_server is not None:
        try:
            bridge_server.shutdown()
            bridge_server.server_close()
        except Exception:
            pass

    if bridge_thread is not None:
        try:
            bridge_thread.join(timeout=2.0)
        except Exception:
            pass

print("Loading Piper neural voice into memory...")
if not os.path.exists(PIPER_MODEL):
    raise RuntimeError(f"Piper voice model not found: {PIPER_MODEL}")

piper_voice = PiperVoice.load(PIPER_MODEL)
print("Piper neural voice: READY")

start_whisper_server()

ensure_earcons()

print("Starting persistent MAX98357A audio stream...")
start_audio_output()
print("Persistent speaker stream: READY")

speech_thread = threading.Thread(
    target=speech_manager,
    daemon=True,
)
speech_thread.start()

print("Starting camera...")

camera = Picamera2()
camera.configure(
    camera.create_video_configuration(
        main={
            "size": (640, 480),
            "format": "RGB888",
        }
    )
)
camera.start()
time.sleep(2)

FACE_CASCADE = (
    "/usr/share/opencv4/"
    "haarcascades/"
    "haarcascade_frontalface_default.xml"
)

face_detector = cv2.CascadeClassifier(FACE_CASCADE)
if face_detector.empty():
    raise RuntimeError("Could not load face detector.")

hog = cv2.HOGDescriptor()
hog.setSVMDetector(
    cv2.HOGDescriptor_getDefaultPeopleDetector()
)

candidate_zone = None
candidate_count = 0
confirmed_zone = None
frame_number = 0


def calculate_zone(center_x):
    left_boundary = FRAME_WIDTH * 0.38
    right_boundary = FRAME_WIDTH * 0.62

    if center_x < left_boundary:
        return "LEFT"

    if center_x > right_boundary:
        return "RIGHT"

    return "CENTER"


def resume_behavior():
    global brain_state

    if manual_sleep:
        brain_state = "SLEEPING"
        send_command("EYES:SLEEP", force=True)
        return

    if vision["visible"] and vision["zone"] in TRACK_COMMANDS:
        brain_state = "TRACKING"
        send_command(
            TRACK_COMMANDS[vision["zone"]],
            force=True,
        )
        return

    brain_state = "AUTO"
    send_command("EYES:NORMAL", force=True)


def classify_local_command(text):
    phrase = normalize_phrase(text)

    if phrase in {
        "hello",
        "hi",
        "hey",
        "hello bloopy",
        "hi bloopy",
    }:
        return "hello"

    if phrase == "look at me" or "look at me" in phrase:
        return "look at me"

    if (
        phrase == "go to sleep"
        or "go to sleep" in phrase
        or phrase == "go sleep"
    ):
        return "go to sleep"

    return None


last_status_print = 0.0


def print_state():
    print()
    print("====== BLOOPY BRAIN v1.2 ======")
    print(f"Brain state:        {brain_state}")
    print(f"Speech mode:        {speech_mode}")
    print(f"Manual sleep:       {manual_sleep}")
    print(f"Look for me:        {look_for_me}")
    print(f"Light:              {sensors['lux']} lux")
    print(f"Distance:           {sensors['distance_mm']} mm")
    print(f"Tilt:               {sensors['tilt_deg']} deg")
    print(f"Motion:             {sensors['motion']}")
    print(f"Sound:              {sensors['sound']}")
    print(f"ESP state:          {sensors['esp_state']}")
    print(f"Vision:             {vision['target_type']}")
    print(f"Direction:          {vision['zone']}")
    print(f"Remembering:        {memory['target_present']}")
    print(f"Appearances:        {memory['appearances']}")
    print(f"Wake count:         {memory['wake_count']}")
    print(f"Command count:      {memory['command_count']}")
    print(f"Last command:       {memory['last_command']}")
    print(f"Conversation count: {memory['conversation_count']}")
    print(f"Last conversation:  {memory['last_conversation']}")
    print(f"AI response count:  {memory['ai_response_count']}")
    print(f"Last AI response:   {memory['last_ai_response']}")
    print(f"TTS count:          {memory['tts_count']}")
    print(f"Last spoken:        {memory['last_spoken']}")
    print("================================")
    print()


start_app_bridge()

print()
print("================================")
print("        BLOOPY BRAIN v1.2")
print("================================")
print()
print("Camera perception: ONLINE")
print("ESP32 sensors: ONLINE")
print("Short-term memory: ONLINE")
print("Wake recognition: whisper-command")
print("Free-form recording: PipeWire pw-record")
print("Free-form transcription: persistent whisper-server")
print(
    f"Whisper server: {WHISPER_SERVER_HOST}:"
    f"{WHISPER_SERVER_PORT} | audio_ctx={WHISPER_SERVER_AUDIO_CTX} "
    f"| best_of={WHISPER_SERVER_BEST_OF}"
)
print(f"AI model: {ANTHROPIC_MODEL}")
print("TTS engine: Piper neural voice + persistent I2S stream")
print(f"Piper model: {PIPER_MODEL}")
print(f"Speaker device: {TTS_ALSA_DEVICE}")
print(f"End-of-speech target: {VAD_END_SILENCE_SECONDS:.2f}s")
print(f"Speech-start arming grace: {VAD_ARMING_GRACE_SECONDS:.2f}s")
print(
    "Conversation follow-up: "
    + ("ENABLED" if FOLLOWUP_ENABLED else "DISABLED")
)
if ANTHROPIC_API_KEY:
    print("AI layer: READY")
else:
    print("AI layer: OFFLINE - ANTHROPIC_API_KEY not set")
print()
print('Wake phrase: "Hey Bloopy"')
print()
print("Local commands:")
print('  "hello"')
print('  "look at me"')
print('  "go to sleep"')
print()
print("Everything else becomes conversation input.")
print(f"App bridge: http://{BLOOPY_BRIDGE_HOST}:{BLOOPY_BRIDGE_PORT}")
print()
print("Press Ctrl+C to stop.")
print()

brain_state = "AUTO"
speech_mode = "WAKE"

try:
    while True:
        now = time.monotonic()
        read_serial()
        process_bridge_actions(now)

        while True:
            try:
                event_type, phrase, confidence = speech_events.get_nowait()
            except queue.Empty:
                break

            if event_type == "ERROR":
                print()
                print("SPEECH ERROR:")
                print(phrase)
                print()
                speech_hold_event.clear()
                speech_mode = "WAKE"
                resume_behavior()
                continue

            if event_type == "WAKE":
                memory["wake_count"] += 1
                memory["last_wake_time"] = now

                if manual_sleep:
                    manual_sleep = False
                    print()
                    print("Bloopy woke from voice.")

                speech_mode = "PREPARING"
                brain_state = "ATTENTION"

                print()
                print("==============================")
                print("      HEY BLOOPY DETECTED!")
                print("==============================")
                print()

                send_command("EYES:ALERT", force=True)
                print("Get ready to speak...")
                continue

            if event_type == "RECORDING":
                speech_mode = "LISTENING"
                brain_state = "LISTENING"
                send_command("EYES:CURIOUS", force=True)
                print()
                if phrase == "followup":
                    print("Listening for your follow-up...")
                else:
                    print("Listening for your sentence...")
                print()
                continue

            if event_type == "TRANSCRIBING":
                speech_mode = "TRANSCRIBING"
                brain_state = "THINKING"
                print("Transcribing...")
                continue

            if event_type == "FOLLOWUP_TIMEOUT":
                print()
                print("Follow-up window closed. Waiting for wake word.")
                print()
                speech_mode = "WAKE"
                resume_behavior()
                continue

            if event_type == "NO_SPEECH":
                print()
                print("I did not catch a sentence.")
                print()
                speech_hold_event.clear()
                speech_mode = "WAKE"
                resume_behavior()
                continue

            if event_type == "FREEFORM":
                transcript = normalize_phrase(phrase)

                print()
                print("==============================")
                print(f'FREEFORM -> "{transcript}"')
                print("==============================")
                print()

                local_command = classify_local_command(transcript)

                if local_command == "hello":
                    memory["command_count"] += 1
                    memory["last_command"] = "hello"

                    manual_sleep = False
                    brain_state = "HAPPY"
                    speech_mode = "WAKE"
                    hello_until = now + HELLO_HAPPY_TIME

                    print('LOCAL COMMAND -> "hello"')
                    send_command("EYES:HAPPY", force=True)
                    speech_hold_event.clear()
                    continue

                if local_command == "look at me":
                    memory["command_count"] += 1
                    memory["last_command"] = "look at me"

                    manual_sleep = False
                    speech_mode = "WAKE"
                    look_for_me = True
                    look_for_me_until = now + LOOK_FOR_ME_TIME

                    print('LOCAL COMMAND -> "look at me"')
                    print("Bloopy is looking for you...")

                    if vision["visible"] and vision["zone"] in TRACK_COMMANDS:
                        brain_state = "TRACKING"
                        send_command(
                            TRACK_COMMANDS[vision["zone"]],
                            force=True,
                        )
                        print("Bloopy already sees you.")
                        look_for_me = False
                    else:
                        brain_state = "LOOKING_FOR_PERSON"
                        send_command("EYES:CURIOUS", force=True)

                    speech_hold_event.clear()
                    continue

                if local_command == "go to sleep":
                    memory["command_count"] += 1
                    memory["last_command"] = "go to sleep"

                    manual_sleep = True
                    look_for_me = False
                    brain_state = "SLEEPING"
                    speech_mode = "WAKE"

                    print('LOCAL COMMAND -> "go to sleep"')
                    send_command("EYES:SLEEP", force=True)
                    print("Bloopy is asleep.")
                    print('Say "Hey Bloopy" to wake him.')
                    speech_hold_event.clear()
                    continue

                memory["conversation_count"] += 1
                memory["last_conversation"] = transcript

                brain_state = "THINKING"
                speech_mode = "AI"

                print("CONVERSATION INPUT:")
                print(transcript)
                print()
                print("Bloopy is thinking...")

                send_command("EYES:CURIOUS", force=True)

                try:
                    ai_response = ask_bloopy_ai(transcript)

                    memory["ai_response_count"] += 1
                    memory["last_ai_response"] = ai_response

                    print()
                    print("==============================")
                    print("BLOOPY AI:")
                    print(ai_response)
                    print("==============================")
                    print()

                    brain_state = "SPEAKING"
                    speech_mode = "SPEAKING"
                    send_command("EYES:HAPPY", force=True)

                    try:
                        speak_bloopy(ai_response)

                        if FOLLOWUP_ENABLED:
                            followup_event.set()

                    except Exception as speech_error:
                        # Keep the AI response even if speaker playback fails.
                        print()
                        print("TTS ERROR:")
                        print(speech_error)
                        print()

                except Exception as error:
                    print()
                    print("AI ERROR:")
                    print(error)
                    print()

                finally:
                    # Re-enable wake recognition only after the answer/playback
                    # has completely finished.
                    speech_hold_event.clear()

                speech_mode = "WAKE"
                resume_behavior()

        frame = camera.capture_array()

        small = cv2.resize(
            frame,
            (FRAME_WIDTH, FRAME_HEIGHT),
        )

        gray = cv2.cvtColor(
            small,
            cv2.COLOR_RGB2GRAY,
        )

        gray = cv2.equalizeHist(gray)

        target_found = False
        target_type = None
        target_center_x = None

        faces = face_detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(40, 40),
        )

        if len(faces) > 0:
            x, y, w, h = max(
                faces,
                key=lambda box: box[2] * box[3],
            )
            target_center_x = x + w / 2
            target_found = True
            target_type = "FACE"

        elif frame_number % PERSON_SCAN_EVERY == 0:
            boxes, weights = hog.detectMultiScale(
                gray,
                winStride=(8, 8),
                padding=(8, 8),
                scale=1.05,
            )

            if len(boxes) > 0:
                x, y, w, h = max(
                    boxes,
                    key=lambda box: box[2] * box[3],
                )
                target_center_x = x + w / 2
                target_found = True
                target_type = "PERSON"

        frame_number += 1

        if target_found:
            vision["visible"] = True
            vision["target_type"] = target_type
            vision["last_seen"] = now

            zone = calculate_zone(target_center_x)
            vision["zone"] = zone

            if not memory["target_present"]:
                memory["target_present"] = True
                memory["appearances"] += 1
                memory["lost_at"] = None

                print()
                print(f"{target_type} APPEARED")

                if (
                    not manual_sleep
                    and speech_mode == "WAKE"
                    and now >= hello_until
                ):
                    if sensors["lux"] is None or sensors["lux"] >= DARK_THRESHOLD:
                        brain_state = "GREETING"
                        greeting_until = now + GREETING_TIME
                        send_command("EYES:HAPPY", force=True)

            if zone == candidate_zone:
                candidate_count += 1
            else:
                candidate_zone = zone
                candidate_count = 1

            if (
                not manual_sleep
                and speech_mode == "WAKE"
                and now >= greeting_until
                and now >= hello_until
                and candidate_count >= CONFIRM_FRAMES
            ):
                confirmed_zone = zone
                memory["last_zone"] = zone
                memory["last_target_type"] = target_type

                brain_state = "TRACKING"
                send_command(TRACK_COMMANDS[zone])

                if look_for_me:
                    print("Bloopy found you.")
                    look_for_me = False

        else:
            vision["visible"] = False
            missing_time = now - vision["last_seen"]

            if (
                memory["target_present"]
                and missing_time > TARGET_LOST_TIMEOUT
            ):
                memory["target_present"] = False
                memory["lost_at"] = now

                vision["target_type"] = None
                vision["zone"] = None

                candidate_zone = None
                candidate_count = 0
                confirmed_zone = None

                print()
                print("TARGET LOST")

                if not manual_sleep and speech_mode == "WAKE":
                    if look_for_me:
                        brain_state = "LOOKING_FOR_PERSON"
                        send_command("EYES:CURIOUS", force=True)
                    elif (
                        sensors["lux"] is not None
                        and sensors["lux"] < DARK_THRESHOLD
                    ):
                        brain_state = "AUTO"
                        send_command("EYES:NORMAL", force=True)
                    else:
                        brain_state = "CURIOUS_AFTER_LOSS"
                        send_command("EYES:CURIOUS", force=True)

            if (
                not memory["target_present"]
                and memory["lost_at"] is not None
            ):
                remembered_for = now - memory["lost_at"]

                if remembered_for >= MEMORY_WINDOW:
                    memory["lost_at"] = None
                    memory["last_target_type"] = None
                    memory["last_zone"] = None

                    print("Short-term target memory expired.")

                    if (
                        not manual_sleep
                        and not look_for_me
                        and speech_mode == "WAKE"
                        and now >= hello_until
                    ):
                        brain_state = "AUTO"
                        send_command("EYES:NORMAL", force=True)

        if hello_until > 0 and now >= hello_until:
            hello_until = 0.0
            resume_behavior()

        if look_for_me and now >= look_for_me_until:
            look_for_me = False
            print("Look-at-me search timed out.")
            resume_behavior()

        lux = sensors["lux"]

        if (
            not manual_sleep
            and lux is not None
            and lux < DARK_THRESHOLD
            and not memory["target_present"]
            and speech_mode == "WAKE"
            and hello_until == 0
            and not look_for_me
        ):
            if brain_state != "AUTO":
                brain_state = "AUTO"
                send_command("EYES:NORMAL")

        if now - last_status_print >= 3.0:
            print_state()
            last_status_print = now

        time.sleep(0.08)

except KeyboardInterrupt:
    print()
    print("Stopping Bloopy Brain v1.2...")

finally:
    speech_stop_event.set()
    speech_hold_event.clear()
    followup_event.clear()
    stop_app_bridge()
    stop_audio_output()
    stop_whisper_server()
    terminate_process(whisper_process)

    try:
        speech_thread.join(timeout=3)
    except Exception:
        pass

    try:
        send_command("EYES:NORMAL", force=True)
    except Exception:
        pass

    try:
        camera.stop()
    except Exception:
        pass

    try:
        esp.close()
    except Exception:
        pass

    print("Bloopy Brain v1.2 stopped safely.")
