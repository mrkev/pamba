class MixDownProcessor extends AudioWorkletProcessor {
  // inputs, channels, samples
  process(inputs, outputs, parameters) {
    // only output to the first output
    const output = outputs[0];
    // console.log("a");

    // debugger;

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];

      for (let c = 0; c < input.length; c++) {
        const channel = input[c];

        for (let s = 0; s < channel.length; s++) {
          const sample = channel[s];

          output[c][s] += sample;
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
    return true;
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
