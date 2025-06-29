import { useEffect, useState } from "react";
import type { ToolAnimationEvent } from "@/hooks/useMcpActions";

type AnimationType = "added" | "deleted" | "updated" | "updating";

interface UseToolAnimationsProps {
  mcpId: string;
}

interface UseToolAnimationsReturn {
  animatingTools: Record<string, AnimationType>;
  getAnimationClasses: (toolName: string) => string;
}

export const useToolAnimations = ({
  mcpId,
}: UseToolAnimationsProps): UseToolAnimationsReturn => {
  const [animatingTools, setAnimatingTools] = useState<
    Record<string, AnimationType>
  >({});

  useEffect(() => {
    const handleToolAnimation = (event: Event) => {
      const toolEvent = event as ToolAnimationEvent;
      const { toolName, mcpId: eventMcpId, animationType } = toolEvent.detail;

      // Only handle events for this MCP
      if (eventMcpId !== mcpId) return;

      if (animationType === "start-update") {
        setAnimatingTools((prev) => ({
          ...prev,
          [toolName]: "updating",
        }));
        return;
      }

      if (animationType === "end-update") {
        setAnimatingTools((prev) => {
          const next = { ...prev };
          delete next[toolName];
          return next;
        });
        return;
      }

      // Skip if already animating this tool (except for updating state)
      if (animatingTools[toolName] && animatingTools[toolName] !== "updating") {
        return;
      }

      setAnimatingTools((prev) => ({
        ...prev,
        [toolName]: animationType as AnimationType,
      }));

      // Remove animation after duration for non-updating animations
      if (animationType === "added" || animationType === "deleted") {
        setTimeout(() => {
          setAnimatingTools((prev) => {
            const next = { ...prev };
            delete next[toolName];
            return next;
          });
        }, 2000); // 2 second animation duration
      }
    };

    window.addEventListener("tool-animation", handleToolAnimation);

    return () => {
      window.removeEventListener("tool-animation", handleToolAnimation);
    };
  }, [mcpId, animatingTools]);

  const getAnimationClasses = (toolName: string): string => {
    const animationType = animatingTools[toolName];
    if (!animationType) return "";

    switch (animationType) {
      case "added":
        return "shimmer-added";
      case "deleted":
        return "shimmer-removed";
      case "updating":
        return "shimmer";
      default:
        return "";
    }
  };

  return {
    animatingTools,
    getAnimationClasses,
  };
};
