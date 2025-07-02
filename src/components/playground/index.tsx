import React from "react";
import PlaygroundTab from "./Tab";
import TabNavigation from "./TabNavigation";

export default function Playground() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TabNavigation />

      <div className="flex min-h-0 flex-1 flex-col">
        <PlaygroundTab />
      </div>
    </div>
  );
}
