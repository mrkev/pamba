import { useLayoutEffect } from "react";

export function useDrawOnCanvas(
  ref: React.RefObject<HTMLCanvasElement>,
  cb: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void,
) {
  // layout effect to avoid flicker
  useLayoutEffect(() => {
    const elem = ref.current;
    const ctx = elem?.getContext("2d") ?? null;
    if (ctx == null || elem == null) {
      return;
    }

    ctx.save();
    cb(ctx, elem);
    return () => {
      ctx.clearRect(0, 0, elem.width, elem.height);
      ctx.restore();
    };
  }, [cb, ref]);
}
