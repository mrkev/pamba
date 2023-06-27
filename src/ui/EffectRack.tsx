import React, { useEffect, useRef } from "react";
import { createUseStyles } from "react-jss";
import { EFFECT_HEIGHT } from "../constants";
import { DSPNode } from "../dsp/DSPNode";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import FaustEffectModule from "../dsp/ui/FaustEffectModule";
import { AudioProject, ProjectSelection } from "../lib/AudioProject";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useNewLinkedSet } from "../lib/state/LinkedSet";
import { useLinkedState } from "../lib/state/LinkedState";
import { exhaustive } from "../utils/exhaustive";
import { PambaWamNode } from "../wam/PambaWamNode";
import { WindowPanel } from "../wam/WindowPanel";
import { WamPluginContent } from "../wam/wam";
import { Effect } from "./Effect";

const useStyles = createUseStyles({
  effectRack: {
    color: "white",
    background: "rgba(23, 23, 23, 0.7)",
    display: "flex",
    flexDirection: "row",
    alignItems: "stretch",
    // to keep the selection div from showing above this effect track
    zIndex: 1,
    // So it "sticks" when we scroll the timeline
    position: "sticky",
    left: "0",
    overscrollBehavior: "contain",
    overflowX: "scroll",

    padding: "6px 25% 11px 4px",
    gap: "4px",
  },
});

export const EffectRack = React.memo(function EffectRack({
  track,
  project,
  renderer,
}: {
  track: AudioTrack;
  project: AudioProject;
  renderer: AudioRenderer;
}) {
  const styles = useStyles();
  const [effects] = useLinkedArray(track.effects);
  const [selected] = useLinkedState(project.selected);
  const rackRef = useRef<HTMLDivElement | null>(null);
  const [isAudioPlaying] = useLinkedState(renderer.isAudioPlaying);
  const openEffects = useNewLinkedSet<DSPNode>();

  useEffect(() => {
    const div = rackRef.current;
    if (div == null) {
      return;
    }

    const onWheel = function (e: WheelEvent) {
      e.stopPropagation();
    };
    div.addEventListener("wheel", onWheel, { capture: true });
    return () => {
      div.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, []);

  return (
    <>
      {/* RENDER WAM WINDOWS OUT HERE */}
      {effects.map((effect, i) => {
        if (effect instanceof PambaWamNode && openEffects.has(effect)) {
          return <PambaWamNodeWindowPanel key={i} effect={effect} onClose={() => openEffects.delete(effect)} />;
        } else {
          return null;
        }
      })}
      <div
        style={{
          height: EFFECT_HEIGHT,
        }}
        className={styles.effectRack}
        onMouseDownCapture={(e) => {
          e.stopPropagation();
        }}
        ref={rackRef}
      >
        {"↳"}
        {effects.map((effect, i) => {
          if (effect instanceof FaustAudioEffect) {
            return (
              <React.Fragment key={i}>
                <FaustEffectModule
                  canDelete={!isAudioPlaying}
                  effect={effect}
                  style={{
                    alignSelf: "stretch",
                    margin: "2px",
                    borderRadius: "2px",
                  }}
                  onClickRemove={() => AudioTrack.removeEffect(track, effect)}
                  onHeaderClick={() => ProjectSelection.selectEffect(project, effect, track)}
                  onClickBypass={() => AudioTrack.bypassEffect(track, effect)}
                  isSelected={selected?.status === "effects" && selected.test.has(effect)}
                />
                {"→"}
              </React.Fragment>
            );
          }

          if (effect instanceof PambaWamNode) {
            return (
              <React.Fragment key={i}>
                <Effect
                  canDelete={!isAudioPlaying}
                  onClickRemove={() => {
                    openEffects.delete(effect);
                    AudioTrack.removeEffect(track, effect);
                  }}
                  onHeaderClick={() => ProjectSelection.selectEffect(project, effect, track)}
                  onClickBypass={() => AudioTrack.bypassEffect(track, effect)}
                  isSelected={selected?.status === "effects" && selected.test.has(effect)}
                  title={effect.name}
                >
                  <button onClick={() => openEffects.add(effect)}>Configure</button>
                </Effect>
                {"→"}
              </React.Fragment>
            );
          }

          return exhaustive(effect);
        })}

        <div
          style={{
            alignSelf: "stretch",
            margin: "2px",
            borderRadius: "2px",
            background: "gray",
            border: "1px solid #333",
            padding: 4,
            fontSize: "14px",
          }}
        >
          Output
          {/* <meter
              style={{ transform: "rotate(270deg)" }}
              id="fuel"
              min="0"
              max="100"
              low={33}
              high={66}
              optimum={80}
              value="50"
            >
              at 50/100
            </meter> */}
        </div>
      </div>
    </>
  );
});

function PambaWamNodeWindowPanel({ effect, onClose }: { effect: PambaWamNode; onClose: () => void }) {
  const [position, setPosition] = useLinkedState(effect.windowPanelPosition);
  return (
    <WindowPanel onClose={onClose} title={effect.name} position={position} onPositionChange={setPosition}>
      <WamPluginContent wam={effect} />
    </WindowPanel>
  );
}
