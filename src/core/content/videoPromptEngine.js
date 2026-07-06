export function buildVideoPrompt(content) {
  return `
Cinematic short-form video.

Scene:
${content.slice(0, 500)}

Style:
- Realistic
- High contrast
- Viral TikTok pacing
- Smooth transitions
- 4K detail

Camera:
- Close-up → wide → dynamic motion

Lighting:
- Dramatic highlights
- Clean shadows

Mood:
- Engaging, fast-paced, emotional
`;
}