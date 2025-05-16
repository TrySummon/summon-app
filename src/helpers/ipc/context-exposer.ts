import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposeOpenApiContext } from "./openapi/openapi-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeOpenApiContext();
}
