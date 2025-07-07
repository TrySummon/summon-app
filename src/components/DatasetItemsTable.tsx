import React, { useState } from "react";
import { DatasetItem } from "@/types/dataset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { formatDate } from "@/utils/formatDate";
import { JsonCellDisplay } from "@/components/JsonCellDisplay";
import { Loader } from "./Loader";
import { useDatasets } from "@/hooks/useDatasets";
import { toast } from "sonner";

interface DatasetItemsTableProps {
  items: DatasetItem[];
  isLoading: boolean;
  onSelectItem?: (item: DatasetItem) => void;
}

export const DatasetItemsTable: React.FC<DatasetItemsTableProps> = ({
  items,
  isLoading,
  onSelectItem,
}) => {
  const navigate = useNavigate();
  const { datasetId } = useParams({ from: "/datasets/$datasetId" });
  const { deleteDataset } = useDatasets();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const getInputMessages = (item: DatasetItem) => {
    const cutPosition = item.inputOutputCutPosition ?? item.messages.length;
    return item.messages.slice(0, cutPosition);
  };

  const getToolCalls = (item: DatasetItem) => {
    return item.expectedToolCalls || [];
  };

  const getCriteria = (item: DatasetItem) => {
    return item.naturalLanguageCriteria || [];
  };

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to first page when search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleItemClick = (item: DatasetItem) => {
    if (onSelectItem) {
      onSelectItem(item);
    } else {
      navigate({
        to: "/datasets/$datasetId/item/$itemId",
        params: { datasetId, itemId: item.id },
      });
    }
  };

  const handleDeleteDataset = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this dataset? This action cannot be undone and will delete all items in this dataset.`,
    );
    if (!confirmed) return;

    await toast.promise(deleteDataset(datasetId), {
      loading: `Deleting dataset...`,
      success: () => {
        navigate({ to: "/datasets" });
        return `Dataset deleted successfully`;
      },
      error: (error) => {
        return error.message || "Failed to delete dataset";
      },
    });
  };

  return (
    <Card className="flex-grow overflow-y-auto border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <div className="relative flex max-w-80 flex-grow">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search items..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteDataset}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Dataset
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/playground">
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                Items are created from real conversations in the playground
              </TooltipContent>
            </Tooltip>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-muted-foreground">
              {searchQuery
                ? "No items match your search criteria"
                : "No items in this dataset yet."}
            </div>
          </div>
        ) : (
          <div className="flex flex-grow flex-col overflow-auto">
            <div className="h-full min-w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Name</TableHead>
                    <TableHead className="min-w-[250px]">Input</TableHead>
                    <TableHead className="min-w-[200px]">
                      Expected Tool Calls
                    </TableHead>
                    <TableHead className="min-w-[200px]">Criteria</TableHead>
                    <TableHead className="min-w-[120px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      <TableCell className="max-w-[300px] min-w-[200px]">
                        <div className="truncate font-medium">{item.name}</div>
                      </TableCell>
                      <TableCell className="max-w-[350px] min-w-[250px]">
                        <JsonCellDisplay
                          data={getInputMessages(item)}
                          maxDisplayLength={100}
                        />
                      </TableCell>
                      <TableCell className="max-w-[250px] min-w-[200px]">
                        <JsonCellDisplay
                          data={getToolCalls(item)}
                          maxDisplayLength={80}
                        />
                      </TableCell>
                      <TableCell className="max-w-[250px] min-w-[200px]">
                        <JsonCellDisplay
                          data={getCriteria(item)}
                          maxDisplayLength={80}
                        />
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="text-sm whitespace-nowrap">
                          {formatDate(item.createdAt)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="flex items-center justify-between border-t px-2 pt-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                Rows per page:
              </span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger className="w-fit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) {
                          handlePageChange(currentPage - 1);
                        }
                      }}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) {
                          handlePageChange(currentPage + 1);
                        }
                      }}
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
