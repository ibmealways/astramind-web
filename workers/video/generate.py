"""Generate actual model frames and encode them as MP4. No synthetic fallback."""
import argparse
import os

import torch
from diffusers import CogVideoXPipeline
from diffusers.utils import export_to_video


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if not torch.cuda.is_available():
        raise RuntimeError("An NVIDIA CUDA GPU is required for real video generation.")
    model = os.getenv("AIGENIKZ_VIDEO_MODEL", "zai-org/CogVideoX-2b")
    pipe = CogVideoXPipeline.from_pretrained(model, torch_dtype=torch.float16)
    pipe.enable_sequential_cpu_offload()
    pipe.vae.enable_slicing()
    pipe.vae.enable_tiling()
    frame_count = int(os.getenv("AIGENIKZ_VIDEO_FRAMES", "49"))
    step_count = int(os.getenv("AIGENIKZ_VIDEO_STEPS", "30"))
    if frame_count < 9 or frame_count > 49 or (frame_count - 1) % 4:
        raise ValueError("AIGENIKZ_VIDEO_FRAMES must be 9–49 in increments of 4.")
    if step_count < 10 or step_count > 50:
        raise ValueError("AIGENIKZ_VIDEO_STEPS must be 10–50.")
    frames = pipe(
        prompt=args.prompt[:1400],
        num_videos_per_prompt=1,
        num_inference_steps=step_count,
        num_frames=frame_count,
        guidance_scale=6,
        generator=torch.Generator(device="cuda").manual_seed(torch.seed()),
    ).frames[0]
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    export_to_video(frames, args.output, fps=8)


if __name__ == "__main__":
    main()
