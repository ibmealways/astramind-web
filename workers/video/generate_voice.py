"""Generate a local draft dialogue WAV with Kokoro ONNX (no per-line API credits)."""
import argparse
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro


ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--voice", default="am_michael")
    parser.add_argument("--output", required=True)
    parser.add_argument("--speed", type=float, default=1.0)
    args = parser.parse_args()
    if not args.text.strip() or len(args.text) > 5000:
        raise ValueError("Dialogue must be 1-5000 characters.")
    if not 0.7 <= args.speed <= 1.3:
        raise ValueError("Speed must be between 0.7 and 1.3.")
    model_path = ROOT / "models" / "kokoro-v1.0.onnx"
    voices_path = ROOT / "models" / "voices-v1.0.bin"
    if not model_path.is_file() or not voices_path.is_file():
        raise FileNotFoundError("Download the Kokoro ONNX model and voice pack into workers/video/models.")
    samples, sample_rate = Kokoro(str(model_path), str(voices_path)).create(
        args.text, voice=args.voice, speed=args.speed, lang="en-us"
    )
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    sf.write(output, samples, sample_rate)
    print(f"Saved {output} ({len(samples) / sample_rate:.2f}s)")


if __name__ == "__main__":
    main()
