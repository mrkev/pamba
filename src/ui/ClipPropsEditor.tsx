import { createUseStyles } from "react-jss";
import { usePrimitive } from "structured-state";
import { AudioClip } from "../lib/AudioClip";
import { AudioProject } from "../lib/project/AudioProject";
import { TimeUnit, TimelineT } from "../lib/project/TimelineT";
import { exhaustive } from "../utils/exhaustive";
import { UtilityTextInput } from "./UtilityButton";
import { TimelineTEditor } from "./TimelineTEditor";

const tp = new TimelineT(96, "pulses");

export function ClipPropsEditor({ clip, project }: { clip: AudioClip; project: AudioProject }) {
  const [name] = usePrimitive(clip.name);
  const styles = useStyles();

  return (
    <div style={{ marginRight: 4, alignSelf: "center" }}>
      <div
        className={styles.clipHeader}
        style={{
          color: "white",
          background: "#225522",
          border: "1px solid #114411",
          boxSizing: "border-box",
          borderTopRightRadius: "3px",
          borderTopLeftRadius: "3px",
          padding: "0px 4px",
        }}
      >
        Clip
      </div>
      <div
        style={{
          borderLeft: "1px solid #114411",
          borderRight: "1px solid #114411",
          borderBottom: "1px solid #114411",
          display: "flex",
          flexDirection: "column",
          fontSize: 12,
          alignSelf: "flex-start",
          padding: "2px 4px",
          background: "#4e4e4e",
        }}
      >
        Name:
        <UtilityTextInput
          value={name}
          onChange={function (value: string): string | void | Promise<string | void> {
            clip.name.set(value);
          }}
        />
        Length:
        <input type="number" value={clip.clipLengthSec} disabled />
        Filename:
        <input type="text" value={clip.bufferURL} disabled />
        Sample Rate:
        <input type="number" value={clip.sampleRate} disabled />
        sid:
        <input type="text" value={clip._id} disabled />
        <small>note: sid is for debugging</small>
        <TimelineTEditor t={tp} project={project} />
      </div>
    </div>
  );
}

const useStyles = createUseStyles({
  clipHeader: {
    opacity: 0.8,
    fontSize: 10,
    whiteSpace: "nowrap",
    overflow: "hidden",
    flexShrink: 0,
    paddingBottom: "0px 0px 1px 0px",
  },
});
