import { AudioContext, AudioWorkletNode } from "standardized-audio-context-mock";
import { vi } from "vitest";

const AudioContextMock = vi.fn(() => {
  return new AudioContext();
});

const AudioWorkletNodeMock = vi.fn(() => {
  return new AudioWorkletNode({
    channelCount: 2,
    channelCountMode: "max",
    channelInterpretation: "speakers",
    numberOfInputs: 2,
    numberOfOutputs: 2,
    context: new AudioContext(),
  });
});

vi.stubGlobal("AudioWorkletNode", AudioWorkletNodeMock);
vi.stubGlobal("AudioContext", AudioContextMock);
