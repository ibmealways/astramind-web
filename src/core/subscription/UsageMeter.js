export function estimateVideoCredits(durationTarget = 60) {
  const duration = Math.min(Math.max(Number(durationTarget) || 60, 5), 600);
  return Math.max(20, Math.ceil(duration / 5) * 20);
}

export default { estimateVideoCredits };
