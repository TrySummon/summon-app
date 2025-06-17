import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
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
import { formatDate } from "@/utils/formatDate";
import { Loader } from "./Loader";

interface Dataset {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  items: unknown[];
  createdAt: string;
  updatedAt?: string;
}

interface DatasetsTableProps {
  datasets: Dataset[];
  isLoading: boolean;
  onCreateDataset: () => void;
}

export const DatasetsTable: React.FC<DatasetsTableProps> = ({
  datasets,
  isLoading,
  onCreateDataset,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const navigate = useNavigate();

  const filteredDatasets = datasets.filter((dataset) => {
    const query = searchQuery.toLowerCase();
    return (
      dataset.name.toLowerCase().includes(query) ||
      dataset.description?.toLowerCase().includes(query) ||
      dataset.tags?.some((tag: string) => tag.toLowerCase().includes(query))
    );
  });

  const totalPages = Math.ceil(filteredDatasets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDatasets = filteredDatasets.slice(startIndex, endIndex);

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

  return (
    <Card className="flex-grow border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex w-80">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search datasets..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <Button size="sm" onClick={onCreateDataset}>
            <Plus className="mr-2 h-4 w-4" />
            New Dataset
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader />
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-muted-foreground">
              {searchQuery
                ? "No datasets match your search criteria"
                : "No datasets found. Create your first dataset to get started."}
            </div>
            {!searchQuery && (
              <Button className="mt-4" onClick={onCreateDataset}>
                <Plus className="mr-2 h-4 w-4" />
                Create Dataset
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-grow flex-col overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDatasets.map((dataset) => (
                  <TableRow
                    key={dataset.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate({ to: `/datasets/${dataset.id}` })}
                  >
                    <TableCell>
                      <div
                        className="max-w-xs truncate font-medium"
                        title={dataset.name}
                      >
                        {dataset.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="text-muted-foreground max-w-xs truncate text-sm"
                        title={dataset.description || ""}
                      >
                        {dataset.description || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {dataset.tags?.map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {dataset.items.length} item
                        {dataset.items.length !== 1 ? "s" : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(dataset.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {dataset.updatedAt
                          ? formatDate(dataset.updatedAt)
                          : "-"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && filteredDatasets.length > 0 && (
          <div className="flex items-center justify-between border-t px-2 pt-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                Rows per page:
              </span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger className="w-16">
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
