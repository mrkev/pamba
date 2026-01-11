import { KeyboardShortcut } from "./Command";

function ofEvent(e: KeyboardEvent) {
  return chord(e.code, e.metaKey, e.altKey, e.ctrlKey, e.shiftKey);
}

function chord(code: string, meta: boolean, alt: boolean, ctrl: boolean, shift: boolean) {
  return `${code}-${meta}-${alt}-${ctrl}-${shift}`;
}

function ofKeys(...shortcut: KeyboardShortcut) {
  const set = new Set(shortcut);
  return chord(shortcut[0], set.has("meta"), set.has("alt"), set.has("ctrl"), set.has("shift"));
}

export const keyChord = {
  chord,
  ofEvent,
  ofKeys,
};
