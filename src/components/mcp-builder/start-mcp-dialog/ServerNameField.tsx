import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { McpForm } from ".";

interface ServerNameFieldProps {
  form: UseFormReturn<McpForm>;
}

export function ServerNameField({ form }: ServerNameFieldProps) {
  return (
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium">MCP Server Name</FormLabel>
          <FormControl>
            <Input
              placeholder="My MCP Server"
              {...field}
              className="h-10 text-base"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
