"""AstraMind-owned local video inference worker.

Runs open-weight LTX or Wan models behind a private HTTP contract. Model weights
and generated artifacts remain on infrastructure controlled by AstraMind.
"""

from __future__ import annotations

import base64
import json
import os
import secrets
import threading
import traceback
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

HOST = os.getenv("ASTRAMIND_NATIVE_VIDEO_HOST", "127.0.0.1")
PORT = int(os.getenv("ASTRAMIND_NATIVE_VIDEO_PORT", "8189"))
TOKEN = os.getenv("ASTRAMIND_NATIVE_VIDEO_TOKEN", "")
DEFAULT_BACKEND = os.getenv("ASTRAMIND_NATIVE_VIDEO_BACKEND", "ltx").lower()
DEFAULT_MODEL = os.getenv("ASTRAMIND_NATIVE_VIDEO_MODEL", "Lightricks/LTX-Video")
OUTPUT_DIR = Path(os.getenv("ASTRAMIND_NATIVE_VIDEO_OUTPUT_DIR", "native-video-output")).resolve()
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

JOBS: dict[str, dict] = {}
LOCK = threading.Lock()
PIPELINES: dict[tuple[str, str, str], object] = {}


def public_job(job: dict) -> dict:
    return {key: value for key, value in job.items() if key not in {"request", "outputPath", "traceback"}}


def cuda_health() -> dict:
    try:
        import torch
        ready = bool(torch.cuda.is_available())
        return {
            "ready": ready,
            "device": torch.cuda.get_device_name(0) if ready else "cpu",
            "cuda": torch.version.cuda,
            "vramBytes": torch.cuda.get_device_properties(0).total_memory if ready else 0,
            "error": None if ready else "CUDA GPU is required for native video generation.",
        }
    except Exception as error:  # dependencies intentionally optional until worker install
        return {"ready": False, "device": "unavailable", "cuda": None, "vramBytes": 0, "error": str(error)}


def decode_image(image_payload):
    if not image_payload or not image_payload.get("base64"):
        return None
    from PIL import Image
    return Image.open(BytesIO(base64.b64decode(image_payload["base64"]))).convert("RGB")


def load_pipeline(backend: str, model: str, image_mode: bool):
    import torch
    key = (backend, model, "i2v" if image_mode else "t2v")
    if key in PIPELINES:
        return PIPELINES[key]
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU is required for AstraMind native video generation.")
    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    if backend == "ltx":
        from diffusers import LTXImageToVideoPipeline, LTXPipeline
        pipeline_type = LTXImageToVideoPipeline if image_mode else LTXPipeline
    elif backend == "wan":
        if image_mode:
            raise RuntimeError("Wan image-to-video requires a dedicated I2V checkpoint; configure LTX for reference-image generation.")
        from diffusers import WanPipeline
        pipeline_type = WanPipeline
    else:
        raise RuntimeError(f"Unsupported native backend: {backend}")
    pipeline = pipeline_type.from_pretrained(model, torch_dtype=dtype)
    pipeline.enable_model_cpu_offload()
    PIPELINES[key] = pipeline
    return pipeline


