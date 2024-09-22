export const changelog = `
next
- improve zoom slider
- locked tracks can't be deleted
- audio clip details buffer selection
- ui changes to show active panel
- can undo clip deletion
- can drag new effects onto specific positions in track effect rack
- can drag effects between tracks/racks, and reorder

v0.1.7
- Cmd+L while selecting clip(s) activates loop on their duration
- drag-drop effects from library onto tracks
- drag-drop effects and instruments onto project to create new tracks
- drag-drop effects and instruments onto the effect rack
- improvements to midi track rendering and behaviour
- remove effect selector from tracks' effect rack header
- faust effects now live in the library

v0.1.6
- resize midi clips via the clip editor
- better panning/zooming in midi clip editor
- fix midi looping when loop start isn't 0s
- improvements to initialization

v0.1.5
- project load times improvements
- midi: new instruments
- WAM effects and instruments on sidebar
- looping on midi tracks

v0.1.4
- cmd+L to loop selection
- smoother scaling of clip in clip editor
- clip editor playback marker lock

v0.1.3
- saved recorded audio no longer crashes everything on load
- added loop brace (breaks existing projects)

v0.1.2
- added changelog. warning: it will be of dubious quality
- can undo clip name change
- data structure changes

v0.1.1
- added Faust effect: pitch_shifter
`;
