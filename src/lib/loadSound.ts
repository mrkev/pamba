// Load the audio from the URL via Ajax and store it in global variable audioData
// Note that the audio load is asynchronous
export async function loadSound(
  audioContext: AudioContext,
  url: string
): Promise<AudioBuffer> {
  return new Promise(function (res, onError) {
    // document.getElementById("msg").textContent = "Loading audio...";
    let request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    // When loaded, decode the data and play the sound
    request.onload = function () {
      audioContext.decodeAudioData(
        request.response,
        function (buffer) {
          // document.getElementById("msg").textContent =
          //   "Audio sample download finished";
          res(buffer);
          // playSound(audioData);
        },
        onError
      );
    };
    request.send();
  });
}
