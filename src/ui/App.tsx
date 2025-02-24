import React, { useCallback, useState } from "react";
// import { TrackThread } from "../lib/TrackThread";
import "remixicon/fonts/remixicon.css";
import { usePrimitive } from "structured-state";
import { appEnvironment } from "../lib/AppEnvironment";
import { ProjectPersistance } from "../lib/ProjectPersistance";
import { useLinkedSet } from "../lib/state/LinkedSet";
import { MidiInstrument } from "../midi/MidiInstrument";
import { PambaWamNode } from "../wam/PambaWamNode";
import { AppProject } from "./AppProject";
import { ConfirmDialog } from "./ConfirmDialog";
import { PambaWamNodeWindowPanel } from "./PambaWamNodeWindowPanel";
import { PromptDialog } from "./PromptDialog";
import { changelog } from "./changelog";
import { useDocumentEventListener } from "./useEventListener";
import { utility } from "./utility";

// var w = new TrackThread();
// var sab = new SharedArrayBuffer(1024);
// var arr = new Int32Array(sab);
// w.postMessage({ kind: "set", sab });

const NON_PASSIVE = { passive: false };

export function App(): React.ReactElement {
  const [projectStatus] = usePrimitive(appEnvironment.projectStatus);
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
        <img src="/logo.svg" alt="mini daw" height="40" width="auto" style={{ marginRight: "8px" }} />v{__APP_VERSION__}{" "}
        (alpha)
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
          <li>Navigation is very trackpad-based: panning, pinch to zoom, etc.</li>
          <li>Drag-drop is widely supported.</li>
        </ul>
        ## Known Bugs
        <ul style={{ listStyleType: "'- '", width: "56ch", whiteSpace: "normal", paddingInlineStart: "2ch" }}>
          <li>Not all actions can be undone.</li>
          <li>Ocassionaly, clicking clips appends-to instead of replacing selection.</li>
          <li>Effects added during playback are applied on next playback, or might not be applied at all.</li>
          <li>
            Moving clips across tracks is buggy:
            <ul>
              <li>Moving clips to a locked track deletes the clip.</li>
              <li>Moving clips across tracks might prevent them from being moved back.</li>
            </ul>
          </li>
          <li>
            Found any others?{" "}
            <a href="https://github.com/mrkev/web-daw-issues/issues" style={{ color: "white" }}>
              Let me know
            </a>
            .
          </li>
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
        {/* <AppLoadingProgress /> */}
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
            return (
              <PambaWamNodeWindowPanel key={i} effect={effect.pambaWam} onClose={() => openEffects.delete(effect)} />
            );
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
  const [clicked, setClicked] = useState(false);

  if (clicked) {
    return (
      <>
        <button className={utility.button} disabled>
          Loading...
        </button>
      </>
    );
  } else {
    return (
      <>
        <button
          className={utility.button}
          onClick={async () => {
            setClicked(true);
            await appEnvironment.readyPromise; // resolves when done initializing
            appEnvironment.projectStatus.set({ status: "loading" });
            // ignorePromise(init());
            console.log("HERE");
            await ProjectPersistance.openLastProject(appEnvironment.localFiles);
          }}
        >
          Continue
        </button>
      </>
    );
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
