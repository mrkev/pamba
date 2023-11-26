import { AudioProject } from "../lib/project/AudioProject";
import { KeyCode } from "./KeyCode";

type KeyboardShortcut = [key: KeyCode, ...modifiers: ("meta" | "alt" | "ctrl" | "shift")[]];
type CommandCallback = (
  e: KeyboardEvent | null,
  project: AudioProject,
  // player: AnalizedPlayer,
  // renderer: AudioRenderer,
) => void;

export class Command {
  readonly cb: CommandCallback;
  private _label: string | null = null;
  private _description: string | null = null;
  readonly shortcut: KeyboardShortcut;

  readonly onTrigger = new Set<() => void>();

  addTriggerListener(cb: () => void) {
    this.onTrigger.add(cb);
    return () => this.onTrigger.delete(cb);
  }

  execute(e: KeyboardEvent | null, project: AudioProject) {
    const result = this.cb(e, project);
    this.onTrigger.forEach((cb) => {
      cb();
    });
    return result;
  }

  constructor(cb: CommandCallback, shortcut: KeyboardShortcut) {
    this.cb = cb;
    this.shortcut = shortcut;
  }

  get label() {
    return this._label;
  }

  get description() {
    return this._description;
  }

  helptext(label: string, description?: string) {
    this._label = label;
    this._description = description ?? null;
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
      command.execute(e, project);
      return true;
    }
    return false;
  }

  execById(label: keyof T, project: AudioProject): unknown {
    return this.byId[label].execute(null, project);
  }

  getAllCommands(): Command[] {
    return [...this.byKeyCode.values()];
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
      const command = new Command(cb, shortcut);
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
