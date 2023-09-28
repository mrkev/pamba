//https://stackoverflow.com/questions/6248666/how-to-generate-short-uid-like-ax4j9z-in-js
export function shortId() {
  // I generate the UID from two parts here
  // to ensure the random number provide enough bits.
  const first = (Math.random() * 46656) | 0;
  const second = (Math.random() * 46656) | 0;
  const firstPart = ("000" + first.toString(36)).slice(-3);
  const secondPart = ("000" + second.toString(36)).slice(-3);
  return firstPart + secondPart;
}
