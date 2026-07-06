export function startListening(onResult) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.lang = "en-US";

  recognition.onresult = (e) => {
    const transcript = e.results[e.results.length - 1][0].transcript;
    if (transcript.toLowerCase().includes("chappy")) {
      onResult(transcript.replace("chappy", "").trim());
    }
  };

  recognition.start();
}
