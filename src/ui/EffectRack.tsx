import React, { useEffect, useRef } from "react";
import { createUseStyles } from "react-jss";
import { useContainer, usePrimitive } from "structured-state";
import { EFFECT_HEIGHT } from "../constants";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import FaustEffectModule from "../dsp/ui/FaustEffectModule";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { ProjectSelection } from "../lib/project/ProjectSelection";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiTrack } from "../midi/MidiTrack";
import { exhaustive } from "../utils/exhaustive";
import { PambaWamNode } from "../wam/PambaWamNode";
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
  track: AudioTrack | MidiTrack;
  project: AudioProject;
  renderer: AudioRenderer;
}) {
  const styles = useStyles();
  const effects = useContainer(track.dsp.effects);
  const [selected] = useLinkedState(project.selected);
  const rackRef = useRef<HTMLDivElement | null>(null);
  const [isAudioPlaying] = usePrimitive(renderer.isAudioPlaying);

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
        {track instanceof MidiTrack && (
          <React.Fragment>
            <Effect
              canDelete={!isAudioPlaying}
              onClickRemove={() => {
                console.log("CANT REMOVE");
              }}
              onHeaderClick={() => console.log("TODO")}
              onClickBypass={() => console.log("TODO")}
              isSelected={false}
              title={"Instrument"}
            >
              <button onClick={() => appEnvironment.openEffects.add(track.instrument)}>Configure</button>
            </Effect>
            {"→"}
          </React.Fragment>
        )}

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
                    appEnvironment.openEffects.delete(effect);
                    AudioTrack.removeEffect(track, effect);
                  }}
                  onHeaderClick={() => ProjectSelection.selectEffect(project, effect, track)}
                  onClickBypass={() => AudioTrack.bypassEffect(track, effect)}
                  isSelected={selected?.status === "effects" && selected.test.has(effect)}
                  title={effect.name}
                >
                  <button onClick={() => appEnvironment.openEffects.add(effect)}>Configure</button>
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
