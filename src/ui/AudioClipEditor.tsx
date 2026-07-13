import { useContainer, usePrimitive } from "structured-state";
import { AudioClip } from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { AnalizedPlayer } from "../lib/io/AnalizedPlayer";
import { AudioProject } from "../lib/project/AudioProject";
import { AudioClipBufferView } from "./AudioClipBufferView";
import { AudioClipPropsEditor, ClipPropsEditor } from "./ClipPropsEditor";
import { UtilityToggle } from "./UtilityToggle";
import { standardViewport } from "../lib/viewport/StandardViewport";

export function AudioClipEditor({
  clip,
  player,
  project,
  track,
}: {
  clip: AudioClip;
  track: AudioTrack;
  player: AnalizedPlayer;
  project: AudioProject;
}) {
  const [pxPerSec] = usePrimitive(clip.detailedViewport.pxPerSecond);
  const [lockPlayback] = usePrimitive(clip.detailedViewport.lockPlayback);

  useContainer(clip);

  const MIN_WAVEFORM_SCALE = 10;
  const MAX_WAVEFORM_SCALE = clip.sampleRate;

  return (
    <>
      <div className="flex flex-col items-stretch" style={{ gap: 4 }}>
        <ClipPropsEditor clip={clip} project={project} track={track} />
        <AudioClipPropsEditor clip={clip} project={project} />
      </div>
      {/* Waveform view */}
      <div className="flex flex-col grow overflow-hidden" style={{ gap: 4 }}>
        <div className="flex flex-row justify-end">
          <input
            type="range"
            value={Math.log(pxPerSec)}
            min={Math.log(10)}
            max={Math.log(clip.sampleRate)}
            step={0.01}
            onChange={(e) => {
              // const newVal = parseFloat(e.target.value);
              // clip.detailedViewport.pxPerSecond.set(Math.pow(2, newVal));

              const cursorPosSecs = project.cursorPos.get();
              const cursorPosPx = standardViewport.secsToViewportPx(clip.detailedViewport, cursorPosSecs, "pos");
              const projectDivWidth = project.viewport.projectDivWidth.get();
              const expectedNewScale = Math.exp(parseFloat(e.target.value));

              if (cursorPosPx < projectDivWidth && cursorPosPx > 0) {
                // if cursor is within view, resize around cursor
                standardViewport.setXScale(
                  clip.detailedViewport,
                  MIN_WAVEFORM_SCALE,
                  MAX_WAVEFORM_SCALE,
                  expectedNewScale,
                  cursorPosPx,
                );
              } else {
                // if cursor is outside the view, resize from the center
                standardViewport.setXScale(
                  clip.detailedViewport,
                  MIN_WAVEFORM_SCALE,
                  MAX_WAVEFORM_SCALE,
                  expectedNewScale,
                  Math.floor(projectDivWidth / 2),
                );
              }

              e.preventDefault();
              e.stopPropagation();
            }}
          />
          <UtilityToggle
            toggleStyle={{ backgroundColor: "orange" }}
            toggled={lockPlayback}
            onToggle={(val) => clip.detailedViewport.lockPlayback.set(val)}
            title={lockPlayback ? "lock playhead" : "unlock playhead"}
          >
            <i className="ri-text-spacing"></i>
          </UtilityToggle>
        </div>

        <AudioClipBufferView
          clip={clip}
          project={project}
          player={player}
          minScale={MIN_WAVEFORM_SCALE}
          maxScale={MAX_WAVEFORM_SCALE}
        />
      </div>
    </>
  );
}
