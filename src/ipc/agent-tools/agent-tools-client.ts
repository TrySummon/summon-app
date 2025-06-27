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
