import { documentCommands } from "../../input/documentCommands";
import { AudioProject } from "../../lib/project/AudioProject";
import { doConfirm } from "../ConfirmDialog";

export async function closeProject(project: AudioProject) {
  const selection = await doConfirm(`Save changes to "${project.projectName.get()}"?`, "yes", "no", "cancel");

  if (selection === "cancel") {
    return false;
  }

  if (selection === "yes") {
    const savePromise = documentCommands.execById("save", project);
    if (!(savePromise instanceof Promise)) {
      throw new Error("didn't get a save promise");
    }
    await savePromise;
  }
  return true;
}
