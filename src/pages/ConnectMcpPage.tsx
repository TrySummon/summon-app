import React from "react";
import { 
  Breadcrumb, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
} from "@/components/ui/breadcrumb";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FileJson, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TabbedCodeSnippet, CodeTab } from "@/components/TabbedCodeSnippet";

const codeSnippets: CodeTab[] = [
  {
    label: "CLI Server - Node.js",
    value: "nodejs",
    language: "json",
    code: `{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "mcp-server"],
      "env": {
        "API_KEY": "value"
      }
    }
  }
}`
  },
  {
    label: "SSE Server",
    value: "sse",
    language: "json",
    code: `{
  "mcpServers": {
    "server-name": {
      "url": "http://localhost:3000/sse",
      "env": {
        "API_KEY": "value"
      }
    }
  }
}`
  },
  {
    label: "HTTP Server",
    value: "http",
    language: "json",
    code: `{
  "mcpServers": {
    "server-name": {
      "url": "http://localhost:3000/mcp",
      "transport": "http",
      "env": {
        "API_KEY": "value"
      }
    }
  }
}`
  }
];

export default function ConnectMcpPage() {
  const handleOpenUserDataFolder = async () => {
    await window.mcpApi.openUserDataMcpJsonFile();
  };

  return (
    <div className="flex flex-col h-full">
      <Breadcrumb>
        <BreadcrumbList>
            <BreadcrumbLink asChild>
              <Link to="/connect-mcp">
                <BreadcrumbPage>
                 Connect MCPs
                </BreadcrumbPage>
              </Link>
            </BreadcrumbLink>
        </BreadcrumbList>
      </Breadcrumb>
 
      <div className="flex overflow-y-auto flex-1">
      <div className="flex flex-col items-center p-10 mx-auto w-full max-w-4xl space-y-8">
          
                <div className="text-3xl font-bold mb-2">Connect External MCP Servers</div>
              <p className="text-muted-foreground mb-8">
         Add more tools to your AI playground.
        </p>
            
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>How to connect MCP servers</AlertTitle>
                <AlertDescription>
                  To connect MCP servers, you need to edit the <code>mcp.json</code> file in your user data directory.
                  This file contains the configuration for all your MCP servers.
                </AlertDescription>
              </Alert>

              <Button className="w-full" onClick={handleOpenUserDataFolder}>
                <FileJson className="h-4 w-4 mr-2" />
                Open mcp.json
              </Button>

              <TabbedCodeSnippet tabs={codeSnippets} defaultValue="nodejs" />
            </div>
            </div>
      </div>
  );
}
