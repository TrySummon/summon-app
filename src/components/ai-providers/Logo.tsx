import React from "react";
import { cn } from "@/utils/tailwind";

export default function ProviderLogo({
  svgString,
  width,
  className,
}: {
  svgString: string;
  width: number;
  className?: string;
}) {
  const svgUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
  return (
    <img
      className={cn(
        "h-auto rounded bg-transparent p-1 dark:bg-white",
        className,
      )}
      width={0}
      height={0}
      sizes="100vw"
      style={{ width }}
      src={svgUrl}
      alt="Provider Logo"
    />
  );
}
