import { boolean, string } from "structured-state";
import { CANVAS_HEIGHT, CANVAS_WIDTH, liveAudioContext, sampleSize } from "../constants";
import { DSPStep } from "../dsp/DSPStep";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";

/**
 * Given a canvas, draws an oscilloscope waveform on it
 */
export class OscilloscopeNode implements DSPStep<TrackedAudioNode> {
  readonly effectId: string = "OscilloscopeNode";
  readonly name = string("OscilloscopeNode");
  readonly bypass = boolean(false);

  public cloneToOfflineContext(_: OfflineAudioContext): Promise<DSPStep<TrackedAudioNode> | null> {
    throw new Error("OscilloscopeNode: cloneToOfflineContext: Method not implemented.");
  }

  private readonly amplitudeArray: Uint8Array = new Uint8Array();
  private readonly analyserNode = TrackedAudioNode.of(liveAudioContext().createAnalyser());
  private readonly javascriptNode = TrackedAudioNode.of(liveAudioContext().createScriptProcessor(sampleSize, 1, 1));
  public canvasCtx: CanvasRenderingContext2D | null = null;

  public inputNode(): TrackedAudioNode {
    return this.analyserNode;
  }

  public outputNode(): TrackedAudioNode {
    return this.javascriptNode;
  }

  constructor() {
    // Create the array for the data values
    this.amplitudeArray = new Uint8Array(this.analyserNode.get().frequencyBinCount);
    // Setup the event handler that is triggered every time enough samples have been collected
    // trigger the audio analysis and draw the results
    this.javascriptNode.get().onaudioprocess = this.onAduioProcess;
  }

  private onAduioProcess = () => {
    this.analyserNode.get().getByteTimeDomainData(this.amplitudeArray as any); // todo: as any?
    this.drawTimeDomain(this.amplitudeArray);
  };

  // y-axis: 128 is 0, 0 is -1, 255 is 1
  // x-axis: 1024 samples each time
  private drawTimeDomain(amplitudeArray: Uint8Array) {
    const ctx = this.canvasCtx;
    if (ctx == null) return;

    // let X_STEP = 1; //CANVAS_WIDTH / 1024;
    // let res = 1;
    // find the X_STEP that gives us a resolution
    // closest to 1. This way we can skip samples
    // and draw closer to just one sample per pixel
    // while (X_STEP * 2 < 1) {
    //   res *= 2;
    //   X_STEP *= 2;
    // }
    // ... / 2 because we want to show just half of the buffer
    const STEP_X = Math.floor(amplitudeArray.length / CANVAS_WIDTH) / 2;

    ctx.clearRect(0, 0, 2 * CANVAS_WIDTH, 2 * CANVAS_HEIGHT);
    ctx.beginPath();
    ctx.strokeStyle = "#ffffff";
    for (let i = 0; i < 2 * CANVAS_WIDTH; i += 1 * 2) {
      const value = amplitudeArray[i * STEP_X] / 255; // 0 -> .5 -> 1
      const y = 2 * CANVAS_HEIGHT * value;
      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }
    ctx.stroke();
  }
}
