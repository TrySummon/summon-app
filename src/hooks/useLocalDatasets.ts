import { useDatasetStore } from "@/stores/datasetStore";

export function useLocalDatasets() {
  const store = useDatasetStore();

  return {
    datasets: store.listDatasets(),
    addDataset: store.addDataset,
    updateDataset: store.updateDataset,
    deleteDataset: store.deleteDataset,
    getDataset: store.getDataset,
    searchDatasets: store.searchDatasets,
    datasetExists: store.datasetExists,
    count: store.getDatasetCount(),
  };
}
