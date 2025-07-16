import React from "react";
import { cn } from "@/utils/tailwind";
import { Slot } from "@radix-ui/react-slot";
import { ForwardedRef, forwardRef } from "react";
import { Command, ArrowUp, CornerDownLeft } from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";

export type KbdProps = React.HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
  keys?: string[];
};

const Kbd = forwardRef(
  (
    { asChild, children, keys, className, ...kbdProps }: KbdProps,
    forwardedRef: ForwardedRef<HTMLElement>,
  ) => {
    const { isMac } = usePlatform();
    const Comp = asChild ? Slot : "span";

    // Use keys prop if provided, otherwise try to extract from children
    const keyList =
      keys || (typeof children === "string" ? children.split("+") : []);

    const renderKey = (key: string) => {
      const normalizedKey = key.trim().toLowerCase();

      switch (normalizedKey) {
        case "cmd":
        case "command":
          return isMac ? (
            <Command className="h-2.5 w-2.5" />
          ) : (
            <span className="text-xs">Ctrl</span>
          );
        case "shift":
          return <ArrowUp className="h-2.5 w-2.5" />;
        case "enter":
        case "return":
          return <CornerDownLeft className="h-2.5 w-2.5" />;
        case "alt":
        case "option":
          return isMac ? (
            <span className="text-xs">⌥</span>
          ) : (
            <span className="text-xs">Alt</span>
          );
        case "ctrl":
        case "control":
          return <span className="text-xs">Ctrl</span>;
        case "space":
          return <span className="text-xs">Space</span>;
        case "tab":
          return <span className="text-xs">Tab</span>;
        case "esc":
        case "escape":
          return <span className="text-xs">Esc</span>;
        case "del":
        case "delete":
          return <span className="text-xs">Del</span>;
        default:
          // For single characters or other keys, show as uppercase
          return <span className="font-mono text-xs">{key.toUpperCase()}</span>;
      }
    };

    // If no keys to render, fall back to children
    if (keyList.length === 0) {
      return (
        <Comp
          {...kbdProps}
          className={cn(
            "text-muted-foreground ml-auto inline-flex items-center gap-1 text-xs tracking-widest",
            className,
          )}
          ref={forwardedRef}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        {...kbdProps}
        className={cn(
          "text-muted-foreground ml-auto inline-flex items-center gap-1 text-xs tracking-widest",
          className,
        )}
        ref={forwardedRef}
      >
        {keyList.map((key, index) => (
          <React.Fragment key={index}>{renderKey(key)}</React.Fragment>
        ))}
      </Comp>
    );
  },
);
Kbd.displayName = "Kbd";

export { Kbd };
