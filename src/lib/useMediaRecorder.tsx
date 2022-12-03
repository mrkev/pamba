import { useEffect, useState } from "react";

export function useMediaRecorder(loadClip: (url: string, name?: string) => void) {
  const [mediaRecorder, setMediaRecorder] = useState<null | MediaRecorder>(null);

  // Microphone recording
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
      })
      .then(function (mediaStream: MediaStream) {
        let chunks: Array<BlobPart> = [];
        const mediaRecorder = new MediaRecorder(mediaStream);
        mediaRecorder.ondataavailable = function (e) {
          chunks.push(e.data);
        };
        mediaRecorder.onstop = function () {
          console.log("data available after MediaRecorder.stop() called.");
          const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
          chunks = [];
          const audioURL = window.URL.createObjectURL(blob);
          // audio.src = audioURL;
          loadClip(audioURL, "recording");
          console.log("recorder stopped");
        };
        setMediaRecorder(mediaRecorder);
      })
      .catch(console.error);
  }, [loadClip]);

  return mediaRecorder;
}
