import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { cn } from "@/utils/tailwind";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
} from "@/components/ui/navigation-menu";

export interface NavItem {
  name: string;
  href: string;
  value: string;
}

export interface SubNavProps {
  items: NavItem[];
  defaultValue?: string;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function SubNav({
  items,
  defaultValue,
  className,
  value,
  onValueChange,
}: SubNavProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(
    value || defaultValue || items[0]?.value || "",
  );
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    // If value prop is provided, use it
    if (value !== undefined) {
      setActiveTab(value);
      return;
    }

    // Set the initial pathname
    setPathname(window.location.pathname);

    // Update the active tab based on the current pathname
    for (const item of items) {
      if (pathname.includes(item.value)) {
        setActiveTab(item.value);
        return;
      }
    }
    // If no match is found, use the default value or the first item
    setActiveTab(defaultValue || items[0]?.value || "");
  }, [pathname, items, defaultValue, value]);

  const handleNavigation = (href: string, itemValue: string) => {
    if (onValueChange) {
      onValueChange(itemValue);
    } else {
      navigate({ to: href });
    }
  };

  return (
    <div className={cn("mb-4", className)}>
      <NavigationMenu className="w-full">
        <NavigationMenuList className="h-fit justify-start space-x-4 bg-transparent p-0">
          {items.map((item) => (
            <NavigationMenuItem key={item.value}>
              <div
                className={cn(
                  "h-full cursor-pointer rounded-none border-0 border-b-2 border-transparent px-1 pb-1 text-sm",
                  "text-muted-foreground hover:text-foreground transition-colors",
                  activeTab === item.value && "border-primary text-foreground",
                )}
                onClick={() => handleNavigation(item.href, item.value)}
              >
                {item.name}
              </div>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
