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
import { TimelineCursor } from "./TimelineCursor";

export const OVERVIEW_TRACK_MIN_HEIGHT = 12;

export function OverviewPanel({
  project,
  player,
  renderer,
  className,
}: {
  project: AudioProject;
  player: AnalizedPlayer;
  renderer: AudioRenderer;
  className?: string;
}) {
  const [viewportStartPx] = usePrimitive(project.viewport.scrollLeftPx);
  const [projectDivWidth] = usePrimitive(project.viewport.projectDivWidth);
  const tracks = useContainer(project.allTracks);
  const [scale] = usePrimitive(project.viewport.pxPerSecond);
  const [loopPlayback] = usePrimitive(project.loopOnPlayback);

  return (
    <div
      className={cn(
        "bg-timeline-bg relative box-border",
        "flex flex-col grow justify-stretch overflow-scroll",
        //
        className,
      )}
      style={{
        minHeight: OVERVIEW_TRACK_MIN_HEIGHT * tracks.length + tracks.length,
      }}
    >
      {tracks.map((track, i) => {
        return (
          <>
            <TrackOverview key={track._id} track={track} project={project} />
            <div
              className={cn("flex sticky left-0 grow", "border-b border-black pointer-events-none")}
              style={{ minHeight: OVERVIEW_TRACK_MIN_HEIGHT }}
            />
          </>
        );
      })}
      <TimelineCursor project={project} />
      <ViewportPlaybackCursor
        viewport={project.viewport}
        player={player}
        // 1px padding from margin, 1 of overview, 1 of track
        // marginLeft={2}
        style={{ minHeight: tracks.length * OVERVIEW_TRACK_MIN_HEIGHT + tracks.length }}
      />
    </div>
  );
}

export function TrackOverview({ project, track }: { track: AudioTrack | MidiTrack; project: AudioProject }) {
  const [selected] = useLinkAsState(project.selected);
  const clips = useContainer(track.clips);
  const lockedTracks = useContainer(project.lockedTracks);
  const locked = lockedTracks.has(track);

  return (
    <div className={cn("flex relative", "overflow-visible")} style={{ height: 0 }}>
      {clips.map((clip) => {
        const isSelected = selected !== null && selected.status === "clips" && selected.test.has(clip);
        return (
          <ClipOverview
            onKeyDown={(e) => {
              switch (e.key) {
                case "Backspace": {
                  console.log("DELETE");
                }
              }
            }}
            tabIndex={-1}
            key={clip._id}
            clip={clip}
            className={cn("relative", isSelected ? "bg-clip-border-selected" : "bg-clip-color", locked && "opacity-50")}
            style={{ minHeight: OVERVIEW_TRACK_MIN_HEIGHT }}
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
  const left = project.viewport.timeToPx(timelienStart, "pos");
  const width = project.viewport.timeToPx(timelineLength, "len");

  return (
    <div
      className={classNames("h-full rounded-xs mr-0 relative cursor-pointer box-border shrink-0", className)}
      style={{ width, left, ...style }}
      {...rest}
    ></div>
  );
}
