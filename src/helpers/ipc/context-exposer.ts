import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposeOpenApiContext } from "./openapi/openapi-context";
import { exposeAuthContext } from "./auth/auth-context";
import { exposeMcpContext } from "./mcp/mcp-context-exposer";
import { exposeExternalMcpContext } from "./external-mcp/external-mcp-context-exposer";
import { exposeAIProvidersContext } from "./ai-providers/ai-providers-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeOpenApiContext();
  exposeAuthContext();
  exposeMcpContext();
  exposeExternalMcpContext();
  exposeAIProvidersContext();
}
