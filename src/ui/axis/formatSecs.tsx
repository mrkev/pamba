const formatter = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  minimumIntegerDigits: 2,
});
export function formatSecs(secs: number) {
  return `${formatter.format(Math.floor(secs / 60))}:${formatter.format(secs % 60)}`;
}
