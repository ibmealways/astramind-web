"""Generate a reference-conditioned video clip with LTX-Video 2B."""
import argparse
import os

import torch
from PIL import Image, ImageOps
from diffusers import LTXImageToVideoPipeline
from diffusers.utils import export_to_video


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--frames", type=int, default=49)
    parser.add_argument("--steps", type=int, default=30)
    args = parser.parse_args()
    if not torch.cuda.is_available():
        raise RuntimeError("An NVIDIA CUDA GPU is required for local image-to-video generation.")
    if args.frames not in (49, 97):
        raise ValueError("Only 49 or 97 frames are supported until longer clips are verified.")
    if not 20 <= args.steps <= 50:
        raise ValueError("Steps must be between 20 and 50.")

    width, height = (384, 640) if Image.open(args.image).height >= Image.open(args.image).width else (640, 384)
    image = ImageOps.fit(Image.open(args.image).convert("RGB"), (width, height), method=Image.Resampling.LANCZOS)
    model = os.getenv("AIGENIKZ_I2V_MODEL", "Lightricks/LTX-Video-0.9.5")
    pipe = LTXImageToVideoPipeline.from_pretrained(model, torch_dtype=torch.bfloat16)
    pipe.enable_sequential_cpu_offload()
    pipe.vae.enable_tiling()
    frames = pipe(
        image=image,
        prompt=args.prompt[:1400],
        negative_prompt="still image, frozen pose, inconsistent motion, deformed face, extra limbs",
        width=width,
        height=height,
        num_frames=args.frames,
        num_inference_steps=args.steps,
        decode_timestep=0.05,
        decode_noise_scale=0.025,
        generator=torch.Generator(device="cuda").manual_seed(torch.seed()),
    ).frames[0]
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    export_to_video(frames, args.output, fps=24)


if __name__ == "__main__":
    main()
