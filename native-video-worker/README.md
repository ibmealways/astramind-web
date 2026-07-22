# AstraMind Native Video Worker

This private worker runs open-weight video models on hardware controlled by AstraMind. It replaces per-generation video-app APIs; it does not eliminate GPU, electricity, storage, or hosting costs.

## Hardware

- NVIDIA CUDA GPU required.
- LTX is the default development backend.
- Wan is supported for text-to-video when a compatible Diffusers checkpoint is configured.
- Start with at least 16 GB VRAM for practical development; larger models and resolutions need more memory.

## Install and run

Create an isolated Python environment on the GPU machine, install the dependencies in `requirements.txt`, then set matching tokens on the web server and worker:

```powershell
$env:ASTRAMIND_NATIVE_VIDEO_TOKEN="replace-with-a-long-random-secret"
$env:ASTRAMIND_NATIVE_VIDEO_BACKEND="ltx"
$env:ASTRAMIND_NATIVE_VIDEO_MODEL="Lightricks/LTX-Video"
python server.py
```

Python 3.10 or newer is required.

### Container deployment

On a GPU host with Docker, the NVIDIA Container Toolkit, and a compatible NVIDIA driver:

1. Copy `.env.worker.example` to `.env.worker` and replace the token.
2. From the repository root, run `scripts/start-native-video-worker.ps1`.
3. Run `scripts/check-native-video-worker.ps1` with the matching token.

The container binds only to `127.0.0.1`, keeps model weights in a named volume, and requests one NVIDIA GPU.

Configure the AstraMind web server:

```text
AI_VIDEO_PROVIDER=astramind-native
ASTRAMIND_NATIVE_VIDEO_URL=http://127.0.0.1:8189
ASTRAMIND_NATIVE_VIDEO_TOKEN=<same secret>
ASTRAMIND_NATIVE_VIDEO_BACKEND=ltx
ASTRAMIND_NATIVE_VIDEO_MODEL=Lightricks/LTX-Video
ASTRAMIND_ALLOW_PAID_VIDEO_PROVIDERS=false
```

Keep the worker bound to `127.0.0.1` unless it is behind a private network and authenticated reverse proxy. Model downloads can be large and happen during the first generation unless weights are pre-cached.

## HTTP contract

- `GET /v1/health`
- `POST /v1/video/generations`
- `GET /v1/video/generations/:id`
- `POST /v1/video/generations/:id/cancel`
- `GET /v1/video/artifacts/:id.mp4`
