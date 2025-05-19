import React from "react";
import { Server, Globe, ExternalLink, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ServerVariable {
  default: string;
  enum?: string[];
  description?: string;
}

interface ServerObject {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

interface ServerInformationProps {
  servers: ServerObject[];
}

export function ServerInformation({ servers }: ServerInformationProps) {
  if (!servers || servers.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <div className="flex items-center">
          <Globe className="mr-2 h-5 w-5 text-muted-foreground" />
          <CardTitle>Servers</CardTitle>
        </div>
        <CardDescription>
          Available server endpoints for this API
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {servers.map((server, index) => (
            <div key={index} className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Server className="mr-2 h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">
                    {server.description || `Server ${index + 1}`}
                  </h4>
                </div>
                <div className="flex">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(server.url);
                            toast.success("Server URL copied to clipboard");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy URL</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {server.url.startsWith('http') && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(server.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Open in new tab</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {server.url}
                </Badge>
              </div>
              {server.variables && Object.keys(server.variables).length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium mb-2">Variables:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(server.variables).map(([name, variable]) => (
                      <div key={name} className="flex items-center space-x-2 text-sm">
                        <span className="font-medium">{name}:</span>
                        <span>{variable.default}</span>
                        {variable.enum && (
                          <Badge variant="secondary" className="text-xs">
                            {variable.enum.length} options
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
