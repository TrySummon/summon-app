import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronDown,
  Plus,
  Check,
  FolderOpen,
  Settings,
  Trash2,
} from "lucide-react";
import {
  useWorkspaces,
  useCurrentWorkspace,
  useCreateWorkspace,
  useSetCurrentWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
} from "@/hooks/useWorkspaces";
import { toast } from "sonner";
import IconLogo from "./IconLogo";

export function WorkspaceSelector() {
  const { data: workspaces = [] } = useWorkspaces();
  const { data: currentWorkspace } = useCurrentWorkspace();
  const createWorkspace = useCreateWorkspace();
  const setCurrentWorkspace = useSetCurrentWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [workspaceToRename, setWorkspaceToRename] = useState<string | null>(
    null,
  );
  const [workspaceToDelete, setWorkspaceToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    try {
      const newWorkspace = await createWorkspace.mutateAsync(
        newWorkspaceName.trim(),
      );
      // Switch to the newly created workspace automatically
      await setCurrentWorkspace.mutateAsync(newWorkspace.id);
      setNewWorkspaceName("");
      setIsCreateDialogOpen(false);
      toast.success(`Created and switched to workspace "${newWorkspace.name}"`);
    } catch (error) {
      console.error("Failed to create workspace:", error);
      toast.error("Failed to create workspace");
    }
  };

  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (workspaceId === currentWorkspace?.id) return;

    const workspace = workspaces.find((w) => w.id === workspaceId);

    toast.promise(setCurrentWorkspace.mutateAsync(workspaceId), {
      loading: `Switching to "${workspace?.name}"...`,
      success: `Switched to "${workspace?.name}"`,
      error: "Failed to switch workspace",
    });
  };

  const handleRenameWorkspace = async () => {
    if (!workspaceToRename || !renameValue.trim()) return;

    try {
      await updateWorkspace.mutateAsync({
        id: workspaceToRename,
        updates: { name: renameValue.trim() },
      });
      setWorkspaceToRename(null);
      setRenameValue("");
      setIsRenameDialogOpen(false);
      toast.success("Workspace renamed successfully");
    } catch (error) {
      console.error("Failed to rename workspace:", error);
      toast.error("Failed to rename workspace");
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;

    if (workspaces.length <= 1) {
      toast.error("Cannot delete the last workspace");
      return;
    }

    try {
      const isCurrentWorkspace = workspaceToDelete.id === currentWorkspace?.id;

      await deleteWorkspace.mutateAsync(workspaceToDelete.id);

      // If we deleted the current workspace, switch to another one
      if (isCurrentWorkspace) {
        const remainingWorkspaces = workspaces.filter(
          (w) => w.id !== workspaceToDelete.id,
        );
        if (remainingWorkspaces.length > 0) {
          const nextWorkspace = remainingWorkspaces[0];
          await setCurrentWorkspace.mutateAsync(nextWorkspace.id);
          toast.success(
            `Workspace "${workspaceToDelete.name}" deleted. Switched to "${nextWorkspace.name}"`,
          );
        }
      } else {
        toast.success(`Workspace "${workspaceToDelete.name}" deleted`);
      }

      setWorkspaceToDelete(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete workspace:", error);
      toast.error("Failed to delete workspace");
    }
  };

  const openRenameDialog = (workspaceId: string, currentName: string) => {
    setWorkspaceToRename(workspaceId);
    setRenameValue(currentName);
    setIsRenameDialogOpen(true);
  };

  const openDeleteDialog = (workspaceId: string, workspaceName: string) => {
    setWorkspaceToDelete({ id: workspaceId, name: workspaceName });
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="hover:bg-accent/50 h-8 w-full justify-between px-2 transition-colors"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <IconLogo className="text-muted-foreground -mt-[6px] h-3 w-3 flex-shrink-0" />
              <span className="truncate font-medium">
                {currentWorkspace?.name || "Loading..."}
              </span>
            </div>
            <ChevronDown className="text-muted-foreground h-4 w-4 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <div className="px-2 py-1.5">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Workspaces
            </p>
          </div>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => handleSwitchWorkspace(workspace.id)}
              className="flex cursor-pointer items-center justify-between px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <FolderOpen className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                <span className="truncate">{workspace.name}</span>
              </div>
              {currentWorkspace?.id === workspace.id && (
                <Check className="text-primary h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="cursor-pointer px-3 py-2.5"
              >
                <Plus className="mr-2.5 h-4 w-4" />
                <span>Create Workspace</span>
              </DropdownMenuItem>
            </DialogTrigger>
          </Dialog>

          {currentWorkspace && (
            <>
              <DropdownMenuItem
                onClick={() =>
                  openRenameDialog(currentWorkspace.id, currentWorkspace.name)
                }
                className="cursor-pointer px-3 py-2.5"
              >
                <Settings className="mr-2.5 h-4 w-4" />
                <span>Rename Current</span>
              </DropdownMenuItem>

              {workspaces.length > 1 && (
                <DropdownMenuItem
                  onClick={() =>
                    openDeleteDialog(currentWorkspace.id, currentWorkspace.name)
                  }
                  className="text-destructive focus:text-destructive cursor-pointer px-3 py-2.5"
                >
                  <Trash2 className="mr-2.5 h-4 w-4" />
                  <span>Delete Current</span>
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Workspace Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace to organize your APIs, datasets, and MCP
              servers. You'll be automatically switched to the new workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="e.g., Production, Development, Team Alpha"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateWorkspace();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkspace}
              disabled={!newWorkspaceName.trim() || createWorkspace.isPending}
            >
              {createWorkspace.isPending ? "Creating..." : "Create & Switch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Workspace Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Workspace</DialogTitle>
            <DialogDescription>
              Change the name of your current workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-workspace">Workspace Name</Label>
              <Input
                id="rename-workspace"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter new workspace name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameWorkspace();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameWorkspace}
              disabled={!renameValue.trim() || updateWorkspace.isPending}
            >
              {updateWorkspace.isPending ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the workspace "
              {workspaceToDelete?.name}"? This action cannot be undone and will
              permanently remove all associated APIs, datasets, and MCP servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteWorkspace}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteWorkspace.isPending}
            >
              {deleteWorkspace.isPending ? "Deleting..." : "Delete Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
