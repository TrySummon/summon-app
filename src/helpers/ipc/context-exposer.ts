import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposeOpenApiContext } from "./openapi/openapi-context";
import { exposeAuthContext } from "./auth/auth-context";
import { exposeMcpContext } from "./mcp/mcp-context-exposer";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeOpenApiContext();
  exposeAuthContext();
  exposeMcpContext();
}
