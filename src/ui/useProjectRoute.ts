import { useCallback, useEffect, useRef } from "react";
import { BlockerFunction, useBlocker, useNavigate } from "react-router";
import { appEnvironment } from "../lib/AppEnvironment";
import { projectPersistance } from "../lib/ProjectPersistance";
import { closeProject } from "./header/closeProject";

type ProjectStatus = ReturnType<typeof appEnvironment.projectStatus.get>;

/** The `/project/<id>` route shape and its inverse — the one place that owns it. */
export function projectPath(id: string): string {
  return `/project/${id}`;
}
function projectIdOfPath(pathname: string): string | null {
  const match = /^\/project\/([^/]+)$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Binds the open project to `/#/project/<id>` and protects unsaved work. Composes three concerns
 * (each a hook below): keep URL and project in sync, confirm before the browser leaves a project,
 * and warn on full-page exits.
 */
export function useProjectRoute(projectId: string | undefined, projectStatus: ProjectStatus): void {
  useProjectUrlSync(projectId, projectStatus);
  useLeaveProjectGuard();
  useUnsavedChangesUnloadGuard();
}

/**
 * Two-way sync between the URL and the loaded project. Each direction is a no-op once the ids
 * match, so they settle instead of ping-ponging:
 * - URL → project: open whatever the URL names (reload, bookmark, back/forward).
 * - project → URL: point the address bar at whatever just loaded, however it was opened.
 */
function useProjectUrlSync(projectId: string | undefined, projectStatus: ProjectStatus): void {
  const navigate = useNavigate();

  // URL → project
  useEffect(() => {
    if (projectId == null || appEnvironment.activeProject()?.projectId === projectId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      await appEnvironment.readyPromise; // localFiles must be initialized before opening
      // Re-check: we were cancelled, or an in-app action opened it while we waited.
      if (cancelled || appEnvironment.activeProject()?.projectId === projectId) {
        return;
      }
      await projectPersistance.openProject(projectId, false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // project → URL
  useEffect(() => {
    if (projectStatus.status !== "loaded") {
      return;
    }
    const loadedId = projectStatus.project.projectId;
    if (projectId !== loadedId) {
      void navigate(projectPath(loadedId), { replace: true });
    }
  }, [projectStatus, projectId, navigate]);
}

/**
 * "Save changes?" confirmation (the same one the Library uses) when the *browser* leaves the open
 * project — back/forward, editing the hash, heading to the landing page. In-app opens swap the
 * active project before the URL changes, so by the time that navigation fires it already matches
 * the active project and isn't blocked; that's what keeps this from double-prompting.
 */
function useLeaveProjectGuard(): void {
  const shouldBlock = useCallback<BlockerFunction>(({ currentLocation, nextLocation }) => {
    const active = appEnvironment.activeProject();
    if (active == null || currentLocation.pathname === nextLocation.pathname) {
      return false; // nothing open to lose, or our own same-URL replace-sync
    }
    // Navigating to the project that's already open loses nothing.
    return projectIdOfPath(nextLocation.pathname) !== active.projectId;
  }, []);

  const blocker = useBlocker(shouldBlock);

  const handlingRef = useRef(false); // one confirmation per blocked navigation
  useEffect(() => {
    if (blocker.state !== "blocked") {
      handlingRef.current = false;
      return;
    }
    if (handlingRef.current) {
      return;
    }
    handlingRef.current = true;

    const active = appEnvironment.activeProject();
    void (async () => {
      const proceed = active == null || (await closeProject(active));
      if (proceed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    })();
  }, [blocker]);
}

/**
 * Native unsaved-changes prompt for full-page exits (reload, tab close) that the in-app blocker
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
