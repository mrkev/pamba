import React, { useCallback, useState } from "react";
import { FAUST_EFFECTS } from "../dsp/Faust";
import FaustEffectModule from "../dsp/FaustEffectModule";
import { CLIP_HEIGHT, EFFECT_HEIGHT, TRACK_SEPARATOR_HEIGHT } from "../globals";
import { AudioClip } from "../lib/AudioClip";
import { AudioProject } from "../lib/AudioProject";
import { AudioTrack } from "../lib/AudioTrack";
import { useDerivedState } from "../lib/DerivedState";
import { useLinkedArray } from "../lib/LinkedArray";
import { useLinkedState } from "../lib/LinkedState";
import { pressedState } from "../lib/linkedState/pressedState";
import { Clip } from "./Clip";

export function Track({
  track,
  project,
  isDspExpanded,
}: {
  track: AudioTrack;
  project: AudioProject;
  isDspExpanded: boolean;
}): React.ReactElement {
  const [pressed, setPressed] = useLinkedState(pressedState);
  const [selected] = useLinkedState(project.selected);
  const [tool] = useLinkedState(project.pointerTool);
  const secsToPx = useDerivedState(project.secsToPx);
  const [effects] = useLinkedArray(track.effects);
  const [clips] = useLinkedArray(track.clips);
  const [, setStateCounter] = useState(0);
  const rerender = useCallback(function () {
    setStateCounter((x) => x + 1);
  }, []);

  const loadClipIntoTrack = useCallback(async (url: string, track: AudioTrack, name?: string): Promise<void> => {
    try {
      // load clip
      const clip = await AudioClip.fromURL(url, name);
      track.pushClip(clip);
    } catch (e) {
      console.trace(e);
      return;
    }
  }, []);

  return (
    <>
      <div
        onDrop={function (ev) {
          ev.preventDefault();
          const url = ev.dataTransfer.getData("text");
          loadClipIntoTrack(url, track);
        }}
        onDragOver={function allowDrop(ev) {
          ev.preventDefault();
        }}
        onMouseEnter={function () {
          // console.log("Hovering over", i);
          if (pressed && pressed.status === "moving_clip") {
            setPressed((prev) => Object.assign({}, prev, { track }));
          }
        }}
        onMouseUp={() => {
          // console.log("COOl");
        }}
        style={{
          position: "relative",
          height: CLIP_HEIGHT - TRACK_SEPARATOR_HEIGHT,
          // pointerEvents: "none",
        }}
      >
        {clips.map((clip, i) => {
          if (pressed && pressed.status === "moving_clip" && pressed.track !== track && pressed.clip === clip) {
            return null;
          }

          const isSelected = selected !== null && selected.status === "clips" && selected.test.has(clip);

          return (
            <Clip
              key={i}
              clip={clip}
              tool={tool}
              rerender={rerender}
              isSelected={isSelected}
              track={track}
              project={project}
              style={{
                position: "absolute",
                left: secsToPx(clip.startOffsetSec),
              }}
            />
          );
        })}
        {/* RENDER CLIP BEING MOVED */}
        {pressed && pressed.status === "moving_clip" && pressed.track === track && (
          <Clip
            clip={pressed.clip}
            tool={tool}
            rerender={rerender}
            isSelected={true}
            project={project}
            track={null}
            style={{
              position: "absolute",
              left: secsToPx(pressed.clip.startOffsetSec),
            }}
          />
        )}
      </div>
      {/* EFFECT RACK */}
      {isDspExpanded && (
        <div
          style={{
            color: "white",
            height: EFFECT_HEIGHT,
            background: "#444",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            // to keep the selection div from showing above this effect track
            zIndex: 1,
            // So it "sticks" when we scroll the timeline
            position: "sticky",
            left: "0",
          }}
          onMouseDownCapture={(e) => {
            e.stopPropagation();
          }}
        >
          {"↳"}
          {effects.map((effect, i) => {
            return (
              <React.Fragment key={i}>
                <FaustEffectModule
                  effect={effect}
                  style={{
                    alignSelf: "stretch",
                    margin: "2px",
                    borderRadius: "2px",
                  }}
                  onClickRemove={(effect) => {
                    track.effects.remove(effect);
                  }}
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
          </div>

          {<button onClick={() => track.addEffect(FAUST_EFFECTS.PANNER)}>add panner</button>}
          {<button onClick={() => track.addEffect(FAUST_EFFECTS.REVERB)}>add reverb</button>}
        </div>
      )}

      {/* Bottom border */}
      <div
        style={{
          height: TRACK_SEPARATOR_HEIGHT,
          width: "100%",
          background: "#BABABA",
          // to keep the selection div from showing above this effect track
          // So it "sticks" when we scroll the timeline
          position: "sticky",
          left: "0",
          pointerEvents: "none",
        }}
      ></div>
    </>
  );
}
