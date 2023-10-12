import { WamNode, WebAudioModule } from "@webaudiomodules/api";
import { useState } from "react";
import { liveAudioContext } from "../constants";
import nullthrows from "../utils/nullthrows";
import { MidiInstrument } from "./MidiInstrument";
import { MidiTrack } from "./MidiTrack";
import { appEnvironment } from "../lib/AppEnvironment";

let keyboardInstance: WebAudioModule<WamNode>;

export function MidiDemo() {
  const [state, setState] = useState<null | "ready" | "playing">(null);
  return (
    <button
      onClick={async () => {
        if (state == null) {
          [keyboardInstance] = await startHost();
          setState("ready");
        }

        if (state === "ready") {
          console.log("PLAY", keyboardInstance);
          nullthrows(keyboardInstance).audioNode.scheduleEvents({
            type: "wam-transport",
            data: {
              playing: true,
              timeSigDenominator: 4,
              timeSigNumerator: 4,
              currentBar: 0,
              currentBarStarted: liveAudioContext.currentTime,
              tempo: 120,
            },
          });
          setState("playing");
        }

        if (state === "playing") {
          console.log("STOP");
          nullthrows(keyboardInstance).audioNode.scheduleEvents({
            type: "wam-transport",
            data: {
              playing: false,
              timeSigDenominator: 4,
              timeSigNumerator: 4,
              currentBar: 0,
              currentBarStarted: liveAudioContext.currentTime,
              tempo: 120,
            },
          });
          setState("ready");
        }

        if (liveAudioContext.state === "running") {
          // liveAudioContext.suspend();
          // btnStart.textContent = "Start";
        } else {
          // liveAudioContext.resume();
          // btnStart.textContent = "Stop";
          // keyboardInstance.audioNode.scheduleEvents({
          //   type: "wam-transport",
          //   data: {
          //     playing: true,
          //     timeSigDenominator: 4,
          //     timeSigNumerator: 4,
          //     currentBar: 0,
          //     currentBarStarted: liveAudioContext.currentTime,
          //     tempo: 120,
          //   },
          // });
        }
      }}
    >
      Demo {state}
    </button>
  );
}

/**
 * Self-invoking asynchronous function to initialize the host.
 */
async function startHost() {
  const obxd = await MidiInstrument.createFromUrl(
    nullthrows(appEnvironment.wamHostGroup.get())[0],
    "https://mainline.i3s.unice.fr/wam2/packages/obxd/index.js",
    liveAudioContext,
  );
  const track = await MidiTrack.createWithInstrument(obxd, "midi track");

  let gain = liveAudioContext.createGain();
  let pluginDom2 = await obxd.module.createGui();

  obxd.module.audioNode.connect(gain);
  gain.connect(liveAudioContext.destination);
  obxd.module.audioNode.connect(track.pianoRoll.audioNode);
  track.pianoRoll.audioNode.connectEvents(obxd.module.instanceId);

  /**
   * Mount the plugins to the host.
   */
  const mount2 = nullthrows(document.querySelector("#mount2"));
  mount2.innerHTML = "";
  await mount2.appendChild(pluginDom2);

  const mount1 = nullthrows(document.querySelector("#mount1"));
  mount1.innerHTML = "";
  // TODO
  // await mount1.appendChild(track.pianoRollDom);
  // console.log(track.pianoRollDom);

  return [track.pianoRoll];
}
