import React from "react";
import Logo from "./Logo";
import { Button } from "./ui/button";
import { StarIcon } from "lucide-react";
import {
  closeWindow,
  maximizeWindow,
  minimizeWindow,
} from "@/lib/window_helpers";
import { usePlatform } from "@/hooks/usePlatform";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function DragWindowRegion() {
  return (
    <header className="draglayer bg-sidebar sticky top-0 z-50 flex w-full border-b">
      <div className="relative flex h-[var(--header-height)] flex-grow items-center px-2">
        <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1">
          <Logo />
        </div>
        <div
          className="ml-auto flex items-center gap-2"
          // @ts-expect-error css typing issue
          style={{ "-webkit-app-region": "no-drag" }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="font-mono"
                variant="ghost"
                size="icon"
                onClick={() =>
                  window.open(
                    "https://github.com/TrySummon/summon-app",
                    "_blank",
                  )
                }
              >
                <StarIcon className="h-4 w-4 text-yellow-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Star the repo</p>
            </TooltipContent>
          </Tooltip>
          <WindowButtons />
        </div>
      </div>
    </header>
  );
}

function WindowButtons() {
  const { isMac } = usePlatform();
  if (isMac) return null;

  return (
    <div className="flex">
      <Button variant="ghost" size="icon" onClick={minimizeWindow}>
        <svg
          aria-hidden="true"
          role="img"
          width="12"
          height="12"
          viewBox="0 0 12 12"
        >
          <rect fill="currentColor" width="10" height="1" x="1" y="6"></rect>
        </svg>
      </Button>
      <Button variant="ghost" size="icon" onClick={maximizeWindow}>
        <svg
          aria-hidden="true"
          role="img"
          width="12"
          height="12"
          viewBox="0 0 12 12"
        >
          <rect
            width="9"
            height="9"
            x="1.5"
            y="1.5"
            fill="none"
            stroke="currentColor"
          ></rect>
        </svg>
      </Button>
      <Button variant="ghost" size="icon" onClick={closeWindow}>
        <svg
          aria-hidden="true"
          role="img"
          width="12"
          height="12"
          viewBox="0 0 12 12"
        >
          <polygon
            fill="currentColor"
            fillRule="evenodd"
            points="11 1.576 6.583 6 11 10.424 10.424 11 6 6.583 1.576 11 1 10.424 5.417 6 1 1.576 1.576 1 6 5.417 10.424 1"
          ></polygon>
        </svg>
      </Button>
    </div>
  );
}
