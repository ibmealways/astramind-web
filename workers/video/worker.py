"""Token-protected local video job API for the Aigenikz Video Studio."""
import base64
import io
import json
import os
import subprocess
import sys
import threading
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from PIL import Image, UnidentifiedImageError

ROOT = Path(__file__).resolve().parent
OUTPUT = Path(os.getenv("AIGENIKZ_VIDEO_OUTPUT_DIR", str(ROOT / "output"))).resolve()
OUTPUT.mkdir(parents=True, exist_ok=True)
TOKEN = os.getenv("AIGENIKZ_VIDEO_WORKER_TOKEN", "")
JOBS = {}
LOCK = threading.Lock()
GPU_LOCK = threading.Lock()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def save_job(job_id):
    target = OUTPUT / f"{job_id}.json"
    temporary = OUTPUT / f"{job_id}.json.tmp"
    temporary.write_text(json.dumps(JOBS[job_id]), encoding="utf-8")
    temporary.replace(target)


for saved in OUTPUT.glob("*.json"):
    try:
        job = json.loads(saved.read_text(encoding="utf-8"))
        job_id = job.get("job_id")
        if not job_id or saved.stem != job_id:
            continue
        if job.get("status") in ("queued", "running"):
            job.update(status="failed", error="PC video worker restarted before this render completed. Please retry.")
        extension = ".png" if job.get("kind") == "image" else ".mp4"
        if job.get("status") == "completed" and not (OUTPUT / f"{job_id}{extension}").exists():
            job.update(status="failed", error=f"Generated {extension} is missing from the PC AI worker.")
        JOBS[job_id] = job
        save_job(job_id)
    except (OSError, ValueError):
        continue


def run_job(job_id, prompt, reference_path=None):
    path = OUTPUT / f"{job_id}.mp4"
    with LOCK:
        JOBS[job_id].update(status="running", stage="Loading local AI video model", started_at=now_iso())
        save_job(job_id)
    command = [sys.executable, str(ROOT / ("generate_i2v.py" if reference_path else "generate.py")),
               "--prompt", prompt, "--output", str(path)]
    if reference_path:
        command.extend(["--image", str(reference_path)])
    try:
        with GPU_LOCK:
            with LOCK:
                JOBS[job_id]["stage"] = "Animating scene from reference image" if reference_path else "Generating video frames from prompt"
                save_job(job_id)
            result = subprocess.run(command, capture_output=True, text=True, timeout=25 * 60)
        if result.returncode or not path.exists() or path.stat().st_size < 10000:
            raise RuntimeError((result.stderr or result.stdout or "Video model returned no MP4")[-1000:])
        with LOCK:
            JOBS[job_id].update(status="completed", stage="Video clip ready", bytes=path.stat().st_size, completed_at=now_iso())
            save_job(job_id)
    except Exception as exc:
        with LOCK:
            JOBS[job_id].update(status="failed", stage="Generation failed", error=str(exc)[:1000], completed_at=now_iso())
            save_job(job_id)


