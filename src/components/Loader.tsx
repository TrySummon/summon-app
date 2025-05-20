import React, { JSX } from "react";
import { cn } from '@/utils/tailwind';
import { LoaderIcon } from 'lucide-react';

interface LoaderProps {
  className?: string;
}

const Loader = ({ className }: LoaderProps): JSX.Element => {
  return (
    <LoaderIcon
      className={cn('h-4 w-4 animate-spin text-primary', className)}
    />
  );
};

export { Loader };
