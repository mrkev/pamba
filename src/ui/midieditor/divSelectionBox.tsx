import { useRef, useCallback } from "react";
import { usePrimitive, useContainer } from "structured-state";
import { CANVAS_SCALE } from "../../constants";
import { AudioProject } from "../../lib/project/AudioProject";
import { MidiClip } from "../../midi/MidiClip";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { useDrawOnCanvas } from "../useDrawOnCanvas";
import { PointerPressMeta } from "../usePointerPressMove";

export function MidiEditorPianoRollTimeAxis({
  className,
  style,
  clip,
  project,
}: {
  className?: string;
  style?: React.CSSProperties;
  clip: MidiClip;
  project: AudioProject;
}) {
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const [noteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const timelineLen = useContainer(clip.timelineLength);
  const [pxPerPulse] = usePrimitive(clip.detailedViewport.pxPerPulse);

  useDrawOnCanvas(
    backgroundRef,
    useCallback(
      (ctx, canvas) => {
        ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
        ctx.strokeStyle = "#bbb";

        for (let i = 0; i < timelineLen.pulses(project); i += PPQN / 4) {
          if (i % 8 === 0) {
            ctx.strokeStyle = "#bbb";
            ctx.fillStyle = "#bbb";
          } else {
            ctx.strokeStyle = "#888";
            ctx.fillStyle = "#888";
          }
          const x = pxPerPulse * i + 0.5;

          ctx.fillText(`${i / PPQN}`, x + 2, 9);
          if (i === 0) {
            continue;
          }
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        ctx.scale(1, 1);
      },
      [timelineLen, project, pxPerPulse],
    ),
  );

  return (
    <canvas
      ref={backgroundRef}
      height={CANVAS_SCALE * noteHeight}
      width={CANVAS_SCALE * clip.detailedViewport.pulsesToPx(timelineLen.pulses(project))}
      className={className}
      style={{
        height: noteHeight,
        width: clip.detailedViewport.pulsesToPx(timelineLen.pulses(project)),
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
}
export function divSelectionBox(
  meta: PointerPressMeta,
  ev: PointerEvent,
  container: DOMRect,
): [x: number, y: number, w: number, h: number] {
  const pointerX = ev.clientX - container.left;
  const startX = meta.downX - container.left;

  const pointerY = ev.clientY - container.top;
  const startY = meta.downY - container.top;

  return [
    //
    Math.min(pointerX, startX),
    Math.min(pointerY, startY),
    Math.abs(ev.clientX - meta.downX),
    Math.abs(ev.clientY - meta.downY),
  ];
}
