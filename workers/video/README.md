# Aigenikz local AI video worker

The worker uses the Apache-2.0 [CogVideoX-2B model](https://huggingface.co/zai-org/CogVideoX-2b) to generate actual moving video frames. It does not substitute an animated still. On the PC's RTX 3050 (8 GB), a 13-frame test rendered successfully and passed the application's black/frozen-video check. A standard clip uses 49 frames at 8 fps, about six seconds. Longer videos require many clips and assembly.

Install Python 3.12, CUDA-enabled PyTorch, and `requirements.txt` in an isolated virtual environment. The first render downloads several GB of model weights; leave at least 20 GB free. Set a long random `AIGENIKZ_VIDEO_WORKER_TOKEN`, then run `python worker.py` on the PC. The worker listens on `127.0.0.1:8003` by default. Every endpoint requires the bearer token.

For a Render-hosted Aigenikz site, expose port 8003 through a secure tunnel and set `AIGENIKZ_VIDEO_WORKER_URL` and `AIGENIKZ_VIDEO_WORKER_TOKEN` in Render. Cloudflare Quick Tunnel addresses change when restarted. Keep the token private. The PC and worker must stay on; jobs run one at a time and share GPU memory with the Music Studio worker.

`POST /v1/video/generations` accepts a prompt and returns a job ID. `GET /v1/video/generations/<id>` gives job status, and `/file` returns the MP4 after completion. Job states are recorded under `output/` so a restart reports an interrupted render clearly.

For a short hardware check, set `AIGENIKZ_VIDEO_FRAMES=13` and `AIGENIKZ_VIDEO_STEPS=10` before invoking `generate.py`. The production defaults are 49 frames and 30 steps. Aigenikz rejects invalid, black, or frozen MP4s in local AI mode.
