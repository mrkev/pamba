// onmessage = function (ev) {
//   console.log(ev.data); // prints "hi"
//   postMessage("ho"); // sends "ho" back to the creator
// };

class TrackWorker {
  // buffer /*: SharedArrayBuffer */;

  onMessageRecieved(event /*: MessageEvent*/) {
    const { kind } = event.data; // TrackWorkerMessage
    switch (kind) {
      case "set": {
        const sharedArray = new Int32Array(event.data.sab);
        this.buffer = sharedArray;
        for (let i = 0; i < 10; i++) {
          const arrayValue = Atomics.load(sharedArray, i);
          console.log(`The item at array index ${i} is ${arrayValue}`);
        }
        break;
      }
      case "log": {
        for (let i = 0; i < 10; i++) {
          const arrayValue = Atomics.load(this.buffer, i);
          console.log(`The item at array index ${i} is ${arrayValue}`);
        }
        break;
      }
      case "ping": {
        this.postMessage("hi");
        break;
      }
      default:
        break;
    }
  }
}

const worker = new TrackWorker();

// worker.js
this.addEventListener("message", worker.onMessageRecieved);
