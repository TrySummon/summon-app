import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useMcps } from "@/hooks/useMcps";
import { useNavigate } from "@tanstack/react-router";

interface CreateMcpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMcpDialog({ open, onOpenChange }: CreateMcpDialogProps) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { createMcp } = useMcps();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for the MCP server");
      return;
    }

    setIsCreating(true);
    try {
      await createMcp(
        {
          mcpData: {
            name: name.trim(),
            transport: "http",
            apiGroups: {}, // Empty initially
          },
        },
        {
          onSuccess: (result: {
            success: boolean;
            mcpId?: string;
            message?: string;
          }) => {
            if (result.mcpId) {
              toast.success(`MCP server '${name}' created successfully.`);
              onOpenChange(false);
              setName("");
              // Navigate to the McpPage for editing
              navigate({ to: "/mcp/$mcpId", params: { mcpId: result.mcpId } });
            } else {
              toast.error("Failed to create MCP server: No MCP ID returned");
            }
          },
          onError: (error: unknown) => {
            console.error(error);
            toast.error(
              `Failed to create MCP server: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          },
        },
      );
    } catch (error) {
      console.error("Error creating MCP:", error);
      toast.error("An unexpected error occurred while creating the MCP.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create MCP Server</DialogTitle>
          <DialogDescription>
            Create a new MCP server. You can configure endpoints and
            authentication after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Server Name</Label>
            <Input
              id="name"
              placeholder="My API Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isCreating}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? "Creating..." : "Create Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
