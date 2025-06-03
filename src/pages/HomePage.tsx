import React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ImportApiDialog } from "@/components/ImportApiDialog";
import { Upload, Wrench, Plug, SquareTerminal, StarIcon } from "lucide-react";
import Logo from "@/components/Logo";

export default function HomePage() {
  const GetStartedItem = ({
    icon,
    title,
    description,
    actionButton,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    actionButton: React.ReactNode;
  }) => (
    <div className="hover:bg-muted/10 flex items-center justify-between rounded-md border-b p-4 transition-colors last:border-b-0">
      <div className="flex items-center">
        <div className="bg-primary/10 text-primary mr-4 rounded-full p-3">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-medium">{title}</h4>
          <p className="text-muted-foreground max-w-md text-xs">
            {description}
          </p>
        </div>
      </div>
      {actionButton}
    </div>
  );

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <div className="flex-grow p-6 md:p-10">
        {/* Top Banner/Callout - Updated */}
        <div className="mb-12 flex flex-col items-center text-center md:flex-row md:items-start md:text-left">
          <div className="flex-1 md:pr-10">
            <div className="mb-3 inline-block">
              <Logo />
            </div>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">
              Welcome to AgentPort!
            </h2>
            <p className="text-muted-foreground mx-auto mb-6 max-w-xl text-sm md:mx-0">
              Your integrated environment for designing, building, and testing
              Model Context Protocol (MCP) servers and AI agents. Let's get you
              started.
            </p>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() =>
                window.open(
                  "https://github.com/willydouhard/agent-port",
                  "_blank",
                )
              }
            >
              <StarIcon className="mr-2 h-5 w-5 fill-yellow-400 text-yellow-400" />
              Star us on GitHub
            </Button>
          </div>
          <div className="relative mt-8 flex flex-shrink-0 items-center justify-center md:mt-0 md:h-48 md:w-48">
            {/* Faded Logo as background element */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 dark:opacity-[0.03]">
              <Logo className="pointer-events-none !gap-0 !text-[10rem] select-none" />
            </div>
          </div>
        </div>

        {/* Get Started Section */}
        <div className="mx-auto w-full max-w-4xl">
          <h3 className="mb-4 px-1 text-lg font-semibold">Get Started</h3>
          <div className="space-y-0 rounded-lg border">
            <GetStartedItem
              icon={<Upload className="h-5 w-5" />}
              title="Import an API Specification"
              description="Upload an OpenAPI (v3) file to explore its endpoints and prepare them for your MCP server."
              actionButton={
                <ImportApiDialog>
                  <Button variant="outline" size="sm">
                    Import API
                  </Button>
                </ImportApiDialog>
              }
            />
            <GetStartedItem
              icon={<Wrench className="h-5 w-5" />}
              title="Build an MCP Server"
              description="Create a new Model Context Protocol server by selecting endpoints from your imported APIs."
              actionButton={
                <Link to="/build-mcp" search={{ edit: undefined }}>
                  <Button variant="outline" size="sm">
                    Build Server
                  </Button>
                </Link>
              }
            />
            <GetStartedItem
              icon={<Plug className="h-5 w-5" />}
              title="Connect to an External MCP"
              description="Link an existing MCP server, whether local or remote, to integrate its tools into the Playground."
              actionButton={
                <Link to="/connect-mcp">
                  <Button variant="outline" size="sm">
                    Connect MCP
                  </Button>
                </Link>
              }
            />
            <GetStartedItem
              icon={<SquareTerminal className="h-5 w-5" />}
              title="Try the AI Playground"
              description="Experiment with AI models and your configured tools in an interactive chat environment."
              actionButton={
                <Link to="/playground">
                  <Button variant="outline" size="sm">
                    Open Playground
                  </Button>
                </Link>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
