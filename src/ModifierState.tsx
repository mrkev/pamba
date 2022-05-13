/**
 * A global defining the state of modifier keys.
 */

import { useEffect } from "react";

type ModifierState = {
  shift: boolean;
  meta: boolean;
  control: boolean;
  alt: boolean;
};

export const modifierState: ModifierState = {
  shift: false,
  meta: false,
  control: false,
  alt: false,
};

(window as any).ms = modifierState;

export function useSingletonKeyboardModifierState(singleton: ModifierState) {
  useEffect(() => {
    function keydownEvent(e: KeyboardEvent) {
      // console.log(e.code);
      switch (e.code) {
        case "ShiftLeft":
        case "ShiftRight":
          singleton.shift = true;
          break;
        case "MetaLeft":
        case "MetaRight":
          singleton.meta = true;
          break;
      }
    }

    function keyupEvent(e: KeyboardEvent) {
      switch (e.code) {
        case "ShiftLeft":
        case "ShiftRight":
          singleton.shift = false;
          break;
        case "MetaLeft":
        case "MetaRight":
          singleton.meta = false;
          break;
      }
    }

    document.addEventListener("keydown", keydownEvent);
    document.addEventListener("keyup", keyupEvent);
    return function () {
      document.removeEventListener("keydown", keydownEvent);
      document.removeEventListener("keyup", keyupEvent);
    };
  }, [singleton]);
}
