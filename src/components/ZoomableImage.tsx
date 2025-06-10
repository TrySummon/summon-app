import React from "react";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/utils/tailwind";
import { DetailedHTMLProps, ImgHTMLAttributes } from "react";

export const ZoomableImage = ({
  alt = "",
  className,
  src,
  ...other
}: DetailedHTMLProps<
  ImgHTMLAttributes<HTMLImageElement>,
  HTMLImageElement
>) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <img
          alt={alt}
          className={cn("cursor-zoom-in", className)}
          src={src}
          {...other}
        />
      </DialogTrigger>
      <DialogContent className="max-w-7xl border-0 bg-transparent p-0">
        <div className="relative h-[calc(100vh-220px)] w-full overflow-clip rounded-md bg-transparent">
          <img alt={alt} className="h-full w-full object-contain" src={src} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
