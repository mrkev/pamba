import { Tool } from "../App";
import { FaustModule, PannerFaustAudioEffect } from "../dsp/Faust";
import { CLIP_HEIGHT, EFFECT_HEIGHT } from "../globals";
import { AudioProject } from "../lib/AudioProject";
import { AudioTrack } from "../lib/AudioTrack";
import { useDerivedState } from "../lib/DerivedState";
import { useLinkedState } from "../lib/LinkedState";
import { pressedState } from "../lib/linkedState/pressedState";
import { Clip } from "./Clip";

export function Track({
  track,
  project,
  loadClipIntoTrack,
  tool,
  rerender,
  isDspExpanded,
}: {
  track: AudioTrack;
  project: AudioProject;
  loadClipIntoTrack: (
    url: string,
    track: AudioTrack,
    name?: string
  ) => Promise<void>;
  tool: Tool;
  rerender: () => void; // get rid of this
  isDspExpanded: boolean;
}): React.ReactElement {
  const [pressed, setPressed] = useLinkedState(pressedState);
  const [selected] = useLinkedState(project.selected);
  const secsToPx = useDerivedState(project.secsToPx);
  const [effects, setEffects] = useLinkedState(track.effects);

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
          borderBottom: "1px solid black",
          height: CLIP_HEIGHT,
        }}
      >
        {track.clips.map((clip, i) => {
          if (
            pressed &&
            pressed.status === "moving_clip" &&
            pressed.track !== track &&
            pressed.clip === clip
          ) {
            return null;
          }

          const isSelected =
            selected !== null &&
            selected.status === "clips" &&
            selected.test.has(clip);

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
        {pressed &&
          pressed.status === "moving_clip" &&
          pressed.track === track && (
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
            position: "relative",
            borderBottom: "1px solid black",
            height: EFFECT_HEIGHT,
            background: "#444",
            display: "flex",
            flexDirection: "row",
          }}
        >
          {effects.map((effect, i) => {
            return (
              <FaustModule
                key={i}
                ui={effect.ui}
                setParam={effect.node.setParam}
              />
            );
          })}
          Effects will go here
          {
            <button
              onClick={async function () {
                const effect = await PannerFaustAudioEffect.create();
                if (effect == null) {
                  return;
                }
                setEffects((prev) => prev.concat(effect));
              }}
            >
              add panner
            </button>
          }
        </div>
      )}
    </>
  );
}
