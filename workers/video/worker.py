"""Token-protected local video job API for the Aigenikz Video Studio."""
import json
import os
import subprocess
import sys
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
OUTPUT = Path(os.getenv("AIGENIKZ_VIDEO_OUTPUT_DIR", str(ROOT / "output"))).resolve()
OUTPUT.mkdir(parents=True, exist_ok=True)
TOKEN = os.getenv("AIGENIKZ_VIDEO_WORKER_TOKEN", "")
JOBS = {}
LOCK = threading.Lock()


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
        if job.get("status") == "completed" and not (OUTPUT / f"{job_id}.mp4").exists():
            job.update(status="failed", error="Generated MP4 is missing from the PC video worker.")
        JOBS[job_id] = job
        save_job(job_id)
    except (OSError, ValueError):
        continue


def run_job(job_id, prompt):
    path = OUTPUT / f"{job_id}.mp4"
    with LOCK:
        JOBS[job_id]["status"] = "running"
        save_job(job_id)
        command = [sys.executable, str(ROOT / "generate.py"), "--prompt", prompt, "--output", str(path)]
        try:
            result = subprocess.run(command, capture_output=True, text=True, timeout=25 * 60)
            if result.returncode or not path.exists() or path.stat().st_size < 10000:
                raise RuntimeError((result.stderr or result.stdout or "Video model returned no MP4")[-1000:])
            JOBS[job_id].update(status="completed", bytes=path.stat().st_size)
        except Exception as exc:
            JOBS[job_id].update(status="failed", error=str(exc)[:1000])
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
            return self.send_json(200, {"ok": True, "model": "CogVideoX-2B", "real_video": True})
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
        if urlparse(self.path).path != "/v1/video/generations":
            return self.send_json(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 10000:
                return self.send_json(400, {"error": "Prompt request size is invalid"})
            payload = json.loads(self.rfile.read(length))
            prompt = str(payload.get("prompt", "")).strip()
            if not prompt:
                return self.send_json(400, {"error": "Prompt is required"})
            job_id = uuid.uuid4().hex
            job = {"job_id": job_id, "status": "queued", "model": "CogVideoX-2B"}
            JOBS[job_id] = job
            save_job(job_id)
            threading.Thread(target=run_job, args=(job_id, prompt), daemon=True).start()
            self.send_json(202, job)
        except (ValueError, json.JSONDecodeError):
            self.send_json(400, {"error": "Invalid JSON request"})


if __name__ == "__main__":
    if not TOKEN:
        raise RuntimeError("Set AIGENIKZ_VIDEO_WORKER_TOKEN before starting the worker.")
    port = int(os.getenv("AIGENIKZ_VIDEO_WORKER_PORT", "8003"))
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
