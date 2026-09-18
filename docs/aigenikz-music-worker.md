# Aigenikz Music worker

The web application owns the user experience, sessions, lyrics, mixer metadata, generated files, and provider selection. Full-song inference runs in a separate GPU worker so the Aigenikz web service does not require a GPU or load model weights.

## Application configuration

```env
MUSIC_GENERATION_PROVIDER=aigenikz
AIGENIKZ_MUSIC_WORKER_URL=https://music-worker.example.com
AIGENIKZ_MUSIC_WORKER_TOKEN=replace-with-a-long-random-service-token
AIGENIKZ_MUSIC_MODEL=ace-step-1.5
```

Use HTTPS outside a private network. The token is optional for local development and required for an internet-accessible worker. Store it only in server-side environment variables.

## Worker contract

Submit with `POST /v1/music/generations` and `Authorization: Bearer <AIGENIKZ_MUSIC_WORKER_TOKEN>`. The JSON request contains the prompt, lyrics, genre, mood, tempo, key, time signature, duration, vocal direction, instruments, and sections.

The worker may return a completed response with `audio_url` or `audio_base64`. It may return `{"status":"queued","job_id":"job-id"}`; Aigenikz then polls `GET /v1/music/generations/:jobId` until it receives `completed`, `failed`, or `cancelled`.

Run ACE-Step 1.5 on an NVIDIA GPU and put a thin adapter in front of its native `/release_task`, `/query_result`, and `/v1/audio` endpoints. Keep one model loaded per worker and queue requests when GPU memory is limited.

Official engine: https://github.com/ace-step/ACE-Step-1.5
