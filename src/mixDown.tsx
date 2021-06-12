import { audioContext } from "./globals";
import { AudioClip } from "./AudioClip";

// from https://stackoverflow.com/questions/57155167/web-audio-api-playing-synchronized-sounds
export function mixDown(clipList: Array<AudioClip>, numberOfChannels = 2) {
  // TODO: make start offset aware, so not all clips start at 0:00
  let totalLength = 0;
  for (let clip of clipList) {
    const end = clip.durationFr + clip.startOffsetFr;
    if (end > totalLength) {
      totalLength = end;
    }
  }

  console.log("TOTAL", totalLength);

  //create a buffer using the totalLength and sampleRate of the first buffer node
  let finalMix = audioContext.createBuffer(
    numberOfChannels,
    totalLength,
    clipList[0].sampleRate
  );

  //first loop for buffer list
  for (let i = 0; i < clipList.length; i++) {
    const clip = clipList[i];

    // second loop for each channel ie. left and right
    for (let channel = 0; channel < numberOfChannels; channel++) {
      //here we get a reference to the final mix buffer data
      let buffer = finalMix.getChannelData(channel);
      //last is loop for updating/summing the track buffer with the final mix buffer
      for (let j = 0; j < clip.durationFr; j++) {
        // If it's mono audio, we just copy it to all channels
        const channelSrc = clip.numberOfChannels === 1 ? 0 : channel;
        buffer[j + clip.startOffsetFr] +=
          clip.buffer.getChannelData(channelSrc)[j + clip.startPosFr];
      }
    }
  }

  return finalMix;
}
