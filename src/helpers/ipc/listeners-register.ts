import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { registerOpenApiListeners } from "./openapi/openapi-listeners";
import { registerAuthListeners } from "./auth/auth-listeners";

export default function registerListeners(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
  registerOpenApiListeners();
  registerAuthListeners();
}
