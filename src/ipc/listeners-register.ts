import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { registerOpenApiListeners } from "./openapi/openapi-listeners";
import { registerDatasetListeners } from "./dataset/dataset-listeners";
import { registerAuthListeners } from "./auth/auth-listeners";
import { registerMcpListeners } from "./mcp/mcp-listeners";
import { registerAIProvidersListeners } from "./ai-providers/ai-providers-listeners";
import { registerExternalMcpListeners } from "./external-mcp/external-mcp-listeners";

export default function registerListeners(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
  registerOpenApiListeners();
  registerDatasetListeners();
  registerAuthListeners();
  registerMcpListeners();
  registerAIProvidersListeners();
  registerExternalMcpListeners();
}