def run_image_job(job_id, prompt, aspect, seed, reference_path=None, reference_strength=0.45):
    path = OUTPUT / f"{job_id}.png"
    with LOCK:
        JOBS[job_id]["status"] = "running"
        JOBS[job_id]["stage"] = "Generating scene image"
        JOBS[job_id]["started_at"] = now_iso()
        save_job(job_id)
    command = [
        sys.executable,
        str(ROOT / "generate_image.py"),
        "--prompt", prompt,
        "--output", str(path),
        "--aspect", aspect,
        "--seed", str(seed),
    ]
    if reference_path:
        command.extend(["--reference", str(reference_path), "--reference-strength", str(reference_strength)])
    try:
        with GPU_LOCK:
            result = subprocess.run(command, capture_output=True, text=True, timeout=25 * 60)
        if result.returncode or not path.exists() or path.stat().st_size < 10000:
            raise RuntimeError((result.stderr or result.stdout or "Image model returned no PNG")[-1500:])
        with Image.open(path) as image:
            image.verify()
        with LOCK:
            JOBS[job_id].update(status="completed", stage="Scene image ready", bytes=path.stat().st_size, completed_at=now_iso())
            save_job(job_id)
    except Exception as exc:
        with LOCK:
            JOBS[job_id].update(status="failed", stage="Image generation failed", error=str(exc)[:1500], completed_at=now_iso())
            save_job(job_id)


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        encoded = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def authorized(self):
        if not TOKEN or self.headers.get("Authorization") != f"Bearer {TOKEN}":
            self.send_json(401, {"error": "Unauthorized"})
            return False
        return True

    def do_GET(self):
        if not self.authorized():
            return
        parts = urlparse(self.path).path.strip("/").split("/")
        if parts == ["health"]:
            jobs = list(JOBS.values())
            return self.send_json(200, {
                "ok": True,
                "models": ["Animagine-XL-4.0", "CogVideoX-2B", "LTX-Video-2B-I2V"],
                "real_image": True,
                "real_video": True,
                "busy": any(job.get("status") in ("queued", "running") for job in jobs),
                "active_jobs": sum(job.get("status") in ("queued", "running") for job in jobs),
            })
        if parts == ["v1", "jobs"]:
            jobs = sorted(JOBS.values(), key=lambda job: job.get("queued_at", ""), reverse=True)[:30]
            return self.send_json(200, {"ok": True, "jobs": jobs, "checked_at": now_iso()})
        if len(parts) in (4, 5) and parts[:3] == ["v1", "image", "generations"]:
            job = JOBS.get(parts[3])
            if not job or job.get("kind") != "image":
                return self.send_json(404, {"error": "Image job not found"})
            if len(parts) == 4:
                return self.send_json(200, job)
            if parts[4] == "file" and job["status"] == "completed":
                path = OUTPUT / f"{parts[3]}.png"
                self.send_response(200)
                self.send_header("Content-Type", "image/png")
                self.send_header("Content-Length", str(path.stat().st_size))
                self.end_headers()
                with path.open("rb") as image:
                    while chunk := image.read(1024 * 1024):
                        self.wfile.write(chunk)
                return
        if len(parts) in (4, 5) and parts[:3] == ["v1", "video", "generations"]:
            job = JOBS.get(parts[3])
            if not job:
                return self.send_json(404, {"error": "Job not found"})
            if len(parts) == 4:
                return self.send_json(200, job)
            if parts[4] == "file" and job["status"] == "completed":
                path = OUTPUT / f"{parts[3]}.mp4"
                self.send_response(200)
                self.send_header("Content-Type", "video/mp4")
                self.send_header("Content-Length", str(path.stat().st_size))
                self.end_headers()
                with path.open("rb") as video:
                    while chunk := video.read(1024 * 1024):
                        self.wfile.write(chunk)
                return
        self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        if not self.authorized():
            return
        request_path = urlparse(self.path).path
        if request_path not in ("/v1/video/generations", "/v1/image/generations"):
            return self.send_json(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 12 * 1024 * 1024:
                return self.send_json(400, {"error": "Prompt request size is invalid"})
            payload = json.loads(self.rfile.read(length))
            prompt = str(payload.get("prompt", "")).strip()
            if not prompt:
                return self.send_json(400, {"error": "Prompt is required"})
            job_id = uuid.uuid4().hex
            if request_path == "/v1/image/generations":
                aspect = str(payload.get("aspect", "landscape"))
                if aspect not in ("portrait", "landscape", "square"):
                    return self.send_json(400, {"error": "Aspect must be portrait, landscape, or square"})
                try:
                    seed = int(payload.get("seed", -1))
                except (TypeError, ValueError):
                    return self.send_json(400, {"error": "Seed must be an integer"})
                if seed < 0:
                    seed = int.from_bytes(os.urandom(4), "big")
                reference_path = None
                reference_image = payload.get("reference_image")
                try:
                    reference_strength = float(payload.get("reference_strength", 0.45))
                except (TypeError, ValueError):
                    return self.send_json(400, {"error": "Reference strength must be a number"})
                reference_strength = max(0.35, min(reference_strength, 0.9))
                if reference_image:
                    if not isinstance(reference_image, str) or "," not in reference_image:
                        return self.send_json(400, {"error": "Reference image must be a PNG or JPEG data URL"})
                    header, encoded = reference_image.split(",", 1)
                    if header not in ("data:image/png;base64", "data:image/jpeg;base64"):
                        return self.send_json(400, {"error": "Only PNG and JPEG reference images are supported"})
                    data = base64.b64decode(encoded, validate=True)
                    if len(data) > 8 * 1024 * 1024:
                        return self.send_json(400, {"error": "Reference image exceeds 8 MB"})
                    with Image.open(io.BytesIO(data)) as source:
                        if source.width > 4096 or source.height > 4096 or source.width < 256 or source.height < 256:
                            return self.send_json(400, {"error": "Reference image dimensions must be 256-4096 pixels"})
                        reference_path = OUTPUT / f"{job_id}-image-reference.png"
                        source.convert("RGB").save(reference_path)
                model = os.getenv("AIGENIKZ_IMAGE_MODEL", "cagliostrolab/animagine-xl-4.0")
                job = {
                    "job_id": job_id,
                    "kind": "image",
                    "status": "queued",
                    "model": model,
                    "seed": seed,
                    "aspect": aspect,
                    "stage": "Queued for PC GPU",
                    "reference_used": bool(reference_path),
                    "reference_strength": reference_strength if reference_path else None,
                    "queued_at": now_iso(),
                }
                with LOCK:
                    JOBS[job_id] = job
                    save_job(job_id)
                threading.Thread(target=run_image_job, args=(job_id, prompt, aspect, seed, reference_path, reference_strength), daemon=True).start()
                return self.send_json(202, job)
            reference_path = None
            reference_image = payload.get("reference_image")
            if reference_image:
                if not isinstance(reference_image, str) or "," not in reference_image:
                    return self.send_json(400, {"error": "Reference image must be a PNG or JPEG data URL"})
                header, encoded = reference_image.split(",", 1)
                if header not in ("data:image/png;base64", "data:image/jpeg;base64"):
                    return self.send_json(400, {"error": "Only PNG and JPEG reference images are supported"})
                data = base64.b64decode(encoded, validate=True)
                if len(data) > 8 * 1024 * 1024:
                    return self.send_json(400, {"error": "Reference image exceeds 8 MB"})
                with Image.open(io.BytesIO(data)) as source:
                    if source.width > 4096 or source.height > 4096 or source.width < 256 or source.height < 256:
                        return self.send_json(400, {"error": "Reference image dimensions must be 256-4096 pixels"})
                    reference_path = OUTPUT / f"{job_id}-reference.png"
                    source.convert("RGB").save(reference_path)
            job = {"job_id": job_id, "kind": "video", "status": "queued", "stage": "Queued for PC GPU", "queued_at": now_iso(), "model": "LTX-Video-2B-I2V" if reference_path else "CogVideoX-2B"}
            with LOCK:
                JOBS[job_id] = job
                save_job(job_id)
            threading.Thread(target=run_job, args=(job_id, prompt, reference_path), daemon=True).start()
            self.send_json(202, job)
        except (ValueError, json.JSONDecodeError, UnidentifiedImageError, base64.binascii.Error):
            self.send_json(400, {"error": "Invalid JSON or reference image"})


if __name__ == "__main__":
    if not TOKEN:
        raise RuntimeError("Set AIGENIKZ_VIDEO_WORKER_TOKEN before starting the worker.")
    port = int(os.getenv("AIGENIKZ_VIDEO_WORKER_PORT", "8003"))
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
