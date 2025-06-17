// Channel names for dataset-related IPC communication

// Dataset-level operations
export const ADD_DATASET_CHANNEL = "add-dataset";
export const UPDATE_DATASET_CHANNEL = "update-dataset";
export const DELETE_DATASET_CHANNEL = "delete-dataset";
export const GET_DATASET_CHANNEL = "get-dataset";
export const LIST_DATASETS_CHANNEL = "list-datasets";
export const SEARCH_DATASETS_CHANNEL = "search-datasets";

// Item-level operations
export const ADD_ITEM_CHANNEL = "add-dataset-item";
export const UPDATE_ITEM_CHANNEL = "update-dataset-item";
export const DELETE_ITEM_CHANNEL = "delete-dataset-item";

// Utility operations
export const DATASET_EXISTS_CHANNEL = "dataset-exists";
export const GET_DATASET_COUNT_CHANNEL = "get-dataset-count";
