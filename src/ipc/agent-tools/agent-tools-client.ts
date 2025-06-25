export const listApis = async () => {
  return window.agentTools.listApis();
};

export const listApiEndpoints = async (apiId: string) => {
  return window.agentTools.listApiEndpoints(apiId);
};

export const readApiEndpoints = async (
  apiId: string,
  endpoints: Array<{ path: string; method: string }>,
) => {
  return window.agentTools.readApiEndpoints(apiId, endpoints);
};
