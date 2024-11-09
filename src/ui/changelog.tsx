export const changelog = `
next
- add a bunch of sound effect plugins
- fix plugin names
- fix dropping audio files from library into timeline

v0.2.2
- fix dragging faust effects into timeline
- dragging an effect into a track expands its effect rack

v0.2.1
- redo (experimental)
- ui improvements and fixes
- now named minidaw, and available via minidaw.aykev.dev
- added button to report bugs

v0.2.0
- resizing a clip from start can snap to grid
- can resize midi clip from end
- improvements to undo
- midi clips render midi notes in timeline
- faster intialization
- zoom level and timeline scroll position is preserved on project save
- improvements to undo

v0.1.8
- improve zoom slider
- locked tracks can't be deleted
- audio clip details buffer selection
- ui changes to show active panel
- can undo clip deletion
- can drag new effects onto specific positions in track effect rack
- can drag effects between tracks/racks, and reorder them
- can drag tracks headers to reorganize tracks

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
