import { useState } from "react";
import { liveAudioContext } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import nullthrows from "../utils/nullthrows";
import { MidiTrack } from "./MidiTrack";
import { MidiInstrument } from "./MidiInstrument";
import { WamNode, WebAudioModule } from "@webaudiomodules/api";

const plugin1Url = "./pianoroll/index.js";
const plugin2Url = "https://mainline.i3s.unice.fr/wam2/packages/obxd/index.js";

let keyboardInstance: WebAudioModule<WamNode>;

export function MidiDemo() {
  const [state, setState] = useState(0);
  return (
    <button
      onClick={async () => {
        if (state === 0) {
          [keyboardInstance] = await startHost();
          setState(1);
        }

        if (state === 1) {
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
  const obxd = await MidiInstrument.createFromUrl("https://mainline.i3s.unice.fr/wam2/packages/obxd/index.js");
  const track = await MidiTrack.createWithInstrument(obxd);

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
  await mount1.appendChild(track.pianoRollDom);

  return [track.pianoRoll];
}
