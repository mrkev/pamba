import classNames from "classnames";
import { useLinkAsState } from "marked-subbable";
import { useContainer, usePrimitive } from "structured-state";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioClip } from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { AnalizedPlayer } from "../lib/io/AnalizedPlayer";
import { AudioRenderer } from "../lib/io/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { cliptrack } from "../lib/project/ClipTrack";
import { selection } from "../lib/project/selection";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { cn } from "../utils/cn";
import { ViewportPlaybackCursor } from "./ViewportCursor";

const CLIP_HEIGHT = 22;

export function OverviewPanel({
  project,
  player,
  renderer,
}: {
  project: AudioProject;
  player: AnalizedPlayer;
  renderer: AudioRenderer;
}) {
  const [viewportStartPx] = usePrimitive(project.viewport.scrollLeftPx);
  const [projectDivWidth] = usePrimitive(project.viewport.projectDivWidth);
  const tracks = useContainer(project.allTracks);
  const [scale] = usePrimitive(project.viewport.pxPerSecond);
  const [loopPlayback] = usePrimitive(project.loopOnPlayback);

  return (
    <>
      <div className="bg-black grow flex flex-col gap-px justify-start p-px overflow-scroll relative">
        {tracks.map((track, i) => {
          return <TrackOverview key={track._id} track={track} project={project} />;
        })}
        <ViewportPlaybackCursor
          viewport={project.viewport}
          player={player}
          // 1px padding from margin, 1 of overview, 1 of track
          marginLeft={2}
        />
      </div>
    </>
  );
}

export function TrackOverview({ project, track }: { track: AudioTrack | MidiTrack; project: AudioProject }) {
  const [selected] = useLinkAsState(project.selected);
  const clips = useContainer(track.clips);
  const lockedTracks = useContainer(project.lockedTracks);
  const locked = lockedTracks.has(track);

  return (
    <div className={cn("flex relative", "bg-timeline-bg")}>
      {clips.map((clip) => {
        const isSelected = selected !== null && selected.status === "clips" && selected.test.has(clip);
        return (
          <ClipOverview
            onKeyDown={(e) => {
              console.log(e.key);

              switch (e.key) {
                case "Backspace": {
                  console.log("DELETE");
                }
              }
            }}
            tabIndex={-1}
            key={clip._id}
            clip={clip}
            className={classNames(isSelected ? "bg-clip-border-selected" : "bg-clip-color", locked && "opacity-50")}
            onClick={(e) => {
              const selectAdd = e.metaKey || e.shiftKey;
              selection.selectClip(project, cliptrack(clip, track), selectAdd);
            }}
          />
        );
      })}
    </div>
  );
}

export function ClipOverview({
  className,
  clip,
  style,
  ...rest
}: React.HTMLProps<HTMLDivElement> & { clip: AudioClip | MidiClip }) {
  const project = appEnvironment.ensureProject();
  const timelienStart = useContainer(clip.timelineStart);
  const timelineLength = useContainer(clip.timelineLength);

  // looks better adding this 0.5px margin to left and right
  const left = project.viewport.timeToPx(timelienStart);
  const width = project.viewport.timeToPx(timelineLength);

  return (
    <div
      className={classNames("h-full rounded-sm m-px mr-0 relative cursor-pointer box-border shrink-0", className)}
      style={{ width, left, height: CLIP_HEIGHT, ...style }}
      {...rest}
    ></div>
  );
}
