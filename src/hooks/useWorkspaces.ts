import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceIpc } from "@/ipc/workspace/workspace-client";
import { Workspace } from "@/lib/db/workspace-db";
import { LIST_API_QUERY_KEY } from "./useApis";
import { DATASET_QUERY_KEY } from "./useDatasets";
import { MCP_QUERY_KEY } from "./useMcps";
import { EXTERNAL_MCPS_QUERY_KEY } from "./useExternalMcps";

export const useWorkspaces = () => {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: workspaceIpc.listWorkspaces,
  });
};

export const useCurrentWorkspace = () => {
  return useQuery({
    queryKey: ["current-workspace"],
    queryFn: workspaceIpc.getCurrentWorkspace,
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => workspaceIpc.createWorkspace(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<Workspace, "name">>;
    }) => workspaceIpc.updateWorkspace(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["current-workspace"] });
    },
  });
};

export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspaceIpc.deleteWorkspace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["current-workspace"] });
    },
  });
};

export const useSetCurrentWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) =>
      workspaceIpc.setCurrentWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-workspace"] });
      // Invalidate all data queries since changing workspace affects all data
      queryClient.invalidateQueries({ queryKey: [LIST_API_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DATASET_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MCP_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [EXTERNAL_MCPS_QUERY_KEY] });
    },
  });
};
