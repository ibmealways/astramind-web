export async function runLocalAI({ message, creator }) {
  const name = creator?.name ? `, ${creator.name}` : "";
  return {
    reply: `I could not reach the cloud intelligence service${name}. Your message was saved in this session: "${String(message || "").slice(0, 240)}"`,
    source: "LOCAL_FALLBACK",
  };
}