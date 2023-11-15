import { AudioProject } from "../lib/project/AudioProject";
import { KeyCode } from "./KeyCode";

type KeyboardShortcut = [key: KeyCode, ...modifiers: ("meta" | "alt" | "ctrl" | "shift")[]];
type CommandCallback = (
  e: KeyboardEvent | null,
  project: AudioProject,
  // player: AnalizedPlayer,
  // renderer: AudioRenderer,
) => void;

class Command {
  readonly cb: CommandCallback;
  private label: string | null = null;
  private description: string | null = null;
  constructor(cb: CommandCallback) {
    this.cb = cb;
  }

  helptext(label: string, description: string) {
    this.label = label;
    this.description = description;
    return this;
  }
}

export class CommandBlock<T extends Record<string, Command>> {
  private readonly byId: T;
  private readonly byKeyCode: Map<string, Command>;
  constructor(byId: T, byKeyCode: Map<string, Command>) {
    this.byId = byId;
    this.byKeyCode = byKeyCode;
  }

  execByKeyboardEvent(
    e: KeyboardEvent,
    project: AudioProject,
    // player: AnalizedPlayer,
    // renderer: AudioRenderer,
  ): boolean {
    const chordId = CommandBlock.keyboardChordId(e.code, e.metaKey, e.altKey, e.ctrlKey, e.shiftKey);
    const command = this.byKeyCode.get(chordId);
    if (command) {
      command.cb(e, project);
      return true;
    }
    return false;
  }

  execById(label: keyof T, project: AudioProject): boolean {
    this.byId[label].cb(null, project);
    return true;
  }

  static keyboardChordId(code: string, meta: boolean, alt: boolean, ctrl: boolean, shift: boolean) {
    return `${code}-${meta}-${alt}-${ctrl}-${shift}`;
  }

  static create<T extends Record<string, Command>>(
    commandFn: (fn: (shortcut: KeyboardShortcut, cb: CommandCallback) => Command) => T,
  ) {
    const byKeyCode = new Map<string, Command>();

    function command(shortcut: KeyboardShortcut, cb: CommandCallback): Command {
      const set = new Set(shortcut);
      const chordId = CommandBlock.keyboardChordId(
        shortcut[0],
        set.has("meta"),
        set.has("alt"),
        set.has("ctrl"),
        set.has("shift"),
      );
      const command = new Command(cb);
      if (byKeyCode.has(chordId)) {
        throw new Error("Duplicate keyboard shortcuts for command:" + chordId);
      }
      byKeyCode.set(chordId, command);
      return command;
    }

    const byId = commandFn(command);
    return new CommandBlock(byId, byKeyCode);
  }
}
