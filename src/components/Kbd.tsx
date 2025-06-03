import React from "react";
import { cn } from "@/utils/tailwind";
import { Slot } from "@radix-ui/react-slot";
import { Command, CornerDownLeft } from "lucide-react";
import { ForwardedRef, forwardRef } from "react";
import { usePlatform } from "@/hooks/usePlatform";

export type KbdProps = React.HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
};

const Kbd = forwardRef(
  (
    { asChild, children, className, ...kbdProps }: KbdProps,
    forwardedRef: ForwardedRef<HTMLElement>,
  ) => {
    const { isMac } = usePlatform();
    const Comp = asChild ? Slot : "kbd";

    const formatChildren = (child: React.ReactNode): React.ReactNode => {
      if (typeof child === "string") {
        let lowerChild = child.toLowerCase();
        if (lowerChild === "enter") {
          return <CornerDownLeft className="mt-[1px] !size-2.5" />;
        }
        if (lowerChild === "cmd+enter" || lowerChild === "ctrl+enter") {
          const cmdKey = isMac ? (
            <Command className="mt-[1px] !size-2.5" />
          ) : (
            "Ctrl"
          );
          return (
            <>
              {cmdKey}
              <CornerDownLeft className="mt-[1px] ml-0.5 !size-2.5" />
            </>
          );
        }
        // Handle shift replacement
        if (lowerChild.includes("shift")) {
          lowerChild = lowerChild.replace(/shift/i, "⇧");
        }
        if (lowerChild.includes("cmd")) {
          if (isMac) {
            lowerChild = lowerChild.replace(/cmd/i, "⌘");
          } else {
            lowerChild = lowerChild.replace(/cmd/i, "Ctrl");
          }
        }
        return lowerChild;
      }
      return child;
    };

    const formattedChildren = Array.isArray(children)
      ? children.map(formatChildren)
      : formatChildren(children);

    return (
      <Comp
        {...kbdProps}
        className={cn(
          "bg-muted text-muted-foreground inline-flex items-center justify-center rounded-[4px] px-1 font-mono text-sm text-xs tracking-tight whitespace-nowrap select-none",
          className,
        )}
        ref={forwardedRef}
      >
        {formattedChildren}
      </Comp>
    );
  },
);
Kbd.displayName = "Kbd";

export { Kbd };
