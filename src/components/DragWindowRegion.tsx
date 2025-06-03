import React from "react";
import Logo from "./Logo";
import { Button } from "./ui/button";
import { StarIcon } from "lucide-react";

export default function DragWindowRegion() {
  return (
    <header className="draglayer bg-sidebar sticky top-0 z-50 flex w-full border-b">
      <div className="relative flex h-[var(--header-height)] flex-grow items-center px-4">
        <Logo className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="ml-auto" style={{ "-webkit-app-region": "no-drag" }}>
          <Button
            className="font-mono"
            variant="ghost"
            size="sm"
            onClick={() =>
              window.open("https://github.com/willydouhard/toolman", "_blank")
            }
          >
            <StarIcon className="mr-2 h-4 w-4 text-yellow-500" />
            Star us
          </Button>
        </div>
      </div>
    </header>
  );
}
