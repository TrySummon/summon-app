import React from "react";
import { useDatasets } from "@/hooks/useDatasets";
import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, PlayCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const EvaluationPage: React.FC = () => {
  const { datasets, isLoading } = useDatasets();

  const evaluableDatasets = datasets.filter((dataset) => {
    const evaluableItems = dataset.items.filter(
      (item) =>
        (item.naturalLanguageCriteria &&
          item.naturalLanguageCriteria.length > 0) ||
        (item.expectedToolCalls && item.expectedToolCalls.length > 0),
    );
    return evaluableItems.length > 0;
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
          <p className="text-muted-foreground mt-2 text-sm">
            Loading datasets...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>
              <PlayCircle className="mr-2 size-3" /> Evaluation
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="container flex flex-grow flex-col py-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Dataset Evaluation
          </h1>
          <p className="text-muted-foreground">
            Select a dataset to run evaluations on its items with defined
            criteria.
          </p>
        </div>

        {evaluableDatasets.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <Database className="text-muted-foreground mx-auto h-12 w-12" />
              <h3 className="mt-4 text-lg font-semibold">
                No evaluable datasets
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Create datasets with evaluation criteria to get started.
              </p>
              <Button asChild className="mt-4">
                <Link to="/datasets">View Datasets</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {evaluableDatasets.map((dataset) => {
              const evaluableItemsCount = dataset.items.filter(
                (item) =>
                  (item.naturalLanguageCriteria &&
                    item.naturalLanguageCriteria.length > 0) ||
                  (item.expectedToolCalls && item.expectedToolCalls.length > 0),
              ).length;

              return (
                <Card key={dataset.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{dataset.name}</CardTitle>
                      <Badge variant="secondary">
                        {evaluableItemsCount} evaluable
                      </Badge>
                    </div>
                    <CardDescription>
                      {dataset.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="text-muted-foreground flex items-center justify-between text-sm">
                      <span>{dataset.items.length} total items</span>
                      <span>
                        Created{" "}
                        {new Date(dataset.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                  <CardContent className="pt-0">
                    <Button asChild className="w-full">
                      <Link
                        to="/datasets/$datasetId"
                        params={{ datasetId: dataset.id }}
                        search={{ tab: "eval" }}
                      >
                        Run Evaluation
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationPage;
