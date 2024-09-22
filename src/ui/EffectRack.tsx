import React, { useCallback, useRef, useState } from "react";
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
import { nullthrows } from "../utils/nullthrows";
import { PambaWamNode } from "../wam/PambaWamNode";
import { Effect } from "./Effect";
import {
  effectRackCanHandleTransfer,
  getRackAcceptableDataTransferResources,
} from "./dragdrop/getTrackAcceptableDataTransferResources";
import { handleDropOntoEffectRack } from "./dragdrop/resourceDrop";
import { transferEffectInstance } from "./dragdrop/setTransferData";
import { useEventListener } from "./useEventListener";

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
  const [draggingOver, setDraggingOver] = useState<false | "transferable" | "invalid">(false);
  const dropzonesRef = useRef<(HTMLDivElement | null)[]>([]);
  const [highlightedDropzone, setHighlightedDropzone] = useState<number | null>(null);

  // prevent wheel from making it to the timeline, so we don't scroll it
  useEventListener(
    "wheel",
    rackRef,
    useCallback(function (e: WheelEvent) {
      e.stopPropagation();
    }, []),
  );

  // prevent mousedown from making it to the timeline, so we don't change the cursor
  useEventListener(
    "mousedown",
    rackRef,
    useCallback((e) => {
      e.stopPropagation();
    }, []),
  );

  const onDragStart = useCallback(
    (ev: React.DragEvent, effectIndex: number) => {
      const trackIndex = project.allTracks.indexOf(track);
      if (trackIndex < 0) {
        throw new Error("track not found in project");
      }
      transferEffectInstance(ev.dataTransfer, {
        kind: "effectinstance",
        trackIndex,
        effectIndex,
      });
    },
    [project.allTracks, track],
  );

  const onDrop = useCallback(
    async (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      ev.stopPropagation();
      const transferableResources = await getRackAcceptableDataTransferResources(ev.dataTransfer);

      for (const resource of transferableResources) {
        await handleDropOntoEffectRack(resource, highlightedDropzone, track, project);
      }

      setHighlightedDropzone(null);
      setDraggingOver(false);
    },
    [highlightedDropzone, project, track],
  );

  const onDragOver = useCallback(async function allowDrop(e: React.DragEvent<HTMLDivElement>) {
    // For some reason, need to .preventDefault() so onDrop gets called
    e.preventDefault();

    if (!effectRackCanHandleTransfer(e.dataTransfer)) {
      e.dataTransfer.dropEffect = "none";
      setDraggingOver("invalid");
      return;
    }

    let highlight = 0;
    let dist = Infinity;
    for (let i = 0; i < dropzonesRef.current.length; i++) {
      const dropzone = dropzonesRef.current[i];
      if (dropzone == null) {
        continue;
      }
      const rect = dropzone.getBoundingClientRect();
      const distance = Math.abs(e.clientX - rect.x);
      if (distance < dist) {
        highlight = i;
      }
      dist = distance;
    }

    setHighlightedDropzone(highlight);
    setDraggingOver("transferable");
  }, []);

  const chain = [
    <EffectDropzone
      key={`dropzone-${0}`}
      showActiveDropzone={highlightedDropzone === 0}
      ref={(ref) => {
        dropzonesRef.current[0] = ref;
      }}
    />,
  ];
  for (let i = 0; i < effects.length; i++) {
    const effect = nullthrows(effects.at(i));
    switch (true) {
      case effect instanceof FaustAudioEffect: {
        chain.push(
          <FaustEffectModule
            onDragStart={(ev) => {
              onDragStart(ev, i);
            }}
            key={`effect-${i}`}
            canDelete={!isAudioPlaying}
            canBypass={!isAudioPlaying}
            effect={effect}
            style={{
              alignSelf: "stretch",
              margin: "2px",
              borderRadius: "2px",
            }}
            onClickRemove={() => AudioTrack.removeEffect(track, effect)}
            onHeaderMouseDown={() => {
              console.log("FOO");
              ProjectSelection.selectEffect(project, effect, track);
            }}
            onClickBypass={() => AudioTrack.bypassEffect(track, effect)}
            isSelected={selected?.status === "effects" && selected.test.has(effect)}
          />,
        );
        break;
      }

      case effect instanceof PambaWamNode: {
        chain.push(
          <Effect
            key={`effect-${i}`}
            canDelete={!isAudioPlaying}
            onClickRemove={() => {
              appEnvironment.openEffects.delete(effect);
              AudioTrack.removeEffect(track, effect);
            }}
            onHeaderMouseDown={() => ProjectSelection.selectEffect(project, effect, track)}
            onClickBypass={() => AudioTrack.bypassEffect(track, effect)}
            isSelected={selected?.status === "effects" && selected.test.has(effect)}
            title={effect.name}
            onDragStart={(ev) => {
              onDragStart(ev, i);
            }}
          >
            <button onClick={() => appEnvironment.openEffects.add(effect)}>Configure</button>
          </Effect>,
        );
        break;
      }
      default:
        exhaustive(effect);
    }

    chain.push(
      <EffectDropzone
        key={`dropzone-${i + 1}`}
        showActiveDropzone={highlightedDropzone === i + 1}
        ref={(ref) => {
          dropzonesRef.current[i + 1] = ref;
        }}
      />,
    );
  }

  return (
    <>
      <div
        ref={rackRef}
        style={{
          height: EFFECT_HEIGHT,
          // background:
          //   draggingOver === false ? undefined : draggingOver === "invalid" ? undefined : "rgba(23, 43, 23, 0.7)",
        }}
        className={styles.effectRack}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => {
          setDraggingOver(false);
          setHighlightedDropzone(null);
        }}
      >
        {track instanceof MidiTrack && <InstrumentEffect track={track} project={project} renderer={renderer} />}
        {chain}
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
      </div>
    </>
  );
});

function InstrumentEffect({ track }: { track: MidiTrack; project: AudioProject; renderer: AudioRenderer }) {
  const [instrument] = usePrimitive(track.instrument);
  return (
    <React.Fragment>
      <Effect
        canDelete={false}
        onClickRemove={() => {
          console.log("CANT REMOVE");
        }}
        onHeaderMouseDown={() => console.log("TODO")}
        onClickBypass={() => console.log("TODO")}
        isSelected={false}
        title={instrument.name}
      >
        {/* TODO: this wont be reactive: the window won't render the new instrument when we change it */}
        <button onClick={() => appEnvironment.openEffects.add(instrument)}>Configure</button>
      </Effect>
      {"→"}
    </React.Fragment>
  );
}

const EffectDropzone = React.forwardRef<
  HTMLDivElement,
  {
    showActiveDropzone?: boolean;
    initialDropzone?: boolean;
  }
>(function EffectDropzone({ showActiveDropzone, initialDropzone }, ref: React.ForwardedRef<HTMLDivElement>) {
  return (
    <div ref={ref} style={showActiveDropzone ? { background: "orange" } : undefined}>
      {initialDropzone ? "↳" : "→"}
    </div>
  );
});
