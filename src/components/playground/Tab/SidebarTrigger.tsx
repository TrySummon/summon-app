import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/utils/tailwind';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import React from 'react';

interface SidebarTriggerProps extends React.ComponentProps<typeof Button> {
    showOnlyOnOpen?: boolean;
    showOnlyOnDesktop?: boolean;
}

export default function SidebarTrigger({
    className,
    onClick,
    showOnlyOnOpen,
    showOnlyOnDesktop,
    ...props
  }: SidebarTriggerProps) {
    const { toggleSidebar, open, openMobile, isMobile } = useSidebar()

    const isOpen = isMobile ? openMobile : open;

    if(showOnlyOnDesktop && isMobile) {
      return null;
    }

    if (showOnlyOnOpen && isOpen) {
      return null;
    }
  
    return (
      <Button
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon"
        className={cn("", className)}
        onClick={(event) => {
          onClick?.(event)
          toggleSidebar()
        }}
        {...props}
      >
        {isOpen ? <ArrowRight className='h-4 w-4' /> : <ArrowLeft className='h-4 w-4' />}
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
    )
  }