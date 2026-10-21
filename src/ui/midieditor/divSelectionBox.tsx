import { PointerPressMeta } from "../usePointerPressMove";

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
