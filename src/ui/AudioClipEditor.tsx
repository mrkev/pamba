import { useContainer, usePrimitive } from "structured-state";
import { AnalizedPlayer } from "../lib/io/AnalizedPlayer";
import { AudioClip } from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
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
  // const containerRef = useRef<HTMLDivElement>(null);
  // const backgroundRef = useRef<HTMLCanvasElement>(null);
  // const waveformRef = useRef<HTMLCanvasElement>(null);

  // for waveform IMG
  const [pxPerSec] = usePrimitive(clip.detailedViewport.pxPerSecond);
  const [lockPlayback] = usePrimitive(clip.detailedViewport.lockPlayback);

  // for waveform GPU
  // const [waveformStartFr, setWaveformStartFr] = useState(0);
  // const [scale, setScale] = useState(80);

  // const frPerPx = getRealScale(pxPerSec);
  // console.log("frPerPx", frPerPx, "pxPerSec", pxPerSec);

  useContainer(clip);

  // const backgroundImageData = clip.getWaveformDataURL(
  //   // totalBufferWidth,
  //   1000,
  //   HEIGHT,
  // );

  // how many samples per pixel

  // useEffect(() => {
  //   player.onFrame2 = function (playbackPos) {
  //     const pbdiv = playbackDiv.current;
  //     if (pbdiv) {
  //       pbdiv.style.left = String(timelineSecsToClipPx(playbackPos)) + "px";
  //     }
  //   };
  // }, [player, player.isAudioPlaying, timelineSecsToClipPx]);

  return (
    <>
      <ClipPropsEditor clip={clip} project={project} track={track} />
      <AudioClipPropsEditor clip={clip} project={project} />
      {/* Waveform view */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          overflow: "hidden",
          gap: 4,
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end" }}>
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
