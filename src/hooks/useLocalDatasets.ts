import { useDatasets } from "@/hooks/useDatasets";

export function useLocalDatasets() {
  const {
    datasets,
    addDataset,
    updateDataset,
    deleteDataset,
    getDataset,
    searchDatasets,
    datasetExists,
    count,
    addItem,
    updateItem,
    deleteItem,
  } = useDatasets();

  return {
    datasets,
    addDataset,
    updateDataset,
    deleteDataset,
    getDataset,
    searchDatasets,
    datasetExists,
    count,
    addItem,
    updateItem,
    deleteItem,
  };
}
