import { AudioProject } from "../lib/project/AudioProject";
import { bucketize } from "../utils/data";
import { KeyCode } from "./KeyCode";

type KeyboardShortcut = [key: KeyCode, ...modifiers: ("meta" | "alt" | "ctrl" | "shift")[]];
type CommandCallback = (
  e: KeyboardEvent | null,
  project: AudioProject
  // player: AnalizedPlayer,
  // renderer: AudioRenderer,
) => void;

export class Command<S extends string[] = string[]> {
  readonly cb: CommandCallback;
  private _label: string | null = null;
  private _description: string | null = null;
  private _section: string | null = null;
  readonly shortcut: KeyboardShortcut;

  readonly onTrigger = new Set<() => void>();

  addTriggerListener(cb: () => void) {
    this.onTrigger.add(cb);
    return () => this.onTrigger.delete(cb);
  }

  execute(e: KeyboardEvent | null, project: AudioProject) {
    // return result cause save command is async, and we wait on the promise
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

  getSection(): S[number] | null {
    return this._section;
  }

  helptext(label: string, description?: string) {
    this._label = label;
    this._description = description ?? null;
    return this;
  }

  section(section: S[number]) {
    this._section = section;
    return this;
  }
}

export class CommandBlock<S extends string[], T extends Record<string, Command>> {
  private readonly byId: T;
  private readonly byKeyCode: Map<string, Command>;
  constructor(byId: T, byKeyCode: Map<string, Command>, sections: S) {
    this.byId = byId;
    this.byKeyCode = byKeyCode;
  }

  execByKeyboardEvent(
    e: KeyboardEvent,
    project: AudioProject
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

  getCommandsBySection(): Map<S[number] | null, Command[]> {
    return bucketize((c) => c.getSection(), [...this.byKeyCode.values()]);
  }

  static keyboardChordId(code: string, meta: boolean, alt: boolean, ctrl: boolean, shift: boolean) {
    return `${code}-${meta}-${alt}-${ctrl}-${shift}`;
  }

  static create<S extends string[], T extends Record<string, Command<S>>>(
    sections: S,
    commandFn: (fn: (shortcut: KeyboardShortcut, cb: CommandCallback) => Command<S>) => T
  ) {
    const byKeyCode = new Map<string, Command>();

    function command(shortcut: KeyboardShortcut, cb: CommandCallback): Command<S> {
      const set = new Set(shortcut);
      const chordId = CommandBlock.keyboardChordId(
        shortcut[0],
        set.has("meta"),
        set.has("alt"),
        set.has("ctrl"),
        set.has("shift")
      );
      const command = new Command<S>(cb, shortcut);
      if (byKeyCode.has(chordId)) {
        throw new Error("Duplicate keyboard shortcuts for command:" + chordId);
      }
      byKeyCode.set(chordId, command);
      return command;
    }

    const byId = commandFn(command);
    return new CommandBlock(byId, byKeyCode, sections);
  }
}
