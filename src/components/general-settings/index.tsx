import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeMode } from "@/types/theme-mode";
import { getCurrentTheme, setTheme } from "@/lib/theme_helpers";
import { Moon, Sun, Monitor } from "lucide-react";

export const GeneralSettings: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>("system");

  useEffect(() => {
    const loadTheme = async () => {
      const { local } = await getCurrentTheme();
      if (local) {
        setCurrentTheme(local);
      } else {
        setCurrentTheme("system");
      }
    };

    loadTheme();
  }, []);

  const handleThemeChange = async (value: ThemeMode) => {
    setCurrentTheme(value);
    await setTheme(value);
  };

  const getThemeIcon = (theme: ThemeMode) => {
    switch (theme) {
      case "dark":
        return <Moon className="mr-2 h-4 w-4" />;
      case "light":
        return <Sun className="mr-2 h-4 w-4" />;
      case "system":
        return <Monitor className="mr-2 h-4 w-4" />;
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">General Settings</h2>
      </div>

      <p className="text-muted-foreground mb-4 text-sm">
        Configure general application settings.
      </p>

      <div className="grid gap-4">
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="theme-select" className="text-sm font-medium">
            Theme
          </label>
          <Select value={currentTheme} onValueChange={handleThemeChange}>
            <SelectTrigger id="theme-select" className="w-[200px]">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center">
                  {getThemeIcon("light")}
                  Light
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center">
                  {getThemeIcon("dark")}
                  Dark
                </div>
              </SelectItem>
              <SelectItem value="system">
                <div className="flex items-center">
                  {getThemeIcon("system")}
                  System
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Choose your preferred theme for the application.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
