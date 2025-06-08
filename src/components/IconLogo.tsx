import React from "react";
import { cn } from "@/utils/tailwind";

const svgDark = (
  <svg viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M512 713.956L612.978 814.934L512 915.912L411.022 814.934L512 713.956ZM360.533 764.445L108.089 512L209.066 411.022L461.511 663.467L360.533 764.445ZM360.533 259.555L764.445 663.467L663.467 764.445L259.555 360.533L360.533 259.555ZM814.934 612.978L562.489 360.533L663.467 259.555L915.912 512L814.934 612.978ZM512 310.044L411.022 209.066L512 108.088L612.978 209.066L512 310.044Z"
      fill="white"
    />
  </svg>
);

const svgLight = (
  <svg viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M512 713.956L612.978 814.934L512 915.912L411.022 814.934L512 713.956ZM360.533 764.445L108.088 512L209.066 411.022L461.511 663.467L360.533 764.445ZM360.533 259.555L764.445 663.467L663.467 764.445L259.555 360.533L360.533 259.555ZM814.934 612.978L562.489 360.533L663.467 259.555L915.912 512L814.934 612.978ZM512 310.044L411.022 209.066L512 108.088L612.978 209.066L512 310.044Z"
      fill="black"
    />
  </svg>
);

interface LogoProps {
  className?: string;
}

export default function IconLogo({ className }: LogoProps) {
  return (
    <div className={cn("w-8 select-none", className)}>
      <div className="dark:hidden">{svgLight}</div>
      <div className="hidden dark:block">{svgDark}</div>
    </div>
  );
}
