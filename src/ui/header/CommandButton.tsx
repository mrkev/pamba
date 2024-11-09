import { useEffect, useRef } from "react";
import { Command } from "../../input/Command";
import { AudioProject } from "../../lib/project/AudioProject";
import { cn } from "../../utils/cn";
import { utility } from "../utility";

export function CommandButton({
  command,
  project,
  children,
  className,
  title,
  onClick,
  toggled,
  toggleStyle = { backgroundColor: "var(--control-subtle-highlight)" },
  style: styleArg,
  ...props
}: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  command: Command;
  project: AudioProject;
  toggled?: boolean;
  toggleStyle?: React.CSSProperties;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timeout = useRef<number | null>(null);
  const style = toggled ? { ...styleArg, ...toggleStyle } : styleArg;

  useEffect(() => {
    return command.addTriggerListener(() => {
      const div = buttonRef?.current;
      if (
        !div ||
        timeout.current != null ||
        // don't flash command click if toggleable
        toggled != null
      ) {
        return;
      }

      const prev = div.style.background;

      div.style.background = "orange";
      // div.style.transition = "background .2s";
      timeout.current = window.setTimeout(() => {
        div.style.background = prev;
        timeout.current = null;
      }, 280);
    });
  }, [command, toggled]);

  return (
    <button
      {...props}
      style={style}
      ref={buttonRef}
      className={cn(utility.button, className)}
      title={command.label ?? title}
      onClick={async (e) => {
        onClick?.(e);
        await command.execute(null, project);
      }}
    >
      {children}
    </button>
  );
}
