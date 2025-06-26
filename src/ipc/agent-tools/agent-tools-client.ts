export const listApis = async () => {
  return window.agentTools.listApis();
};

export const searchApiEndpoints = async (args: {
  apiId: string;
  query?: string;
  tags?: string[];
}) => {
  return window.agentTools.searchApiEndpoints(args);
};

export const readApiEndpoints = async (
  apiId: string,
  endpoints: Array<{ path: string; method: string }>,
) => {
  return window.agentTools.readApiEndpoints(apiId, endpoints);
};
