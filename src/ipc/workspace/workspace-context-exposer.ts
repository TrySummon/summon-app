import { contextBridge, ipcRenderer } from "electron";
import { WORKSPACE_CHANNELS } from "./workspace-channels";
import { Workspace } from "@/lib/db/workspace-db";

export const exposeWorkspaceAPI = () => {
  try {
    contextBridge.exposeInMainWorld("workspaces", {
      listWorkspaces: (): Promise<Workspace[]> =>
        ipcRenderer.invoke(WORKSPACE_CHANNELS.LIST_WORKSPACES),

      getCurrentWorkspace: (): Promise<Workspace> =>
        ipcRenderer.invoke(WORKSPACE_CHANNELS.GET_CURRENT_WORKSPACE),

      setCurrentWorkspace: (workspaceId: string): Promise<boolean> =>
        ipcRenderer.invoke(
          WORKSPACE_CHANNELS.SET_CURRENT_WORKSPACE,
          workspaceId,
        ),

      createWorkspace: (name: string): Promise<Workspace> =>
        ipcRenderer.invoke(WORKSPACE_CHANNELS.CREATE_WORKSPACE, name),

      updateWorkspace: (
        id: string,
        updates: Partial<Pick<Workspace, "name">>,
      ): Promise<boolean> =>
        ipcRenderer.invoke(WORKSPACE_CHANNELS.UPDATE_WORKSPACE, id, updates),

      deleteWorkspace: (id: string): Promise<boolean> =>
        ipcRenderer.invoke(WORKSPACE_CHANNELS.DELETE_WORKSPACE, id),
    });
  } catch (error) {
    console.error("Failed to expose workspace context:", error);
  }
};
