window.say = function (text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = (navigator.language || "en").startsWith("hr") ? "hr-HR" : navigator.language || "en";
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch(e) {}
};
