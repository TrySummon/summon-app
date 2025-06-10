import React, { JSX } from "react";
import { cn } from "@/utils/tailwind";
import { LoaderIcon } from "lucide-react";

interface LoaderProps {
  className?: string;
}

const Loader = ({ className }: LoaderProps): JSX.Element => {
  return (
    <LoaderIcon
      className={cn("text-primary h-4 w-4 animate-spin", className)}
    />
  );
};

export { Loader };
