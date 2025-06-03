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
      return { success: false, message: getResult.message || "API not found" };
    }

    // Save the updated API
    const updateResult = await updateApi(apiId, {
      ...getResult.api.api,
      info: {
        ...getResult.api.api.info,
        title: newName,
      },
    });
    return updateResult;
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while renaming API",
    };
  }
};
