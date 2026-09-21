# Aigenikz PC image and video worker

The worker also exposes Animagine XL 4.0 text-to-image generation for Image Studio. POST /v1/image/generations accepts prompt, aspect (portrait, landscape, or square), and an optional integer seed. Poll GET /v1/image/generations/<id> and download the PNG from /file after completion. This is real local diffusion inference and never substitutes a placeholder when generation fails. Set AIGENIKZ_IMAGE_MODEL to another compatible SDXL Diffusers model when needed.

The local worker has two explicit generation paths:

- **CogVideoX-2B text-to-video**, for short general clips. The six-second character test was effectively frozen and must not be treated as successful animation.
- **LTX-Video 2B image-to-video**, for shots conditioned on a character reference. A two-second Kyle test on an RTX 3050 8 GB showed visible character and effects motion. This is a technical proof, not character approval or episode readiness.

The worker never substitutes an animated still when a model render fails. The Aigenikz server validates the MP4 and rejects frozen/black output. `project_pipeline.py quality` adds a stronger sampled-frame motion check. A reviewer must still approve identity, anatomy, continuity, and action.

## Installation and operation

Install Python 3.12, CUDA-enabled PyTorch, and `requirements.txt` in an isolated virtual environment. The first run downloads model weights and needs substantial disk space. Set a long random `AIGENIKZ_VIDEO_WORKER_TOKEN` and run `python worker.py` on the PC. It listens on `127.0.0.1:8003` and requires the bearer token for every endpoint. Jobs run one at a time and their states survive worker restarts in `output/`.

`POST /v1/video/generations` accepts `prompt` and optionally `reference_image`, a PNG/JPEG data URL (maximum 8 MB). Without a reference it runs CogVideoX; with one it runs LTX image-to-video. Poll `GET /v1/video/generations/<id>` and download `/file` only after `completed`. Reference images and MP4s remain in the PC worker's `output/` directory. Do not commit tokens or generated user media.

For a Render-hosted site, expose the PC worker through a secure tunnel and set `AIGENIKZ_VIDEO_WORKER_URL` and `AIGENIKZ_VIDEO_WORKER_TOKEN` in Render. A temporary tunnel URL changes on restart. The PC must remain on. This setup is local inference, not a free cloud GPU.

## Hollow Bloom pilot workflow

`assets/hollow-bloom/project.json` records the eight named heroes and first shot. Kyle's isolated image is marked **pending approval**. The user-supplied ensemble poster sets the visual direction; it does not by itself provide separate approved references for every hero.

1. Lock each character image and costume after review.
2. Plan short shots with `characterId`, action, camera, and dialogue in the project manifest.
3. Generate each shot from its reference image with `generate_i2v.py` or the authenticated worker API. Current tested settings are 384x640, 49 frames at 24 fps, 30 steps (about two seconds). Longer clips and multiple-character consistency are not yet verified.
4. Run `python project_pipeline.py quality <clip.mp4>`. This rejects nearly static or mostly black clips. Mark `approval: "accepted"` and set `clipPath` in the manifest only after human review.
5. Run `python project_pipeline.py assemble <project.json> <episode.mp4>`. It requires every shot to be accepted and quality-checked, joins them in order, and optionally mixes project `audioTracks` with `path`, `startSeconds`, and `gain` fields. Local draft dialogue can be generated with `generate_voice.py` using Kokoro ONNX, then mixed as an `audioTracks` entry. Music and sound effects must exist as audio files; this command does not synthesize them. Character voice assignments still need creator approval.

The app already has storyboard, voiceover, music-bed, and MP4 assembly components, but a full Hollow Bloom episode still requires approved reference images for all heroes, verified multi-shot consistency, dialogue voices, sound effects, long-project storage, and editorial review. LTX model weights carry Lightricks' open-weights license; review its terms before public/commercial deployment.
