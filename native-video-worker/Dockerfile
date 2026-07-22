FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models/huggingface

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /worker
COPY requirements.txt .
RUN python3 -m pip install --upgrade pip && python3 -m pip install -r requirements.txt
COPY server.py .

RUN useradd --create-home --uid 10001 astramind && \
    mkdir -p /models/huggingface /worker/native-video-output && \
    chown -R astramind:astramind /models /worker

USER astramind
EXPOSE 8189
CMD ["python3", "server.py"]
