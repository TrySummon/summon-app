import { exposeThemeContext } from "./theme/theme-context-exposer";
import { exposeWindowContext } from "./window/window-context-exposer";
import { exposeOpenApiContext } from "./openapi/openapi-context-exposer";
import { exposeAuthContext } from "./auth/auth-context-exposer";
import { exposeMcpContext } from "./mcp/mcp-context-exposer";
import { exposeExternalMcpContext } from "./external-mcp/external-mcp-context-exposer";
import { exposeAIProvidersContext } from "./ai-providers/ai-providers-context-exposer";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeOpenApiContext();
  exposeAuthContext();
  exposeMcpContext();
  exposeExternalMcpContext();
  exposeAIProvidersContext();
}
