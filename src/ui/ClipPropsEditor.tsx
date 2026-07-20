import { ReactElement } from "react";
import { createUseStyles } from "react-jss";
import { history, useContainer, usePrimitive } from "structured-state";
import { AudioClip } from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { standardTrack } from "../lib/StandardTrack";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { TimelineTEditor } from "./TimelineTEditor";
import { UtilityTextInput } from "./UtilityButton";
import { cn } from "../utils/cn";

export function ClipPropsEditor(props: { clip: AudioClip; project: AudioProject; track: AudioTrack }): ReactElement;
export function ClipPropsEditor(props: { clip: MidiClip; project: AudioProject; track: MidiTrack }): ReactElement;
export function ClipPropsEditor({
  clip,
  project,
  track,
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
      <TimelineTEditor t={tStart} project={project} readonly defaultUnit={"bars"} />
      Length:
      <TimelineTEditor
        t={tLen}
        project={project}
        defaultUnit={clip instanceof MidiClip ? "bars" : "seconds"}
        onChange={(t, unit) => {
          history.record("resize clip", () => {
            // The overloads above pair clip with track; re-narrowing keeps that pairing
            // visible to setClipLength, which is generic over a single clip type.
            if (clip instanceof MidiClip && track instanceof MidiTrack) {
              standardTrack.setClipLength(project, track, clip, t, unit);
            } else if (clip instanceof AudioClip && track instanceof AudioTrack) {
              standardTrack.setClipLength(project, track, clip, t, unit);
            }
          });
        }}
      />
      sid:
      <UtilityTextInput value={clip._id} />
      <small>note: sid is for debugging</small>
    </EditorSection>
  );
}

export function AudioClipPropsEditor({ clip }: { clip: AudioClip; project: AudioProject }) {
  return (
    <EditorSection title={"Buffer"}>
      Filename:
      <UtilityTextInput value={clip.bufferURL} />
      Sample Rate:
      <UtilityTextInput value={String(clip.getSampleRate())} />
    </EditorSection>
  );
}

export function EditorSection({ children, title }: { children: React.ReactNode; title: string }) {
  const styles = useStyles();
  return (
    <div className="bg-background" style={{ marginRight: 4, border: "1px solid #114411" }}>
      <div className={cn(styles.clipHeader, "whitespace-nowrap overflow-hidden shrink-0 text-white box-border")}>
        {title}
      </div>
      <div className={cn(styles.clipBody, "flex flex-col self-start")}>{children}</div>
    </div>
  );
}
const useStyles = createUseStyles({
  clipHeader: {
    fontSize: 10,
    paddingBottom: "0px 0px 1px 0px",
    background: "#225522",
    borderBottom: "1px solid #114411",
    // borderTopRightRadius: "3px",
    // borderTopLeftRadius: "3px",
    padding: "0px 4px",
  },
  clipBody: {
    // borderLeft: "1px solid #114411",
    // borderRight: "1px solid #114411",
    // borderBottom: "1px solid #114411",
    fontSize: 11,
    padding: "2px 4px",
  },
});
