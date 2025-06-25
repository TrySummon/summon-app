import { exposeThemeContext } from "./theme/theme-context-exposer";
import { exposeWindowContext } from "./window/window-context-exposer";
import { exposeOpenApiContext } from "./openapi/openapi-context-exposer";
import { exposeDatasetContext } from "./dataset/dataset-context-exposer";
import { exposeAuthContext } from "./auth/auth-context-exposer";
import { exposeMcpContext } from "./mcp/mcp-context-exposer";
import { exposeExternalMcpContext } from "./external-mcp/external-mcp-context-exposer";
import { exposeAIProvidersContext } from "./ai-providers/ai-providers-context-exposer";
import { exposeWorkspaceAPI } from "./workspace/workspace-context-exposer";
import { exposeAgentToolsContext } from "./agent-tools/agent-tools-context-exposer";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeOpenApiContext();
  exposeDatasetContext();
  exposeAuthContext();
  exposeMcpContext();
  exposeExternalMcpContext();
  exposeAIProvidersContext();
  exposeWorkspaceAPI();
  exposeAgentToolsContext();
}
