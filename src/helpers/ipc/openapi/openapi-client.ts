// API operations
export const listApis = window.openapi.db.listApis;
export const getApi = window.openapi.db.getApi;
export const updateApi = window.openapi.db.updateApi;
export const deleteApi = window.openapi.db.deleteApi;

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
export const listApiTools = window.openapi.db.listApiTools;
export const getApiTool = window.openapi.db.getApiTool;
export const updateApiTool = window.openapi.db.updateApiTool;
export const deleteApiTool = window.openapi.db.deleteApiTool;
