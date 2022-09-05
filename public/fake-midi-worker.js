class FakeMidiWorker extends AudioWorkletProcessor {
  // inputs, channels, samples
  process(inputs, outputs, parameters) {
    // only output to the first output
    const output = outputs[0];

    // debugger;

    for (let inum = 0; inum < inputs.length; inum++) {
      const input = inputs[input];

      for (let cnum = 0; cnum < input.length; cnum++) {
        const channel = input[cnum];

        for (let snum = 0; snum < channel.length; snum++) {
          const sample = channel[snum];

          output[cnum][snum] += sample;
          // // If it's mono audio, we just copy it to all channels
          // const channelSrc = clip.numberOfChannels === 1 ? 0 : channel;
          // buffer[j + clip.startOffsetFr] +=
          //   clip.buffer.getChannelData(channelSrc)[j + clip.startPosFr];
        }
      }
    }

    // // fill each channel with random values multiplied by gain
    // output.forEach((channel) => {
    //   for (let i = 0; i < channel.length; i++) {
    //     // generate random value for each sample
    //     // Math.random range is [0; 1); we need [-1; 1]
    //     // this won't include exact 1 but is fine for now for simplicity
    //     channel[i] =
    //       (Math.random() * 2 - 1) *
    //       // the array can contain 1 or 128 values
    //       // depending on if the automation is present
    //       // and if the automation rate is k-rate or a-rate
    //       (parameters["customGain"].length > 1
    //         ? parameters["customGain"][i]
    //         : parameters["customGain"][0]);
    //   }
    // });
    // as this is a source node which generates its own output,
    // we return true so it won't accidentally get garbage-collected
    // if we don't have any references to it in the main thread
    // return true;
  }
  // define the customGain parameter used in process method
  // static get parameterDescriptors() {
  //   return [
  //     {
  //       name: "customGain",
  //       defaultValue: 1,
  //       minValue: 0,
  //       maxValue: 1,
  //       automationRate: "a-rate",
  //     },
  //   ];
  // }
}

registerProcessor("mix-down-processor", MixDownProcessor);
