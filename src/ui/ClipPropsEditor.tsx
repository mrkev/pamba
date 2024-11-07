import { ReactElement } from "react";
import { createUseStyles } from "react-jss";
import { useContainer, usePrimitive } from "structured-state";
import { AudioClip } from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { TimelineTEditor } from "./TimelineTEditor";
import { UtilityTextInput } from "./UtilityButton";

export function ClipPropsEditor(props: { clip: AudioClip; project: AudioProject; track: AudioTrack }): ReactElement;
export function ClipPropsEditor(props: { clip: MidiClip; project: AudioProject; track: MidiTrack }): ReactElement;
export function ClipPropsEditor({
  clip,
  project,
}: {
  clip: AudioClip | MidiClip;
  project: AudioProject;
  track: AudioTrack | MidiTrack;
}) {
  const [name] = usePrimitive(clip.name);
  const tStart = useContainer(clip.timelineStart);
  const tLen = useContainer(clip.timelineLength);

  return (
    <EditorSection title="Clip">
      Name:
      <UtilityTextInput
        value={name}
        onChange={function (value: string): string | void | Promise<string | void> {
          clip.name.set(value);
        }}
      />
      Start:
      <TimelineTEditor t={tStart} project={project} readonly onChange={() => {}} defaultUnit={"bars"} />
      Length:
      <TimelineTEditor
        t={tLen}
        project={project}
        readonly
        onChange={() => {}}
        defaultUnit={clip instanceof MidiClip ? "bars" : "seconds"}
      />
      sid:
      <UtilityTextInput value={clip._id} />
      <small>note: sid is for debugging</small>
    </EditorSection>
  );
}

export function AudioClipPropsEditor({ clip }: { clip: AudioClip; project: AudioProject }) {
  return (
    <EditorSection title={"Audio"}>
      Filename:
      <UtilityTextInput value={clip.bufferURL} />
      Sample Rate:
      <UtilityTextInput value={String(clip.sampleRate)} />
    </EditorSection>
  );
}

export function EditorSection({ children, title }: { children: React.ReactNode; title: string }) {
  const styles = useStyles();
  return (
    <div style={{ marginRight: 4, border: "1px solid #114411", background: "var(--background)" }}>
      <div className={styles.clipHeader}>{title}</div>
      <div className={styles.clipBody}>{children}</div>
    </div>
  );
}
const useStyles = createUseStyles({
  clipHeader: {
    fontSize: 10,
    whiteSpace: "nowrap",
    overflow: "hidden",
    flexShrink: 0,
    paddingBottom: "0px 0px 1px 0px",
    color: "white",
    background: "#225522",
    borderBottom: "1px solid #114411",
    boxSizing: "border-box",
    // borderTopRightRadius: "3px",
    // borderTopLeftRadius: "3px",
    padding: "0px 4px",
  },
  clipBody: {
    // borderLeft: "1px solid #114411",
    // borderRight: "1px solid #114411",
    // borderBottom: "1px solid #114411",
    display: "flex",
    flexDirection: "column",
    fontSize: 11,
    alignSelf: "flex-start",
    padding: "2px 4px",
  },
});
