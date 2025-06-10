import React from "react";
import PlaygroundTab from "./Tab";
import TabNavigation from "./TabNavigation";

export default function Playground() {
  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          <TabNavigation />

          <div className="flex flex-1 flex-col overflow-y-auto">
            <PlaygroundTab />
          </div>
        </div>
      </div>
    </div>
  );
}
