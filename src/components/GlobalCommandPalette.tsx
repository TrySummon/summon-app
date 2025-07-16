import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useGlobalCommandPalette } from "./GlobalCommandPaletteProvider";
import { useDatasets } from "@/hooks/useDatasets";
import { useMcps } from "@/hooks/useMcps";
import { useApis } from "@/hooks/useApis";
import { useExternalMcps } from "@/hooks/useExternalMcps";
import useToolMap from "@/hooks/useToolMap";
import { Badge } from "@/components/ui/badge";
import { Database, Server, Layers, ArrowRight, Wrench } from "lucide-react";
import { Dataset, DatasetItem } from "@/types/dataset";
import { McpData } from "@/lib/db/mcp-db";
import McpIcon from "@/components/icons/mcp";

// Search result types
interface SearchResult {
  id: string;
  title: string;
  category:
    | "datasets"
    | "dataset-items"
    | "mcp-servers"
    | "mcp-tools"
    | "api-endpoints";
  icon: React.ReactNode;
  path: string;
  badges?: string[];
}

export function GlobalCommandPalette() {
  const { isOpen, close } = useGlobalCommandPalette();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Data hooks
  const { datasets = [] } = useDatasets();
  const { mcps = [] } = useMcps();
  const { apis = [] } = useApis();
  const { externalMcps = {} } = useExternalMcps();
  const { mcpToolMap } = useToolMap();

  // Clear search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Generate search results
  const searchResults = useMemo(() => {
    const results: SearchResult[] = [];
    const query = searchQuery.toLowerCase().trim();

    // Search datasets
    datasets.forEach((dataset: Dataset) => {
      if (
        !query ||
        dataset.name.toLowerCase().includes(query) ||
        dataset.description?.toLowerCase().includes(query) ||
        dataset.tags?.some((tag) => tag.toLowerCase().includes(query))
      ) {
        results.push({
          id: `dataset-${dataset.id}`,
          title: dataset.name,
          category: "datasets",
          icon: <Database className="h-4 w-4" />,
          path: `/datasets/${dataset.id}`,
          badges: dataset.tags?.slice(0, 2),
        });
      }

      // Search dataset items (only when there's a query)
      if (query) {
        dataset.items?.forEach((item: DatasetItem) => {
          if (
            item.name.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query)
          ) {
            results.push({
              id: `dataset-item-${item.id}`,
              title: `${item.name} (${dataset.name})`,
              category: "dataset-items",
              icon: <Layers className="h-4 w-4" />,
              path: `/datasets/${dataset.id}/item/${item.id}`,
            });
          }
        });
      }
    });

    // Search MCPs
    mcps.forEach((mcp: McpData) => {
      if (!query || mcp.name.toLowerCase().includes(query)) {
        results.push({
          id: `mcp-${mcp.id}`,
          title: mcp.name,
          category: "mcp-servers",
          icon: <McpIcon className="h-4 w-4" />,
          path: `/mcp/${mcp.id}`,
        });
      }
    });

    // Search external MCPs
    Object.values(externalMcps).forEach((mcp) => {
      if (!query || mcp.mcpId.toLowerCase().includes(query)) {
        results.push({
          id: `external-mcp-${mcp.mcpId}`,
          title: `${mcp.mcpId}`,
          category: "mcp-servers",
          icon: <McpIcon className="h-4 w-4" />,
          path: `/external-mcp/${mcp.mcpId}`,
          badges: ["External"],
        });
      }
    });

    // Search MCP tools (only when there's a query)
    if (query) {
      Object.entries(mcpToolMap).forEach(([mcpId, mcpEntry]) => {
        mcpEntry.tools.forEach((tool) => {
          if (
            tool.name.toLowerCase().includes(query) ||
            tool.description?.toLowerCase().includes(query)
          ) {
            // Determine if this is an external MCP or internal MCP
            const isExternal = externalMcps[mcpId];
            const basePath = isExternal
              ? `/external-mcp/${mcpId}`
              : `/mcp/${mcpId}`;

            results.push({
              id: `mcp-tool-${mcpId}-${tool.name}`,
              title: `${tool.name} (${mcpEntry.name})`,
              category: "mcp-tools",
              icon: <Wrench className="h-4 w-4" />,
              path: `${basePath}?tab=tools`,
            });
          }
        });
      });
    }

    // Search APIs and endpoints
    apis.forEach((api) => {
      const title = api.api?.info?.title || "API";
      const description = api.api?.info?.description;

      // Search API itself
      if (
        !query ||
        title.toLowerCase().includes(query) ||
        description?.toLowerCase().includes(query)
      ) {
        results.push({
          id: `api-${api.id}`,
          title,
          category: "api-endpoints",
          icon: <Server className="h-4 w-4" />,
          path: `/api/${api.id}`,
        });
      }

      // Search individual endpoints (only when there's a query)
      if (query && api.api?.paths) {
        Object.entries(api.api.paths).forEach(([path, pathItem]) => {
          if (pathItem && typeof pathItem === "object") {
            // Check each HTTP method
            [
              "get",
              "post",
              "put",
              "patch",
              "delete",
              "options",
              "head",
            ].forEach((method) => {
              const operation = (pathItem as Record<string, unknown>)[method];
              if (operation && typeof operation === "object") {
                const operationObj = operation as Record<string, string>;
                const operationId =
                  operationObj.operationId || `${method.toUpperCase()} ${path}`;
                const summary =
                  operationObj.summary || operationObj.description || "";

                if (
                  operationId.toLowerCase().includes(query) ||
                  summary.toLowerCase().includes(query) ||
                  path.toLowerCase().includes(query)
                ) {
                  results.push({
                    id: `endpoint-${api.id}-${path}-${method}`,
                    title: `${operationObj.summary || operationId}`,
                    category: "api-endpoints",
                    icon: <ArrowRight className="h-4 w-4" />,
                    path: `/api/${api.id}/endpoint/${encodeURIComponent(path)}?method=${method}`,
                    badges: [method.toUpperCase()],
                  });
                }
              }
            });
          }
        });
      }
    });

    return results;
  }, [searchQuery, datasets, mcps, apis, externalMcps, mcpToolMap]);

  // Combine all results
  const allResults = useMemo(() => {
    return searchResults;
  }, [searchResults]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};

    allResults.forEach((result) => {
      if (!groups[result.category]) {
        groups[result.category] = [];
      }
      groups[result.category].push(result);
    });

    // Limit results per category for performance
    Object.keys(groups).forEach((category) => {
      if (groups[category].length > 12) {
        groups[category] = groups[category].slice(0, 12);
      }
    });

    return groups;
  }, [allResults]);

  const handleSelect = (path: string) => {
    navigate({ to: path });
    close();
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "datasets":
        return "Datasets";
      case "dataset-items":
        return "Dataset Items";
      case "mcp-servers":
        return "MCP Servers";
      case "mcp-tools":
        return "MCP Tools";
      case "api-endpoints":
        return "APIs";
      default:
        return category;
    }
  };

  // Define category order
  const categoryOrder = [
    "datasets",
    "dataset-items",
    "mcp-servers",
    "api-endpoints",
    "mcp-tools",
  ];
  const sortedCategories = categoryOrder.filter(
    (cat) => groupedResults[cat]?.length > 0,
  );

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={close}
      className="max-h-[80vh] max-w-2xl"
    >
      <CommandInput
        placeholder="Search your workspace..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList className="max-h-[60vh]">
        {Object.keys(groupedResults).length === 0 ? (
          <CommandEmpty>No results found.</CommandEmpty>
        ) : (
          sortedCategories.map((category, index) => {
            const items = groupedResults[category];
            if (!items?.length) return null;

            return (
              <React.Fragment key={category}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={getCategoryLabel(category)}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.title}
                      onSelect={() => handleSelect(item.path)}
                      className="flex items-center gap-3"
                    >
                      {item.icon}
                      <span className="flex-1 truncate font-medium">
                        {item.title}
                      </span>
                      {item.badges?.map((badge, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="h-5 text-xs"
                        >
                          {badge}
                        </Badge>
                      ))}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            );
          })
        )}
      </CommandList>
    </CommandDialog>
  );
}
