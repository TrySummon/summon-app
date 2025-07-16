import React from "react";
import { cn } from "@/utils/tailwind";

const svg = (
  <svg viewBox="0 0 633 1044" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M64.2179 647.601V326.356L633 0V321.245L64.2179 647.601Z"
      fill="#B87333"
    />
    <path
      d="M0 1043.05V721.807L568.832 395.45V716.695L0 1043.05Z"
      fill="#B87333"
    />
  </svg>
);

interface LogoProps {
  className?: string;
}

export default function IconLogo({ className }: LogoProps) {
  return (
    <div className={cn("w-4 select-none", className)}>
      <div>{svg}</div>
    </div>
  );
}
