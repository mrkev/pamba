import React, { useCallback, useMemo, useState } from "react";
import { useLinkedState } from "../lib/state/LinkedState";
// import { TrackThread } from "../lib/TrackThread";
// import { MidiDemo } from "../midi";
import "remixicon/fonts/remixicon.css";
import { appEnvironment } from "../lib/AppEnvironment";
import { useLinkedSet } from "../lib/state/LinkedSet";
import { MidiInstrument } from "../midi/MidiInstrument";
import { PambaWamNode } from "../wam/PambaWamNode";
import { AppProject } from "./AppProject";
import { ConfirmDialog } from "./ConfirmDialog";
import { PambaWamNodeWindowPanel } from "./PambaWamNodeWindowPanel";
import { utility } from "./utility";
import { useDocumentEventListener } from "./useEventListener";

// var w = new TrackThread();
// var sab = new SharedArrayBuffer(1024);
// var arr = new Int32Array(sab);
// w.postMessage({ kind: "set", sab });

const NON_PASSIVE = { passive: false };

export function App(): React.ReactElement {
  const [projectStatus] = useLinkedState(appEnvironment.projectStatus);
  const [openEffects] = useLinkedSet(appEnvironment.openEffects);
  const [showApp, setShowApp] = useState(false);

  useDocumentEventListener(
    "wheel",
    useCallback((e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    }, []),
    NON_PASSIVE,
  );

  if (!showApp || projectStatus.status === "loading") {
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
          <li>Undo is turbo-broken.</li>
          <li>Ocassionaly, clicking clips appends-to instead of replacing selection.</li>
          <li>Moving a clip to a locked track deletes the clip.</li>
          <li>Deleting a selection of multiple clips might not delete all of them.</li>
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
        {projectStatus.status === "loading" ? (
          <>
            {/* <progress>Loading</progress>{" "} */}
            <button className={utility.button} disabled>
              Loading...
            </button>
          </>
        ) : (
          <button className={utility.button} onClick={() => setShowApp(true)}>
            Continue
          </button>
        )}
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
        <AppProject project={projectStatus.project} />
      </>
    );
  }
}

const changelog = `
dev
- cmd+L to loop selection

v0.1.3
- saved recorded audio no longer crashes everything on load
- added loop brace (breaks existing projects)

v0.1.2
- added changelog. warning: it will be of dubious quality
- can undo clip name change
- data structure changes

v0.1.1
- added Faust effect: pitch_shifter
`;
