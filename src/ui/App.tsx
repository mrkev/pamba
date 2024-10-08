import React, { useCallback } from "react";
import { useLinkedState } from "../lib/state/LinkedState";
// import { TrackThread } from "../lib/TrackThread";
// import { MidiDemo } from "../midi";
import "remixicon/fonts/remixicon.css";
import { liveAudioContext } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import { useLinkedSet } from "../lib/state/LinkedSet";
import { MidiInstrument } from "../midi/MidiInstrument";
import { exhaustive } from "../utils/exhaustive";
import { ignorePromise } from "../utils/ignorePromise";
import { PambaWamNode } from "../wam/PambaWamNode";
import { AppProject } from "./AppProject";
import { ConfirmDialog } from "./ConfirmDialog";
import { PambaWamNodeWindowPanel } from "./PambaWamNodeWindowPanel";
import { PromptDialog } from "./PromptDialog";
import { changelog } from "./changelog";
import { useDocumentEventListener } from "./useEventListener";
import { utility } from "./utility";
import { ProjectPersistance } from "../lib/ProjectPersistance";

// var w = new TrackThread();
// var sab = new SharedArrayBuffer(1024);
// var arr = new Int32Array(sab);
// w.postMessage({ kind: "set", sab });

const NON_PASSIVE = { passive: false };

export function App(): React.ReactElement {
  const [projectStatus] = useLinkedState(appEnvironment.projectStatus);
  const [openEffects] = useLinkedSet(appEnvironment.openEffects);

  useDocumentEventListener(
    "wheel",
    useCallback((e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    }, []),
    NON_PASSIVE,
  );

  if (projectStatus.status !== "loaded") {
    return (
      <pre
        style={{
          padding: 48,
        }}
      >
        cephei v{__APP_VERSION__} (alpha)
        <br />
        ---
        <br />
        <p style={{ width: "56ch", whiteSpace: "normal" }}>
          This is an experiment by{" "}
          <a href="http://aykev.dev" style={{ color: "white" }}>
            Kevin Chavez
          </a>{" "}
          in building a DAW on the web. Is in active development. Expect many bugs.
        </p>
        ## Usage Notes
        <ul style={{ listStyleType: "'- '", width: "56ch", whiteSpace: "normal", paddingInlineStart: "2ch" }}>
          <li>Only Chrome is supported at the moment.</li>
          <li>All files are stored locally.</li>
          <li>
            <b>While on alpha, updates might break or delete files.</b>
          </li>
          <li>Pinch to zoom</li>
        </ul>
        ## Known Bugs
        <ul style={{ listStyleType: "'- '", width: "56ch", whiteSpace: "normal", paddingInlineStart: "2ch" }}>
          <li>Undo is pretty broken.</li>
          <li>Ocassionaly, clicking clips appends-to instead of replacing selection.</li>
          <li>Moving a clip to a locked track deletes the clip.</li>
          <li>Moving clips to different tracks locks them in that track.</li>
          <li>Opening projects might cause ticks in the timeline disappear.</li>
          <li>
            Found any others?{" "}
            <a href="https://github.com/mrkev/web-daw-issues/issues" style={{ color: "white" }}>
              Let me know
            </a>
            .
          </li>
          <li>Effects added during playback are applied on next playback, or might not be applied at all.</li>
        </ul>
        ## Get in Touch
        <p style={{ width: "56ch", whiteSpace: "normal" }}>
          - Twitter:{" "}
          <a href="https://twitter.com/aykev" style={{ color: "white" }}>
            @aykev
          </a>
          <br />- Bugs:{" "}
          <a href="https://github.com/mrkev/web-daw-issues/issues" style={{ color: "white" }}>
            https://github.com/mrkev/web-daw-issues/issues
          </a>
        </p>
        ---
        <br />
        <br />
        <InitButtion />
        <br />
        <details>
          <summary>Changelog</summary>
          {changelog}
        </details>
      </pre>
    );
  } else {
    (window as any).project = projectStatus.project;
    return (
      <>
        {/* RENDER WAM WINDOWS OUT HERE */}
        {[...openEffects.values()].map((effect, i) => {
          if (effect instanceof PambaWamNode) {
            return <PambaWamNodeWindowPanel key={i} effect={effect} onClose={() => openEffects.delete(effect)} />;
          }
          if (effect instanceof MidiInstrument) {
            return <PambaWamNodeWindowPanel key={i} effect={effect} onClose={() => openEffects.delete(effect)} />;
          }

          return null;
        })}
        {/* <MidiDemo /> */}
        <ConfirmDialog />
        <PromptDialog />
        <AppProject project={projectStatus.project} />
      </>
    );
  }
}

function InitButtion() {
  const [projectStatus] = useLinkedState(appEnvironment.projectStatus);

  switch (projectStatus.status) {
    case "idle":
      return (
        <button
          className={utility.button}
          onClick={async () => {
            await appEnvironment.readyPromise; //resolves when done initializing
            appEnvironment.projectStatus.set({ status: "loading" });
            // ignorePromise(init());
            await ProjectPersistance.openLastProject(appEnvironment.localFiles);
          }}
        >
          Continue
        </button>
      );
    case "loading":
      return (
        <>
          {/* <progress>Loading</progress>{" "} */}
          <button className={utility.button} disabled>
            Loading...
          </button>
        </>
      );
    case "loaded":
      return "loaded";

    default:
      exhaustive(projectStatus);
  }
}

// async function init() {
//   try {
//     await wait(1);
//     await appEnvironment.initAsync(liveAudioContext());
//   } catch (e) {
//     console.trace(e);
//   }
// }

// async function wait(ms: number) {
//   return new Promise((res) => setTimeout(res, ms));
// }
