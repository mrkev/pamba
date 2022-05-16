export class TrackThread {
  private worker = new Worker("track-worker.js");
  constructor() {
    this.worker.addEventListener("message", this.onMessageRecieved);
  }

  private onMessageRecieved(event: MessageEvent) {
    console.log("TrackWorker:", event.data);
  }

  postMessage(m: TrackThreadMessage) {
    this.worker.postMessage(m);
  }
}
type TrackThreadMessage =
  | {
      kind: "set";
      sab: SharedArrayBuffer | Int32Array;
    }
  | {
      kind: "log";
    }
  | {
      kind: "ping";
      message: string;
    };
