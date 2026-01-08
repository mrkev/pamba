import React, { useCallback, useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { Command } from "../../input/Command";
import { AudioProject } from "../../lib/project/AudioProject";
import { cn } from "../../utils/cn";
import { keyStr } from "../KeyboardKey";
import { utility } from "../utility";
import { CommandButton } from "./CommandButton";

export function CommandMenu({
  label,
  items,
  project,
  className,
  style,
}: {
  label: string;
  items: ([string, Command] | "separator")[];
  project: AudioProject;
  className?: string;
  style?: React.CSSProperties;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const styles = useStyles();

  const timeout = useRef<number | null>(null);
  const onMenuCommandTriggered = useCallback(() => {
    const div = buttonRef?.current;
    if (
      !div ||
      timeout.current != null
      // don't flash command click if toggleable
      // || toggled != null
    ) {
      return;
    }

    const prev = div.style.background;
    div.style.background = "orange";

    // div.style.transition = "background .2s";
    timeout.current = window.setTimeout(() => {
      div.style.background = prev;
      timeout.current = null;
      (document.activeElement as HTMLElement | null)?.blur();
    }, 280);
  }, []);

  useEffect(() => {
    const elem = buttonRef.current;
    if (elem == null) {
      return;
    }

    const open = (e: FocusEvent) => {
      setOpen(true);
    };

    const close = (e: FocusEvent) => {
      setOpen(false);
    };

    elem.addEventListener("focus", open);
    elem.addEventListener("blur", close);

    return () => {
      elem.removeEventListener("focus", open);
      elem.removeEventListener("blur", close);
    };
  }, []);

  return (
    <div className={cn("relative group", className)} style={style}>
      <button
        ref={buttonRef}
        className={utility.button}
        style={{
          background: open ? "var(--control-subtle-highlight)" : undefined,
        }}
      >
        {label}
      </button>

      {/* menu */}
      <div
        className={cn("name-menu", "absolute top-full z-10 hidden bg-control-bg-color", "group-focus-within:block")}
        style={{
          minWidth: 70,
          borderBottom: "1px solid var(--control-subtle-highlight)",
        }}
      >
        {items.map((item, i) => {
          if (item === "separator") {
            return <hr key={i} />;
          }

          const [label, command] = item;

          return (
            <CommandButton
              key={label}
              style={{ justifyContent: "start" }}
              className={cn(styles.menuItem, "cursor-pointer whitespace-nowrap font-bold w-full flex flex-row gap-1")}
              command={command}
              project={project}
              onFlash={onMenuCommandTriggered}
            >
              {label}
              <span className="grow min-w-1"></span>
              <span className="text-control-subtle-highlight">
                {[...command.shortcut]
                  .reverse()
                  .map((x, i) => keyStr(x))
                  .join("")}
              </span>
            </CommandButton>
          );
        })}
      </div>
    </div>
  );
}

const useStyles = createUseStyles({
  menuItem: {
    padding: "1px 6px",
    color: "var(--control-text-color)",
    "&:hover": {
      background: "#23272D",
      color: "white",
    },
  },
});
