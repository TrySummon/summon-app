import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Square } from "lucide-react";
import { DatasetItem } from "@/types/dataset";

interface ItemSelectionSectionProps {
  evaluableItems: DatasetItem[];
  selectedItems: Set<string>;
  onItemSelection: (itemId: string, checked: boolean) => void;
  onSelectAllItems: () => void;
  onSelectNoItems: () => void;
  getItemCriteriaCount: (item: DatasetItem) => number;
}

export function ItemSelectionSection({
  evaluableItems,
  selectedItems,
  onItemSelection,
  onSelectAllItems,
  onSelectNoItems,
  getItemCriteriaCount,
}: ItemSelectionSectionProps) {
  const isAllItemsSelected = selectedItems.size === evaluableItems.length;
  const isNoItemsSelected = selectedItems.size === 0;

  if (evaluableItems.length === 0) {
    return null;
  }

  return (
    <Card className="gap-0 border-dashed py-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Select Items to Evaluate</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAllItems}
              disabled={isAllItemsSelected}
            >
              <CheckSquare className="mr-1 h-3 w-3" />
              All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectNoItems}
              disabled={isNoItemsSelected}
            >
              <Square className="mr-1 h-3 w-3" />
              None
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid gap-2">
          {evaluableItems.map((item) => (
            <div
              key={item.id}
              className="bg-background hover:bg-muted/50 flex items-center justify-between rounded-lg border p-2"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Checkbox
                  id={`item-${item.id}`}
                  checked={selectedItems.has(item.id)}
                  onCheckedChange={(checked) =>
                    onItemSelection(item.id, checked as boolean)
                  }
                />
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`item-${item.id}`}
                    className="block cursor-pointer truncate text-sm font-medium"
                  >
                    {item.name}
                  </label>
                  <div className="text-muted-foreground text-xs">
                    {getItemCriteriaCount(item)} evaluation criteria
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
