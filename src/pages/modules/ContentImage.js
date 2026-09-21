import React, { useEffect, useState } from "react";
import { useOSMode } from "../../context/ModeContext.js";
import { OS_MODES } from "../../core/os/modes.js";

const styles = [
  { value: "cinematic anime fantasy", label: "Cinematic anime fantasy" },
  { value: "western animated adventure, expressive 2D character design", label: "2D cartoon adventure" },
  { value: "cinematic live action, natural skin and fabric detail", label: "Cinematic live action" },
  { value: "graphic novel illustration, dramatic ink and painted color", label: "Graphic novel" },
];

export default function ContentImage() {
  const { setMode } = useOSMode();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(styles[0].value);
  const [aspect, setAspect] = useState("landscape");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [motionPrompt, setMotionPrompt] = useState("The character raises their hands as energy gathers; hair and clothing move in the cave breeze; slow cinematic camera push.");
  const [videoResult, setVideoResult] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setMode(OS_MODES.CONTENT), [setMode]);

  async function generate(event) {
    event.preventDefault();
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/ai-image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt, style, aspect }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Image generation failed.");
      setResult(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setGenerating(false);
    }
  }

  async function animateImage() {
    setAnimating(true);
    setError("");
    setVideoResult(null);
    try {
      const response = await fetch("/api/cinematic-video/local-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: motionPrompt,
          style,
          generatedImageUrl: result.publicUrl,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Video generation failed.");
      setVideoResult(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAnimating(false);
    }
  }

  return (
    <div className="os-panel os-page-enter w-full min-h-full p-4 md:p-6 text-white">
      <div className="max-w-7xl mx-auto">
        <header className="rounded-3xl border border-cyan-400/20 bg-slate-950/70 p-6 mb-5">
          <p className="text-xs font-black tracking-widest text-cyan-300 uppercase">Creator Studio · Local Generative Art</p>
          <h1 className="text-3xl md:text-5xl font-black mt-2">Image Studio</h1>
          <p className="text-slate-300 mt-2 max-w-3xl">
            Generate original anime, cartoon, concept-art, or live-action keyframes on your connected Aigenikz PC worker.
          </p>
        </header>

        <div className="grid lg:grid-cols-[420px_1fr] gap-5">
          <form onSubmit={generate} className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2" htmlFor="image-prompt">Creative direction</label>
              <textarea id="image-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)}
                minLength={3} maxLength={3000} required rows={11}
                placeholder="Describe the characters, action, environment, lighting, composition, and mood..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm text-white outline-none focus:border-cyan-400" />
            </div>
            <label className="block text-sm font-bold">
              Style
              <select value={style} onChange={(event) => setStyle(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white">
                {styles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold">
              Canvas
              <select value={aspect} onChange={(event) => setAspect(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white">
                <option value="landscape">Landscape · 4:3</option>
                <option value="portrait">Portrait · 3:4</option>
                <option value="square">Square · 1:1</option>
              </select>
            </label>
            <button type="submit" disabled={generating || prompt.trim().length < 3}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-4 font-black disabled:opacity-40">
              {generating ? "Generating on your PC…" : "Generate original image"}
            </button>
            <p className="text-xs text-slate-400">
              The first run downloads the model. Your PC must be on and connected; generation can take several minutes on an 8 GB GPU.
            </p>
          </form>

          <section className="min-h-[560px] rounded-3xl border border-white/10 bg-slate-950/60 p-5 flex items-center justify-center">
            {generating && <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-cyan-300/20 border-t-cyan-300 animate-spin" />
              <h2 className="text-xl font-black">Creating a real model-generated image</h2>
              <p className="text-sm text-slate-400 mt-2">The studio will not substitute a placeholder.</p>
            </div>}
            {!generating && error && <div className="max-w-xl rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-red-200">
              <h2 className="font-black">Generation did not complete</h2>
              <p className="text-sm mt-2">{error}</p>
            </div>}
            {!generating && result && <div className="w-full">
              <img src={result.publicUrl} alt="Aigenikz generated artwork"
                className="max-h-[680px] w-full rounded-2xl object-contain bg-black" />
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <div>
                  <p className="font-bold">Generated by {result.model}</p>
                  <p className="text-xs text-slate-400">Seed {result.seed} · no fallback used</p>
                </div>
                <a href={result.publicUrl} download className="rounded-xl border border-cyan-300/40 px-4 py-2 font-bold text-cyan-200">Download PNG</a>
              </div>
              <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                <label className="block text-sm font-bold">
                  Motion direction
                  <textarea value={motionPrompt} onChange={(event) => setMotionPrompt(event.target.value)}
                    rows={3} maxLength={1200}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" />
                </label>
                <button type="button" onClick={animateImage} disabled={animating || !motionPrompt.trim()}
                  className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-3 font-black disabled:opacity-40">
                  {animating ? "Generating real character motion…" : "Animate this image with LTX"}
                </button>
              </div>
              {videoResult && <div className="mt-4">
                <video src={videoResult.videoUrl} controls className="w-full rounded-2xl bg-black" />
                <p className="mt-2 text-xs text-slate-400">{Number(videoResult.duration || 0).toFixed(1)} seconds · {videoResult.model} · passed motion validation</p>
              </div>}
            </div>}
            {!generating && !error && !result && <div className="text-center text-slate-400">
              <div className="text-6xl mb-4">✦</div>
              <h2 className="text-2xl font-black text-white">Describe your first image</h2>
              <p className="mt-2">Your result will appear here when the local model finishes.</p>
            </div>}
          </section>
        </div>
      </div>
    </div>
  );
}
