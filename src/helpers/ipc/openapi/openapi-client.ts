// API operations
export const listApis = window.electron.apiDb.listApis;
export const getApi = window.electron.apiDb.getApi;
export const updateApi = window.electron.apiDb.updateApi;
export const deleteApi = window.electron.apiDb.deleteApi;

// Custom API operation for renaming an API
export const renameApi = async (apiId: string, newName: string) => {
  try {
    // First get the API to update
    const getResult = await getApi(apiId);
    if (!getResult.success || !getResult.api) {
      return { success: false, message: getResult.message || 'API not found' };
    }
    
    // Save the updated API
    const updateResult = await updateApi(apiId, {
      ...getResult.api.api,
      name: newName
    });
    return updateResult;
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred while renaming API'
    };
  }
};

// API Tool operations
export const listApiTools = window.electron.apiDb.listApiTools;
export const getApiTool = window.electron.apiDb.getApiTool;
export const updateApiTool = window.electron.apiDb.updateApiTool;
export const deleteApiTool = window.electron.apiDb.deleteApiTool;
