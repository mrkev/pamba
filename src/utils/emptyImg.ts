// a 1x1 transparent gif
// we can use this to show no drag image when dragging
// we have to preload the image (vs generate it when the event ocurs)
// to prevent the (empty image) "globe" from showing up
// https://stackoverflow.com/a/40923520
export const emptyImg = document.createElement("img");
emptyImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
