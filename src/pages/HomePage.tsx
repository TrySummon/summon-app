import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CreateMcpDialog } from "@/components/CreateMcpDialog";
import IconLogo from "@/components/IconLogo";
import { Wrench, Plug, MessageCircle, StarIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function HomePage() {
  const [createMcpOpen, setCreateMcpOpen] = useState(false);
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
      <div className="relative z-10 flex-grow p-6 md:p-10">
        <div className="pointer-events-none absolute top-4 right-8 z-0 hidden opacity-5 lg:block dark:opacity-15">
          <IconLogo className="w-36" />
        </div>
        {/* Top Banner/Callout - Updated */}
        <div className="mb-12 flex flex-col items-center text-center md:flex-row md:items-start md:text-left">
          <div className="flex-1 md:pr-10">
            <h1 className="mb-3 text-2xl font-semibold tracking-tight">
              Welcome to Summon!
            </h1>
            <p className="text-muted-foreground mx-auto mb-6 max-w-xl text-sm md:mx-0">
              The Collaborative Desktop App for Teams to Build, Test, and Manage
              MCP Servers & AI Agents — all in one place.
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() =>
                    window.open(
                      "https://github.com/TrySummon/summon-app",
                      "_blank",
                    )
                  }
                >
                  <StarIcon className="mr-2 h-5 w-5 fill-yellow-400 text-yellow-400" />
                  Star us on GitHub
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Star the repo</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Get Started Section */}
        <div className="mx-auto w-full max-w-4xl">
          <h3 className="mb-4 px-1 text-lg font-semibold">Get Started</h3>
          <div className="space-y-0 rounded-lg border">
            <GetStartedItem
              icon={<Wrench className="h-5 w-5" />}
              title="Build an MCP Server"
              description="Create a new Model Context Protocol server by selecting endpoints from your imported APIs."
              actionButton={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateMcpOpen(true)}
                >
                  Build Server
                </Button>
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
              icon={<MessageCircle className="h-5 w-5" />}
              title="Chat with your MCPs in the Playground"
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

      <CreateMcpDialog open={createMcpOpen} onOpenChange={setCreateMcpOpen} />
    </div>
  );
}
