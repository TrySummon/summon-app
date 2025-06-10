import React, { useState } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { McpForm } from ".";

interface ServerUrlFieldProps {
  form: UseFormReturn<McpForm>;
  apiId: string;
  serverUrls: Array<{ url: string; description?: string }>;
}

export function ServerUrlField({
  form,
  apiId,
  serverUrls,
}: ServerUrlFieldProps) {
  const [customMode, setCustomMode] = useState(false);

  // Initialize with first server URL if available and no value is set
  React.useEffect(() => {
    if (serverUrls.length > 0) {
      form.setValue(`configuredAuth.${apiId}.serverUrl`, serverUrls[0].url);
    } else {
      setCustomMode(true);
    }
  }, [serverUrls, apiId, form]);

  // Toggle between select and input modes
  const toggleCustomMode = () => {
    setCustomMode(!customMode);

    // If switching to select mode and we have server URLs available,
    // set to the first server URL
    if (customMode && serverUrls.length > 0) {
      form.setValue(`configuredAuth.${apiId}.serverUrl`, serverUrls[0].url);
    }
  };

  return (
    <FormField
      control={form.control}
      name={`configuredAuth.${apiId}.serverUrl`}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel className="text-xs">Server URL</FormLabel>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleCustomMode}
              className="text-muted-foreground h-6 px-2 text-xs"
            >
              {customMode ? "Use predefined URL" : "Use custom URL"}
            </Button>
          </div>
          <FormControl>
            {customMode ? (
              <Input placeholder="https://api.example.com" {...field} />
            ) : (
              <Select
                onValueChange={field.onChange}
                value={field.value || ""}
                disabled={serverUrls.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        serverUrls.length === 0
                          ? "No server URLs available"
                          : "Select a server URL"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {serverUrls.map((server, index) => (
                    <SelectItem key={index} value={server.url}>
                      {server.description ? (
                        <div className="flex flex-col">
                          <span>{server.url}</span>
                          <span className="text-muted-foreground text-xs">
                            {server.description}
                          </span>
                        </div>
                      ) : (
                        server.url
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
