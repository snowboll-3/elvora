export function speak(text, lang = (navigator.language || "en-US")) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = 1; u.pitch = 1;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch {}
}
