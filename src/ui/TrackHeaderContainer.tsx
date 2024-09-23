import { useCallback, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { useContainer } from "structured-state";
import { MIN_TRACK_HEIGHT, TRACK_HEADER_WIDTH } from "../constants";
import { documentCommands } from "../input/documentCommands";
import { useAxisContainerMouseEvents } from "../input/useProjectMouseEvents";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioProject } from "../lib/project/AudioProject";
import { nullthrows } from "../utils/nullthrows";
import { TrackHeader, TrackHeaderSeparator } from "./TrackHeader";
import { trackHeaderContainerCanHandleTransfer } from "./dragdrop/canHandleTransfer";
import { getTrackHeaderContainerAcceptableDataTransferResources } from "./dragdrop/getTrackAcceptableDataTransferResources";
import { handleDropOntoTrackHeaderContainer } from "./dragdrop/resourceDrop";
import { transferTrackInstance } from "./dragdrop/setTransferData";
import { useDropzoneBehaviour } from "./dragdrop/useDropzoneBehaviour";
import { utility } from "./utility";

export function TrackHeaderContainer({ project, player }: { project: AudioProject; player: AnalizedPlayer }) {
  const classes = useStyles();
  const axisContainerRef = useRef<HTMLDivElement | null>(null);
  const tracks = useContainer(project.allTracks);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropzonesRef = useRef<(HTMLDivElement | null)[]>([]);
  const [highlightedDropzone, setHighlightedDropzone] = useState<number | null>(null);

  useAxisContainerMouseEvents(project, axisContainerRef);

  const [draggingOverTrackHeaderContainer] = useDropzoneBehaviour(
    containerRef,
    (dataTransfer: DataTransfer | null) => dataTransfer != null && trackHeaderContainerCanHandleTransfer(dataTransfer),
    useCallback(function dragOver(e: DragEvent) {
      let highlight = 0;
      let dist = Infinity;

      for (let i = 0; i < dropzonesRef.current.length; i++) {
        const dropzone = dropzonesRef.current[i];
        if (dropzone == null) {
          continue;
        }
        const rect = dropzone.getBoundingClientRect();

        const distance = Math.abs(e.clientY - rect.y);
        if (distance < dist) {
          highlight = i;
        }
        dist = distance;
      }
      setHighlightedDropzone(highlight);
    }, []),

    useCallback(function dragLeave() {
      setHighlightedDropzone(null);
    }, []),

    useCallback(
      async function drop(e: DragEvent) {
        if (e.dataTransfer == null) {
          return;
        }

        const transferableResources = await getTrackHeaderContainerAcceptableDataTransferResources(e.dataTransfer);
        for (const resource of transferableResources) {
          await handleDropOntoTrackHeaderContainer(resource, highlightedDropzone, project);
        }

        setHighlightedDropzone(null);
      },
      [highlightedDropzone, project],
    ),
  );

  const trackHeaders = [
    <TrackHeaderSeparator
      ref={(ref) => (dropzonesRef.current[0] = ref)}
      key={`sep-${0}`}
      showActiveDropzone={highlightedDropzone === 0}
      firstDropzone
    />,
  ];
  for (let i = 0; i < tracks.length; i++) {
    const track = nullthrows(tracks.at(i));
    trackHeaders.push(
      <TrackHeader
        key={i}
        track={track}
        project={project}
        player={player}
        trackNumber={tracks.length - i}
        onDragStart={(e) => {
          const trackIndex = project.allTracks.indexOf(track);
          if (trackIndex < 0) {
            throw new Error("track not found in project");
          }
          transferTrackInstance(e.dataTransfer, {
            kind: "trackinstance",
            trackIndex,
          });
        }}
      />,
    );
    trackHeaders.push(
      <TrackHeaderSeparator
        ref={(ref) => {
          dropzonesRef.current[i + 1] = ref;
        }}
        key={`sep-${i + 1}`}
        showActiveDropzone={highlightedDropzone === i + 1}
      />,
    );
  }

  return (
    <div className={classes.trackHeaders} ref={containerRef}>
      {trackHeaders}
      {/* extra space */}
      <div
        style={{
          height: MIN_TRACK_HEIGHT * 2,
          position: "relative",
          padding: "8px 8px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <button
          className={utility.button}
          onClick={async () => {
            documentCommands.execById("createAudioTrack", project);
          }}
        >
          new track
        </button>
      </div>
    </div>
  );
}

const useStyles = createUseStyles({
  trackHeaders: {
    position: "sticky",
    right: 0,
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    width: TRACK_HEADER_WIDTH,
    flexShrink: 0,
  },
});
