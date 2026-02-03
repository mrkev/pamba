import { useEffect, useLayoutEffect, useRef } from "react";
import { usePrimitive } from "structured-state";
import { AnalizedPlayer } from "../lib/io/AnalizedPlayer";
import { StandardViewport } from "../lib/viewport/StandardViewport";
import { cn } from "../utils/cn";

export function ViewportPlaybackCursor({
  viewport,
  player,
  marginLeft,
}: {
  viewport: StandardViewport;
  player: AnalizedPlayer;
  marginLeft?: number;
}) {
  const playbackPosDiv = useRef<null | HTMLDivElement>(null);
  const [scale] = usePrimitive(viewport.pxPerSecond);

  // initial cursor pos
  useLayoutEffect(() => {
    const pbcursor = playbackPosDiv.current;
    if (pbcursor) {
      const px = viewport.secsToPx(player.playbackTime, marginLeft);
      pbcursor.style.left = String(px) + "px";
    }
    // change with scale too
  }, [player, viewport, scale, marginLeft]);

  // on frame
  useEffect(() => {
    return player.addEventListener("frame", function updateProjectViewCursor(playbackTime) {
      const pbcursor = playbackPosDiv.current;
      if (pbcursor) {
        const px = viewport.secsToPx(playbackTime, marginLeft);
        console.log("HERE");
        pbcursor.style.left = String(px) + "px";
      }
    });
  }, [marginLeft, player, viewport]);

  return (
    <div
      ref={playbackPosDiv}
      className={cn(
        "name-playback-pos-div",
        "bg-cursor-playback w-px h-full absolute left-0 top-0 select-none pointer-events-none",
      )}
    />
  );
}
