import { useLinkAsState } from "marked-subbable";
import React, { useCallback, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { useContainer, usePrimitive } from "structured-state";
import { EFFECT_HEIGHT } from "../constants";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import FaustEffectModule from "../dsp/ui/FaustEffectModule";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioTrack } from "../lib/AudioTrack";
import { bypassEffect, removeEffect } from "../lib/effect";
import { AudioRenderer } from "../lib/io/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { ProjectSelection } from "../lib/project/ProjectSelection";
import { MidiTrack } from "../midi/MidiTrack";
import { exhaustive } from "../utils/exhaustive";
import { nullthrows } from "../utils/nullthrows";
import { PambaWamNode } from "../wam/PambaWamNode";
import { EffectBox } from "./EffectBox";
import { effectRackCanHandleTransfer } from "./dragdrop/canHandleTransfer";
import { getRackAcceptableDataTransferResources } from "./dragdrop/getTrackAcceptableDataTransferResources";
import { handleDropOntoEffectRack } from "./dragdrop/resourceDrop";
import { transferObject } from "./dragdrop/setTransferData";
import { useDropzoneBehaviour } from "./dragdrop/useDropzoneBehaviour";
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
  const [selected] = useLinkAsState(project.selected);
  const rackRef = useRef<HTMLDivElement | null>(null);
  const [isAudioPlaying] = usePrimitive(renderer.isAudioPlaying);
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

  useDropzoneBehaviour(
    rackRef,
    effectRackCanHandleTransfer,

    useCallback(function dragOver(e: DragEvent) {
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
    }, []),

    useCallback(function dragLeave() {
      setHighlightedDropzone(null);
    }, []),

    useCallback(
      async function drop(ev: DragEvent) {
        setHighlightedDropzone(null);
        if (ev.dataTransfer != null) {
          const transferableResources = await getRackAcceptableDataTransferResources(ev.dataTransfer);
          for (const resource of transferableResources) {
            await handleDropOntoEffectRack(resource, highlightedDropzone, track, project);
          }
        }
      },
      [highlightedDropzone, project, track],
    ),
  );

  const onDragStart = useCallback(
    (ev: React.DragEvent, effectIndex: number) => {
      const trackIndex = project.allTracks.indexOf(track);
      if (trackIndex < 0) {
        throw new Error("track not found in project");
      }
      transferObject(ev.dataTransfer, {
        kind: "effectinstance",
        trackIndex,
        effectIndex,
      });
    },
    [project.allTracks, track],
  );

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
            onClickRemove={() => removeEffect(track, effect)}
            onHeaderMouseDown={() => {
              console.log("FOO");
              ProjectSelection.selectEffect(project, effect, track);
            }}
            onClickBypass={() => bypassEffect(track, effect)}
            isSelected={selected?.status === "effects" && selected.test.has(effect)}
          />,
        );
        break;
      }

      case effect instanceof PambaWamNode: {
        chain.push(
          <EffectBox
            key={`effect-${i}`}
            canDelete={!isAudioPlaying}
            onClickRemove={() => {
              appEnvironment.openEffects.delete(effect);
              removeEffect(track, effect);
            }}
            onHeaderMouseDown={() => ProjectSelection.selectEffect(project, effect, track)}
            onClickBypass={() => bypassEffect(track, effect)}
            isSelected={selected?.status === "effects" && selected.test.has(effect)}
            title={effect.name.get()}
            onDragStart={(ev) => {
              onDragStart(ev, i);
            }}
          >
            <button
              className={"utilityButton"}
              style={{ margin: "4px 4px" }}
              onClick={() => appEnvironment.openEffects.add(effect)}
            >
              Configure
            </button>
          </EffectBox>,
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
      >
        {/* {track instanceof MidiTrack && <MidiInputEffect track={track} project={project} renderer={renderer} />} */}
        {track instanceof MidiTrack && <InstrumentEffect track={track} project={project} renderer={renderer} />}
        {chain}
        <div
          className="self-stretch bg-effect-back"
          style={{
            // border: "1px solid #333",
            padding: "4px 8px",
          }}
        >
          Output
        </div>
      </div>
    </>
  );
});

function MidiInputEffect({ track }: { track: MidiTrack; project: AudioProject; renderer: AudioRenderer }) {
  return (
    <EffectBox
      canDelete={false}
      onHeaderMouseDown={() => console.log("TODO")}
      onClickBypass={() => console.log("TODO")}
      isSelected={false}
      title={"MIDI"}
    >
      Input:
      <input type="checkbox" />
      <input type="checkbox" />
    </EffectBox>
  );
}

function InstrumentEffect({ track }: { track: MidiTrack; project: AudioProject; renderer: AudioRenderer }) {
  const [instrument] = usePrimitive(track.instrument);
  const [name] = usePrimitive(instrument.name);
  return (
    <EffectBox
      canDelete={false}
      onHeaderMouseDown={() => console.log("TODO")}
      onClickBypass={() => console.log("TODO")}
      isSelected={false}
      title={name}
    >
      {/* TODO: this wont be reactive: the window won't render the new instrument when we change it */}
      <button
        className="utilityButton"
        style={{ margin: "4px 4px" }}
        onClick={() => appEnvironment.openEffects.add(instrument)}
      >
        Configure
      </button>
    </EffectBox>
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
