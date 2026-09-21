"""Generate an original image locally with an SDXL-compatible model."""
import argparse
import os
from pathlib import Path

import torch
from diffusers import StableDiffusionXLPipeline


DEFAULT_MODEL = os.getenv("AIGENIKZ_IMAGE_MODEL", "cagliostrolab/animagine-xl-4.0")
NEGATIVE_PROMPT = (
    "lowres, bad anatomy, bad hands, malformed hands, extra fingers, missing fingers, "
    "extra limbs, fused bodies, duplicate character, cropped, blurry, text, logo, "
    "signature, watermark, username, worst quality, low quality"
)


def dimensions(aspect):
    return {
        "portrait": (768, 1024),
        "landscape": (1024, 768),
        "square": (896, 896),
    }.get(aspect, (1024, 768))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--aspect", choices=("portrait", "landscape", "square"), default="landscape")
    parser.add_argument("--seed", type=int, default=-1)
    parser.add_argument("--steps", type=int, default=28)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    args = parser.parse_args()

    if not torch.cuda.is_available():
        raise RuntimeError("A CUDA GPU is required for the configured local image model.")

    width, height = dimensions(args.aspect)
    seed = args.seed if args.seed >= 0 else int.from_bytes(os.urandom(4), "big")
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)

    pipe = StableDiffusionXLPipeline.from_pretrained(
        args.model,
        torch_dtype=torch.float16,
        use_safetensors=True,
    )
    pipe.enable_model_cpu_offload()
    pipe.vae.enable_slicing()
    pipe.vae.enable_tiling()

    image = pipe(
        prompt=args.prompt,
        negative_prompt=NEGATIVE_PROMPT,
        width=width,
        height=height,
        guidance_scale=5.0,
        num_inference_steps=max(16, min(args.steps, 40)),
        generator=torch.Generator(device="cpu").manual_seed(seed),
    ).images[0]
    image.save(output, format="PNG", optimize=True)
    print(f"saved={output} seed={seed} model={args.model} size={width}x{height}")


if __name__ == "__main__":
    main()
