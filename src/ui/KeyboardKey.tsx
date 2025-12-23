export function KeyboardKey({ str }: { str: string }) {
  return <kbd title={str}>{keyStr(str)}</kbd>;
}

export function keyStr(str: string) {
  return str === "meta"
    ? "\u2318"
    : str === "alt"
      ? "\u2325"
      : str === "ctrl"
        ? "\u2303"
        : str === "shift"
          ? "\u21EA"
          : str === "Period"
            ? "."
            : str.replace(/^Key/, "");
}
