"""Review generated shots and assemble an approved local video project."""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import imageio.v3 as imageio
import imageio_ffmpeg
import numpy as np


def inspect_clip(path):
    path = Path(path).resolve()
    if not path.is_file():
        raise FileNotFoundError(path)
    info = imageio.immeta(path)
    fps = float(info["fps"])
    duration = float(info["duration"])
    count = round(fps * duration)
    if count < 9 or duration < 1:
        raise ValueError("Clip is too short to assess motion.")
    frames = [imageio.imread(path, index=index).astype("int16") for index in (0, count // 2, count - 1)]
    first, middle, last = frames
    mean_change = max(float(abs(first - middle).mean()), float(abs(first - last).mean()))
    changed_pixels = max(float((abs(first - middle).mean(axis=2) > 12).mean()),
                         float((abs(first - last).mean(axis=2) > 12).mean()))
    mostly_black = sum(float(frame.mean()) < 16 for frame in frames) >= 2
    visible_motion = mean_change >= 3.0 and changed_pixels >= 0.02
    return {
        "path": str(path), "durationSeconds": round(duration, 2), "fps": fps,
        "width": int(first.shape[1]), "height": int(first.shape[0]),
        "meanFrameChange": round(mean_change, 2),
        "changedPixelFraction": round(changed_pixels, 4),
        "mostlyBlack": mostly_black, "visibleMotion": visible_motion,
        "pass": not mostly_black and visible_motion,
    }


def resolve_asset(project_file, value):
    path = Path(value)
    return path.resolve() if path.is_absolute() else (project_file.parent / path).resolve()


def assemble(project_file, output):
    project_file = Path(project_file).resolve()
    project = json.loads(project_file.read_text(encoding="utf-8-sig"))
    shots = project.get("shots") or []
    if not shots:
        raise ValueError("Project has no shots.")
    clip_paths = []
    reports = []
    for shot in shots:
        if shot.get("approval") != "accepted":
            raise ValueError(f"Shot {shot.get('id')} must be reviewed and accepted before assembly.")
        if not shot.get("clipPath"):
            raise ValueError(f"Shot {shot.get('id')} has no generated clip.")
        clip = resolve_asset(project_file, shot["clipPath"])
        report = inspect_clip(clip)
        if not report["pass"]:
            raise ValueError(f"Shot {shot.get('id')} failed motion or visibility checks: {report}")
        clip_paths.append(clip)
        reports.append(report)
    dimensions = {(report["width"], report["height"], report["fps"]) for report in reports}
    if len(dimensions) != 1:
        raise ValueError("All accepted clips must have the same dimensions and frame rate.")

    output = Path(output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as temporary:
        listing = Path(temporary) / "clips.txt"
        listing.write_text("".join(f"file '{str(clip).replace(chr(39), chr(39)+chr(92)+chr(39)+chr(39))}'\n" for clip in clip_paths), encoding="utf-8")
        command = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", str(listing)]
        audio_tracks = project.get("audioTracks") or []
        for track in audio_tracks:
            audio_path = resolve_asset(project_file, track["path"])
            if not audio_path.is_file():
                raise FileNotFoundError(audio_path)
            command.extend(["-i", str(audio_path)])
        if audio_tracks:
            filters = []
            labels = []
            for index, track in enumerate(audio_tracks, start=1):
                delay_ms = max(0, round(float(track.get("startSeconds", 0)) * 1000))
                gain = float(track.get("gain", 1))
                label = f"a{index}"
                filters.append(f"[{index}:a]volume={gain},adelay={delay_ms}:all=1[{label}]")
                labels.append(f"[{label}]")
            filters.append("".join(labels) + f"amix=inputs={len(labels)}:duration=longest:normalize=0[mix]")
            command.extend(["-filter_complex", ";".join(filters), "-map", "0:v:0", "-map", "[mix]", "-c:a", "aac"])
        else:
            command.extend(["-map", "0:v:0", "-an"])
        command.extend(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-t", str(sum(r["durationSeconds"] for r in reports)), str(output)])
        subprocess.run(command, check=True, capture_output=True, text=True)
    return {"output": str(output), "shotCount": len(shots), "durationSeconds": round(sum(r["durationSeconds"] for r in reports), 2)}


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    quality = sub.add_parser("quality")
    quality.add_argument("clip")
    render = sub.add_parser("assemble")
    render.add_argument("project")
    render.add_argument("output")
    args = parser.parse_args()
    result = inspect_clip(args.clip) if args.command == "quality" else assemble(args.project, args.output)
    print(json.dumps(result, indent=2))
    if args.command == "quality" and not result["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
