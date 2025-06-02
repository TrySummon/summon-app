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
    <div className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-muted/10 transition-colors rounded-md">
      <div className="flex items-center">
        <div className="p-3 bg-primary/10 rounded-full mr-4 text-primary">
          {icon}
        </div>
        <div>
          <h4 className="font-medium text-md">{title}</h4>
          <p className="text-sm text-muted-foreground max-w-md">
            {description}
          </p>
        </div>
      </div>
      {actionButton}
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full overflow-y-auto">
      <div className="flex-grow p-6 md:p-10">
        {/* Top Banner/Callout - Updated */}
        <div className="mb-12 flex flex-col md:flex-row items-center text-center md:text-left md:items-start">
          <div className="flex-1 md:pr-10">
            <div className="inline-block mb-3">
              <Logo />
            </div>
            <h2 className="text-3xl font-semibold mb-3 tracking-tight">
              Welcome to AgentPort!
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto md:mx-0">
              Your integrated environment for designing, building, and testing Model Context Protocol (MCP) servers and AI agents. Let's get you started.
            </p>
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => window.open("https://github.com/willydouhard/agent-port", "_blank")}
            >
              <StarIcon className="mr-2 h-5 w-5 text-yellow-400 fill-yellow-400" />
              Star us on GitHub
            </Button>
          </div>
          <div className="mt-8 md:mt-0 flex-shrink-0 relative flex items-center justify-center md:w-48 md:h-48">
            {/* Faded Logo as background element */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 dark:opacity-[0.03]">
              <Logo className="!text-[10rem] !gap-0 pointer-events-none select-none" />
            </div>
          </div>
        </div>

        {/* Get Started Section */}
        <div className="w-full max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold mb-4 px-1">Get Started</h3>
          <div className="space-y-0 border rounded-lg">
            <GetStartedItem
              icon={<Upload className="h-5 w-5" />}
              title="Import an API Specification"
              description="Upload an OpenAPI (v3) file to explore its endpoints and prepare them for your MCP server."
              actionButton={
                <ImportApiDialog>
                  <Button variant="outline" size="sm">Import API</Button>
                </ImportApiDialog>
              }
            />
            <GetStartedItem
              icon={<Wrench className="h-5 w-5" />}
              title="Build an MCP Server"
              description="Create a new Model Context Protocol server by selecting endpoints from your imported APIs."
              actionButton={
                <Link to="/build-mcp" search={{edit: undefined}}>
                  <Button variant="outline" size="sm">Build Server</Button>
                </Link>
              }
            />
            <GetStartedItem
              icon={<Plug className="h-5 w-5" />}
              title="Connect to an External MCP"
              description="Link an existing MCP server, whether local or remote, to integrate its tools into the Playground."
              actionButton={
                <Link to="/connect-mcp">
                  <Button variant="outline" size="sm">Connect MCP</Button>
                </Link>
              }
            />
            <GetStartedItem
              icon={<SquareTerminal className="h-5 w-5" />}
              title="Try the AI Playground"
              description="Experiment with AI models and your configured tools in an interactive chat environment."
              actionButton={
                <Link to="/playground">
                  <Button variant="outline" size="sm">Open Playground</Button>
                </Link>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}