def render(job_id: str):
    with LOCK:
        job = JOBS[job_id]
        job["status"] = "running"
        request = job["request"]
    try:
        import torch
        from diffusers.utils import export_to_video
        backend = str(request.get("backend") or DEFAULT_BACKEND).lower()
        model = str(request.get("model") or DEFAULT_MODEL)
        image = decode_image(request.get("image"))
        pipeline = load_pipeline(backend, model, image is not None)
        width = max(256, min(int(request.get("width") or 704), 1280))
        height = max(256, min(int(request.get("height") or 480), 1280))
        # Diffusion video dimensions should remain divisible by 32.
        width -= width % 32
        height -= height % 32
        fps = max(8, min(int(request.get("fps") or 24), 30))
        duration = max(1, min(float(request.get("durationSeconds") or 5), 10))
        num_frames = max(9, int(duration * fps) + 1)
        # LTX temporal compression expects 8n+1 frames.
        num_frames = ((num_frames - 1) // 8) * 8 + 1
        seed = int(request.get("seed") if request.get("seed") is not None else secrets.randbelow(2**31 - 1))
        kwargs = {
            "prompt": request["prompt"],
            "negative_prompt": request.get("negativePrompt") or "worst quality, blurry, jittery, distorted, text, watermark",
            "width": width,
            "height": height,
            "num_frames": num_frames,
            "num_inference_steps": int(os.getenv("ASTRAMIND_NATIVE_VIDEO_STEPS", "30")),
            "generator": torch.Generator(device="cuda").manual_seed(seed),
        }
        if image is not None:
            kwargs["image"] = image
        frames = pipeline(**kwargs).frames[0]
        output_path = OUTPUT_DIR / f"{job_id}.mp4"
        export_to_video(frames, str(output_path), fps=fps)
        with LOCK:
            if JOBS[job_id]["status"] == "cancel_requested":
                JOBS[job_id].update(status="cancelled", error="Cancelled after the active inference pass.")
            else:
                JOBS[job_id].update(status="completed", progress=100, videoUrl=f"/v1/video/artifacts/{job_id}.mp4", outputPath=str(output_path), backend=backend, model=model, seed=seed)
    except Exception as error:
        with LOCK:
            JOBS[job_id].update(status="failed", error=str(error), traceback=traceback.format_exc(limit=8))


class Handler(BaseHTTPRequestHandler):
    server_version = "AstraMindNativeVideo/1.0"

    def authorized(self):
        return not TOKEN or self.headers.get("Authorization") == f"Bearer {TOKEN}"

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("content-length", "0"))
        return json.loads(self.rfile.read(length) or b"{}")

    def do_GET(self):
        if not self.authorized():
            return self.send_json(401, {"ok": False, "error": "Unauthorized"})
        path = urlparse(self.path).path
        if path == "/v1/health":
            health = cuda_health()
            return self.send_json(200, {"ok": True, "backend": DEFAULT_BACKEND, "model": DEFAULT_MODEL, **health})
        if path.startswith("/v1/video/generations/"):
            job_id = path.rsplit("/", 1)[-1]
            with LOCK:
                job = JOBS.get(job_id)
            return self.send_json(200 if job else 404, public_job(job) if job else {"ok": False, "error": "Job not found"})
        if path.startswith("/v1/video/artifacts/"):
            artifact = (OUTPUT_DIR / path.rsplit("/", 1)[-1]).resolve()
            if artifact.parent != OUTPUT_DIR or not artifact.exists():
                return self.send_json(404, {"ok": False, "error": "Artifact not found"})
            body = artifact.read_bytes()
            self.send_response(200)
            self.send_header("content-type", "video/mp4")
            self.send_header("content-length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        return self.send_json(404, {"ok": False, "error": "Route not found"})

    def do_POST(self):
        if not self.authorized():
            return self.send_json(401, {"ok": False, "error": "Unauthorized"})
        path = urlparse(self.path).path
        if path == "/v1/video/generations":
            request = self.read_json()
            if not str(request.get("prompt") or "").strip():
                return self.send_json(400, {"ok": False, "error": "prompt is required"})
            job_id = str(uuid.uuid4())
            job = {"ok": True, "id": job_id, "status": "queued", "progress": 0, "request": request, "backend": request.get("backend") or DEFAULT_BACKEND, "model": request.get("model") or DEFAULT_MODEL}
            with LOCK:
                JOBS[job_id] = job
            threading.Thread(target=render, args=(job_id,), daemon=True).start()
            return self.send_json(202, public_job(job))
        if path.endswith("/cancel") and "/v1/video/generations/" in path:
            job_id = path.split("/")[-2]
            with LOCK:
                job = JOBS.get(job_id)
                if job and job["status"] in {"queued", "running"}:
                    job["status"] = "cancel_requested"
            return self.send_json(200 if job else 404, public_job(job) if job else {"ok": False, "error": "Job not found"})
        return self.send_json(404, {"ok": False, "error": "Route not found"})

    def log_message(self, fmt, *args):
        print(f"[native-video] {self.address_string()} {fmt % args}")


if __name__ == "__main__":
    print(f"AstraMind native video worker listening on http://{HOST}:{PORT}")
    print(f"Backend={DEFAULT_BACKEND} Model={DEFAULT_MODEL} Output={OUTPUT_DIR}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
