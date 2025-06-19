import { Workspace } from "@/lib/db/workspace-db";

export const workspaceIpc = {
  listWorkspaces: (): Promise<Workspace[]> => {
    return window.workspaces.listWorkspaces();
  },

  getCurrentWorkspace: (): Promise<Workspace> => {
    return window.workspaces.getCurrentWorkspace();
  },

  setCurrentWorkspace: (workspaceId: string): Promise<boolean> => {
    return window.workspaces.setCurrentWorkspace(workspaceId);
  },

  createWorkspace: (name: string): Promise<Workspace> => {
    return window.workspaces.createWorkspace(name);
  },

  updateWorkspace: (
    id: string,
    updates: Partial<Pick<Workspace, "name">>,
  ): Promise<boolean> => {
    return window.workspaces.updateWorkspace(id, updates);
  },

  deleteWorkspace: (id: string): Promise<boolean> => {
    return window.workspaces.deleteWorkspace(id);
  },
};
