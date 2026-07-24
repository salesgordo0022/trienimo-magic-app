// Placeholder SVG shown when a GIF fails to load.
export const EXERCISE_GIF_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f4f4f5"/><g fill="none" stroke="#a1a1aa" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="100" cy="70" r="16"/><path d="M70 120 l30 -20 l30 20"/><path d="M60 160 l40 -40 l40 40"/></g><text x="100" y="185" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#71717a">sem imagem</text></svg>`,
  );

export function onGifError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.src !== EXERCISE_GIF_FALLBACK) img.src = EXERCISE_GIF_FALLBACK;
}
