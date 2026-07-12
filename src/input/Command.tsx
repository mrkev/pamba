import { AudioProject } from "../lib/project/AudioProject";
import { bucketize } from "../utils/data";
import { KeyCode } from "./KeyCode";

export type KeyboardShortcut = [key: KeyCode, ...modifiers: ("meta" | "alt" | "ctrl" | "shift")[]];
type CommandCallback = (
  e: KeyboardEvent | null,
  project: AudioProject,
  // player: AnalizedPlayer,
  // renderer: AudioRenderer,
) => void;

export class Command<S extends string[] = string[]> {
  readonly cb: CommandCallback;
  private _label: string | null = null;
  private _description: string | null = null;
  private _section: string | null = null;
  private _when: ((project: AudioProject) => boolean) | null = null;
  readonly shortcut: KeyboardShortcut;

  readonly onTrigger = new Set<() => void>();

  addTriggerListener(cb: () => void) {
    this.onTrigger.add(cb);
    return () => {
      this.onTrigger.delete(cb);
    };
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

  /**
   * Restrict this command to a context (e.g. "the MIDI editor is focused"). Multiple
   * commands can share a chord as long as their `when` predicates disambiguate them; a
   * matching contextual command wins over an unguarded (global) one. See
   * `CommandBlock.execByKeyboardEvent`.
   */
  when(predicate: (project: AudioProject) => boolean) {
    this._when = predicate;
    return this;
  }

  /** Whether this command is gated by a `when` predicate. */
  isContextual(): boolean {
    return this._when != null;
  }

  /** Whether this command may run given the current project state. */
  matches(project: AudioProject): boolean {
    return this._when == null || this._when(project);
  }
}

export class CommandBlock<S extends string[], T extends Record<string, Command>> {
  private readonly byId: T;
  private readonly byKeyCode: Map<string, Command[]>;
  constructor(byId: T, byKeyCode: Map<string, Command[]>, _sections: S) {
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
    const commands = this.byKeyCode.get(chordId);
    if (commands == null) {
      return false;
    }
    // A contextual command (with a passing `when`) wins; otherwise fall back to an
    // unguarded command bound to the same chord.
    let fallback: Command | undefined;
    for (const command of commands) {
      if (!command.isContextual()) {
        fallback ??= command;
        continue;
      }
      if (command.matches(project)) {
        command.execute(e, project);
        return true;
      }
    }
    if (fallback != null) {
      fallback.execute(e, project);
      return true;
    }
    return false;
  }

  execById(label: keyof T, project: AudioProject): unknown {
    return this.byId[label].execute(null, project);
  }

  getById(label: keyof T): Command {
    return this.byId[label];
  }

  getAllCommands(): Command[] {
    return [...this.byKeyCode.values()].flat();
  }

  getCommandsBySection(): Map<S[number] | null, Command[]> {
    return bucketize((c) => c.getSection(), [...this.byKeyCode.values()].flat());
  }

  static keyboardChordId(code: string, meta: boolean, alt: boolean, ctrl: boolean, shift: boolean) {
    return `${code}-${meta}-${alt}-${ctrl}-${shift}`;
  }

  static create<S extends string[], T extends Record<string, Command<S>>>(
    sections: S,
    commandFn: (fn: (shortcut: KeyboardShortcut, cb: CommandCallback) => Command<S>) => T,
  ) {
    const byKeyCode = new Map<string, Command[]>();

    function command(shortcut: KeyboardShortcut, cb: CommandCallback): Command<S> {
      const set = new Set(shortcut);
      const chordId = CommandBlock.keyboardChordId(
        shortcut[0],
        set.has("meta"),
        set.has("alt"),
        set.has("ctrl"),
        set.has("shift"),
      );
      const command = new Command<S>(cb, shortcut);
      // Multiple commands may share a chord as long as they're disambiguated by `when`
      // (resolved in execByKeyboardEvent). Registration order is preserved.
      const existing = byKeyCode.get(chordId);
      if (existing != null) {
        existing.push(command);
      } else {
        byKeyCode.set(chordId, [command]);
      }
      return command;
    }

    const byId = commandFn(command);
    return new CommandBlock(byId, byKeyCode, sections);
  }
}
