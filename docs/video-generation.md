# Video generation

Video Studio has four explicit modes controlled by `AIGENIKZ_VIDEO_MODE` (with `AI_VIDEO_PROVIDER` accepted as a compatibility alias):

- `disabled`: the production default when no mode is configured.
- `local-test`: shown to users as **Animated Still Test Render**. It animates generated still images for non-paid testing and is never described as provider-generated video.
- `runway`: generates one Runway clip for each scene and fails if any provider clip fails. It never falls back to animated stills.
- `veo`: intentionally unavailable until the repository has a verified Veo request implementation. Selecting it returns a clear error.

Runway needs `RUNWAY_API_KEY`; `RUNWAYML_API_SECRET` and `RUNWAY_API_SECRET` remain supported aliases. Optional settings are `RUNWAY_MODEL` and `VIDEO_PROVIDER_TIMEOUT_MS`.

Cost and artifact limits use `VIDEO_PROVIDER_COST_PER_SECOND_USD` (default `0.10`), `VIDEO_MAX_PROVIDER_COST_USD` (default `5.00`), and `VIDEO_MAX_FILE_SIZE_BYTES` (default `262144000`). The cost check is an estimate and rejects a request before provider generation when it exceeds the configured ceiling.

Every render request requires a bearer token. The route applies plan duration, scene, concurrency, minute, and daily limits. Send all render settings in the single `options` object. Use an `Idempotency-Key` header or `options.idempotencyKey` to avoid duplicate completed requests.

The staging `local-test` mode permits up to 60 seconds so complete social-video drafts can be tested without provider charges. Real provider modes continue to use the account plan's duration limit.

The repaired route returns success only after FFmpeg verifies a readable MP4 video stream, dimensions, frame rate, duration, requested audio, decodability, and black/static-content checks. Responses expose a public `videoUrl`; server filesystem paths are not returned.

Voiceover, soundtrack, avatar presentation, and GPU rendering currently return explicit unsupported errors. They must stay disabled until the generated audio/video is composed and validated end to end.

For no-cost verification, set `AIGENIKZ_VIDEO_MODE=local-test`, use `allowFallback: true`, and run the test/build commands. Do not add a provider key during local test runs.
