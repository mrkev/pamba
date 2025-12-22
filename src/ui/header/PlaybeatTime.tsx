import { useRef, useCallback, useEffect } from "react";
import { AnalizedPlayer } from "../../lib/io/AnalizedPlayer";
import { AudioProject } from "../../lib/project/AudioProject";

export function PlaybeatTime({ project, player }: { project: AudioProject; player: AnalizedPlayer }) {
  const playbeatCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawPlaybeatTime = useCallback(
    (time: number) => {
      const ctx = playbeatCanvasRef.current?.getContext("2d") ?? null;
      if (ctx === null || playbeatCanvasRef.current == null) {
        return;
      }
      const [num] = project.timeSignature.get();
      const tempo = project.tempo.get();

      const oneBeatLenSec = 60 / tempo;
      // note: 0 -> 1 index
      const bar = String(Math.floor(time / oneBeatLenSec / num) + 1).padStart(3, " ");
      const beat = String((Math.floor(time / oneBeatLenSec) % num) + 1).padStart(2, " ");
      // TODO: what is sub acutally
      const high = beat === " 1" ? " *" : beat === " 3" ? " _" : "  ";

      ctx.font = "24px monospace";
      ctx.textAlign = "start";
      ctx.fillStyle = "#ffffff";
      ctx.clearRect(0, 0, playbeatCanvasRef.current.width, 100);
      ctx.fillText(String(`${bar}.${beat}.${high}`), 6, 26);
    },
    [project.tempo, project.timeSignature],
  );

  useEffect(() => {
    return player.addEventListener("frame", drawPlaybeatTime);
  }, [drawPlaybeatTime, player]);

  return (
    <canvas
      style={{
        background: "black",
        width: 72,
        height: 18,
        alignSelf: "center",
      }}
      width={2 * 72 + "px"}
      height={2 * 18 + "px"}
      ref={playbeatCanvasRef}
    />
  );
}
