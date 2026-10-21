import { useEffect } from "react";
import { useNavigate } from "react-router";
import { appEnvironment } from "../lib/AppEnvironment";
import { projectPersistance } from "../lib/ProjectPersistance";
import { closeProject } from "./header/closeProject";

type ProjectStatus = ReturnType<typeof appEnvironment.projectStatus.get>;

/** The `/project/<id>` route shape — the one place that owns it. */
export function projectPath(id: string): string {
  return `/project/${id}`;
}

/**
 * Binds the open project to `/#/project/<id>` and protects unsaved work. Composes two concerns
 * (each a hook below): keep URL and project in sync (confirming before the URL switches projects),
 * and warn on full-page exits.
 */
export function useProjectRoute(projectId: string | undefined, projectStatus: ProjectStatus): void {
  useProjectUrlSync(projectId, projectStatus);
  useUnsavedChangesUnloadGuard();
}

/**
 * Two-way sync between the URL and the loaded project. Each direction only reacts to its own side
 * changing, so a URL edit isn't immediately undone by the project → URL direction:
 * - URL → project: open whatever the URL names (reload, bookmark, back/forward, editing the hash),
 *   with the "Save changes?" confirmation (the same one the Library uses) if a different project is
 *   open. Cancelling points the URL back at the open project. Routes that name no project
 *   (`/`, `/midi`, …) just point back at the open project, since nothing would be lost.
 * - project → URL: point the address bar at whatever just loaded, however it was opened.
 *
 * This can't be a react-router `useBlocker`: the router only ever `replace`s, so every history
 * entry is browser-created (hash edits, initial load), and blockers can't undo POP navigations to
 * entries the router didn't create.
 */
function useProjectUrlSync(projectId: string | undefined, projectStatus: ProjectStatus): void {
  const navigate = useNavigate();

  // URL → project. Reads the active project at run time rather than depending on it: when an in-app
  // open loads a new project, the URL still names the old one until project → URL catches up, and
  // that's not a request to switch back.
  useEffect(() => {
    if (appEnvironment.activeProject()?.projectId === projectId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      await appEnvironment.readyPromise; // localFiles must be initialized before opening
      const active = appEnvironment.activeProject();
      // Re-check: we were cancelled, or an in-app action opened it while we waited.
      if (cancelled || active?.projectId === projectId) {
        return;
      }
      if (projectId == null) {
        if (active != null) {
          void navigate(projectPath(active.projectId), { replace: true });
        }
        return;
      }
      if (active != null) {
        const proceed = await closeProject(active);
        if (cancelled) {
          return; // the URL moved on while we were asking; the newer run handles it
        }
        if (!proceed) {
          void navigate(projectPath(active.projectId), { replace: true });
          return;
        }
      }
      await projectPersistance.openProject(projectId, false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, navigate]);

  // project → URL
  const loadedId = projectStatus.status === "loaded" ? projectStatus.project.projectId : null;
  useEffect(() => {
    if (loadedId != null) {
      void navigate(projectPath(loadedId), { replace: true });
    }
  }, [loadedId, navigate]);
}

/**
 * Native unsaved-changes prompt for full-page exits (reload, tab close) that the in-app sync
 * can't reach — the browser only allows its own generic dialog here. Reads dirty state at fire
 * time, so registering once is enough.
 */
function useUnsavedChangesUnloadGuard(): void {
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const dirty =
        appEnvironment.activeProject() != null && appEnvironment.projectDirtyObserver.dirtyState() !== "clean";
      if (dirty) {
        e.preventDefault();
        e.returnValue = ""; // legacy form still needed by some browsers
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);
}
