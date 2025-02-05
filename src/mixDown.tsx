import { staticAudioContext } from "./constants";
import { AudioClip } from "./lib/AudioClip";

// Mixes clips
// from https://stackoverflow.com/questions/57155167/web-audio-api-playing-synchronized-sounds
export function mixDown(clipList: ReadonlyArray<AudioClip>, numberOfChannels = 2): AudioBuffer | null {
  performance.mark("START");
  if (clipList.length === 0) {
    return null;
  }

  // TODO: make start offset aware, so not all clips start at 0:00
  let totalLength = 0;
  for (const clip of clipList) {
    const end = clip.clipLengthFr() + clip.timelineStartFr();
    if (end > totalLength) {
      totalLength = end;
    }
  }

  //create a buffer using the totalLength and sampleRate of the first buffer node
  const finalMix = staticAudioContext().createBuffer(numberOfChannels, totalLength, clipList[0].sampleRate);

  // The spec doesn't quite specify if getChannelData() returns a reference or a
  // copy, so let's call it as little as possible just in case.
  // https://webaudio.github.io/web-audio-api/#dom-audiobuffer-getchanneldata

  //first loop for buffer list
  for (let i = 0; i < clipList.length; i++) {
    const clip = clipList[i];
    if (clip.buffer == null) {
      // clip of missing media
      continue;
    }
    // second loop for each channel ie. left and right
    for (let channel = 0; channel < numberOfChannels; channel++) {
      //here we get a reference to the final mix buffer data
      const buffer = finalMix.getChannelData(channel);
      // If it's mono audio, we just copy it to all channels
      const channelSrc = clip.buffer.numberOfChannels === 1 ? 0 : channel;
      const clipBuffer = clip.buffer.getChannelData(channelSrc);
      //last is loop for updating/summing the track buffer with the final mix buffer
      for (let j = 0; j < clip.clipLengthFr(); j++) {
        buffer[j + clip.timelineStartFr()] += clipBuffer[j + clip.bufferOffsetFr()];
      }
    }
  }

  performance.mark("END");
  performance.measure("foo", "START", "END");

  return finalMix;
}
