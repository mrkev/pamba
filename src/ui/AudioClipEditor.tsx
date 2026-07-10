import { useContainer, usePrimitive } from "structured-state";
import { AudioClip } from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { AnalizedPlayer } from "../lib/io/AnalizedPlayer";
import { AudioProject } from "../lib/project/AudioProject";
import { AudioClipBufferView } from "./AudioClipBufferView";
import { AudioClipPropsEditor, ClipPropsEditor } from "./ClipPropsEditor";
import { UtilityToggle } from "./UtilityToggle";

export const HEIGHT = 200;

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
            value={Math.log2(pxPerSec)}
            min={Math.log2(10)}
            max={Math.log2(clip.sampleRate)}
            step={0.01}
            onChange={(e) => {
              const newVal = parseFloat(e.target.value);
              clip.detailedViewport.pxPerSecond.set(Math.pow(2, newVal));
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

        <AudioClipBufferView clip={clip} project={project} player={player} />
      </div>
    </>
  );
}
