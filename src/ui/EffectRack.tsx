import React, { useEffect, useRef } from "react";
import FaustEffectModule from "../dsp/ui/FaustEffectModule";
import { EFFECT_HEIGHT } from "../globals";
import { AudioProject, ProjectSelection } from "../lib/AudioProject";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useLinkedState } from "../lib/state/LinkedState";
import { css } from "@linaria/core";

const styles = {
  effectRack: css`
    ${{
      color: "white",
      background: "#444",
      display: "flex",
      flexDirection: "row",
      alignItems: "stretch",
      // to keep the selection div from showing above this effect track
      zIndex: 1,
      // So it "sticks" when we scroll the timeline
      position: "sticky",
      left: "0",
      overscrollBehavior: "none",
      overflowX: "scroll",
      padding: "6px 25% 11px 4px",
      gap: "4px",
    }}
  `,
} as const;

export const EffectRack = React.memo(function EffectRack({
  track,
  project,
  renderer,
}: {
  track: AudioTrack;
  project: AudioProject;
  renderer: AudioRenderer;
}) {
  const [effects] = useLinkedArray(track.effects);
  const [selected] = useLinkedState(project.selected);
  const rackRef = useRef<HTMLDivElement | null>(null);
  const [isAudioPlaying] = useLinkedState(renderer.isAudioPlaying);

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
              isSelected={selected?.status === "effects" && selected.test.has(effect)}
            />
            {"→"}
          </React.Fragment>
        );
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

      {/* <button onClick={() => track.addEffect(FAUST_EFFECTS.PANNER)}>add panner</button>
            <button onClick={() => track.addEffect(FAUST_EFFECTS.REVERB)}>add reverb</button> */}
    </div>
  );
});
