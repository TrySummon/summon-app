import {
  OptimiseToolSelectionRequest,
  OptimiseToolSizeRequest,
  SearchApiEndpointsRequest,
} from "./agent-tools-listeners";

export const listApis = async () => {
  return window.agentTools.listApis();
};

export const searchApiEndpoints = async (args: SearchApiEndpointsRequest) => {
  return window.agentTools.searchApiEndpoints(args);
};

export const optimiseToolSize = async (args: OptimiseToolSizeRequest) => {
  return window.agentTools.optimiseToolSize(args);
};

export const optimiseToolSelection = async (
  args: OptimiseToolSelectionRequest,
) => {
  return window.agentTools.optimiseToolSelection(args);
};
