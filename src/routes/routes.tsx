import { createRoute } from "@tanstack/react-router";
import { RootRoute } from "./__root";
import HomePage from "@/pages/HomePage";
import ApiPage from "@/pages/ApiPage";
import EndpointPage from "@/pages/EndpointPage";
import BuildMcpPage from "@/pages/BuildMcpPage";
import McpPage from "@/pages/McpPage";
import ExternalMcpPage from "@/pages/ExternalMcpPage";
import PlaygroundPage from "@/pages/PlaygroundPage";
import SettingsPage from "@/pages/SettingsPage";
import ConnectMcpPage from "@/pages/ConnectMcpPage";

// TODO: Steps to add a new route:
// 1. Create a new page component in the '../pages/' directory (e.g., NewPage.tsx)
// 2. Import the new page component at the top of this file
// 3. Define a new route for the page using createRoute()
// 4. Add the new route to the routeTree in RootRoute.addChildren([...])
// 5. Add a new Link in the navigation section of RootRoute if needed

// Example of adding a new route:
// 1. Create '../pages/NewPage.tsx'
// 2. Import: import NewPage from '../pages/NewPage';
// 3. Define route:
//    const NewRoute = createRoute({
//      getParentRoute: () => RootRoute,
//      path: '/new',
//      component: NewPage,
//    });
// 4. Add to routeTree: RootRoute.addChildren([HomeRoute, NewRoute, ...])
// 5. Add Link: <Link to="/new">New Page</Link>

export const HomeRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/",
  component: HomePage,
});

export const ApiRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/api/$apiId",
  component: ApiPage,
});

export const EndpointRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/api/$apiId/endpoint/$endpointId",
  component: EndpointPage,
});

export const BuildMcpRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/build-mcp",
  component: BuildMcpPage,
  validateSearch: (search: Record<string, unknown>) => {
    // Define the search parameters schema
    return {
      edit: search.edit as string | undefined,
    };
  },
});

export const McpRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/mcp/$mcpId",
  component: McpPage,
});

export const PlaygroundRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/playground",
  component: PlaygroundPage,
});

export const SettingsRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/settings",
  component: SettingsPage,
});

export const ConnectMcpRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/connect-mcp",
  component: ConnectMcpPage,
});

export const ExternalMcpRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/external-mcp/$mcpId",
  component: ExternalMcpPage,
});

export const rootTree = RootRoute.addChildren([HomeRoute, ApiRoute, EndpointRoute, BuildMcpRoute, McpRoute, ExternalMcpRoute, PlaygroundRoute, SettingsRoute, ConnectMcpRoute]);
