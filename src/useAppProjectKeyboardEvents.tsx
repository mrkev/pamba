import { useCallback, useEffect } from "react";
import { AudioClip } from "./lib/AudioClip";
import { AudioTrack } from "./lib/AudioTrack";
import { AudioProject } from "./lib/AudioProject";
import { useLinkedState } from "./lib/LinkedState";

export function useAppProjectKeyboardEvents(project: AudioProject, togglePlayback: () => void): void {
  const [_, setTracks] = useLinkedState(project.allTracks);
  const [__, setTool] = useLinkedState(project.pointerTool);
  const [selected, setSelected] = useLinkedState(project.selected);

  const removeClip = useRemoveClipFunction(project);

  const removeTrack = useCallback(
    (track: AudioTrack) => {
      setTracks((tracks) => {
        const pos = tracks.indexOf(track);
        if (pos === -1) {
          return tracks;
        }
        const copy = tracks.map((x) => x);
        copy.splice(pos, 1);
        if (selected && selected.status === "tracks" && selected.test.has(track)) {
          // TODO: remove track from selected tracks
        }

        return copy;
      });
    },
    [selected, setTracks]
  );

  useEffect(() => {
    function keydownEvent(e: KeyboardEvent) {
      // console.log(e.code);
      switch (e.code) {
        case "Backspace":
          if (!selected) {
            return;
          }
          if (selected.status === "clips") {
            for (let { clip, track } of selected.clips) {
              console.log("remove", selected);
              removeClip(clip, track);
              setSelected(null);
            }
          }
          if (selected.status === "tracks") {
            for (let track of selected.tracks) {
              console.log("remove", selected);
              removeTrack(track);
              setSelected(null);
            }
          }
          if (selected.status === "time") {
            // todo
          }

          // console.log(selectionWidthRef.current);
          break;
      }
    }

    function keyupEvent(e: KeyboardEvent) {}

    function keypressEvent(e: KeyboardEvent) {
      switch (e.code) {
        case "KeyM":
          setTool("move");
          break;
        case "KeyS":
          setTool("trimStart");
          break;
        case "KeyE":
          setTool("trimEnd");
          break;
        default:
          console.log(e.code);
      }
      if (e.code === "Space") {
        // todo: is there better way to prevent space from toggling the last
        // pressed button?
        if (document.activeElement instanceof HTMLButtonElement) {
          (document.activeElement as any).blur();
        }
        togglePlayback();
        e.preventDefault();
      }
    }

    document.addEventListener("keydown", keydownEvent);
    document.addEventListener("keypress", keypressEvent, { capture: true });
    document.addEventListener("keyup", keyupEvent);
    return function () {
      document.removeEventListener("keydown", keydownEvent);
      document.removeEventListener("keypress", keypressEvent, {
        capture: true,
      });
      document.removeEventListener("keyup", keyupEvent);
    };
  }, [removeClip, removeTrack, selected, setSelected, setTool, togglePlayback]);
}
function useRemoveClipFunction(project: AudioProject) {
  const [selected, setSelected] = useLinkedState(project.selected);

  return useCallback(
    (clip: AudioClip, track: AudioTrack) => {
      track.removeClip(clip);
      if (selected && selected.status === "clips") {
        setSelected({ ...selected, clips: selected.clips.filter((selection) => selection.clip !== clip) });
      }
    },
    [selected, setSelected]
  );
}
