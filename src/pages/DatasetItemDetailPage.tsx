import React, { useState } from "react";
import { useParams, Link, useNavigate } from "@tanstack/react-router";
import { useDatasets } from "@/hooks/useDatasets";
import { usePlaygroundStore } from "@/stores/playgroundStore";
import { DatasetItem } from "@/types/dataset";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Calendar,
  MessageSquare,
  Target,
  Wrench,
  MessageCircle,
  Trash2,
  ChevronDown,
  ChevronRight,
  Database,
  ArrowLeft,
} from "lucide-react";
import { formatDate } from "@/utils/formatDate";
import CodeEditor from "@/components/CodeEditor";
import { MessageContent } from "@/components/playground/Message/Content";
import { toast } from "sonner";
import { NotFound } from "@/components/ui/NotFound";
import CopyButton from "@/components/CopyButton";

const DatasetItemDetailPage: React.FC = () => {
  const { datasetId, itemId } = useParams({
    from: "/datasets/$datasetId/item/$itemId",
  });
  const { getDataset, deleteItem } = useDatasets();
  const navigate = useNavigate();
  const { createTab } = usePlaygroundStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({
    systemPrompt: false,
    inputMessages: false,
    outputMessages: false,
    expectedToolCalls: false,
    settings: false,
  });

  const dataset = getDataset(datasetId);
  const item = dataset?.items.find((i) => i.id === itemId);

  const getInputMessages = (item: DatasetItem) => {
    const cutPosition = item.inputOutputCutPosition ?? item.messages.length;
    return item.messages.slice(0, cutPosition);
  };

  const getOutputMessages = (item: DatasetItem) => {
    const cutPosition = item.inputOutputCutPosition ?? item.messages.length;
    return item.messages.slice(cutPosition);
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleOpenInPlayground = () => {
    if (!item) return;

    try {
      createTab(
        {
          systemPrompt: item.systemPrompt,
          messages: item.messages,
          settings: item.settings,
          model: item.model,
        },
        `${item.name}`,
      );

      navigate({ to: "/playground" });
      toast.success("Opened in playground");
    } catch {
      toast.error("Failed to open in playground");
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteItem(datasetId, item.id);
      toast.success("Dataset item deleted");
      navigate({ to: "/datasets/$datasetId", params: { datasetId } });
    } catch {
      toast.error("Failed to delete dataset item");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!dataset) {
    return (
      <NotFound
        title="Dataset Not Found"
        message="The dataset you're looking for doesn't exist or has been removed."
        breadcrumbs={[
          { label: "Datasets", to: "/datasets" },
          { label: "Dataset Not Found", isActive: true },
        ]}
      />
    );
  }

  if (!item) {
    return (
      <NotFound
        title="Dataset Item Not Found"
        message="The dataset item you're looking for doesn't exist or has been removed."
        breadcrumbs={[
          { label: "Datasets", to: "/datasets" },
          { label: dataset.name, to: `/datasets/${datasetId}` },
          { label: "Item Not Found", isActive: true },
        ]}
      />
    );
  }

  const inputMessages = getInputMessages(item);
  const outputMessages = getOutputMessages(item);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/datasets">
                  <BreadcrumbPage>
                    <Database className="mr-2 size-3" />
                    Datasets
                  </BreadcrumbPage>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/datasets/$datasetId" params={{ datasetId }}>
                  <BreadcrumbPage>{dataset.name}</BreadcrumbPage>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{item.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex w-full items-center justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate({ to: "/datasets/$datasetId", params: { datasetId } })
              }
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dataset
            </Button>
            <div className="flex items-center gap-2">
              <Button onClick={handleOpenInPlayground} size="sm">
                <MessageCircle className="mr-2 h-4 w-4" />
                Open in Playground
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
          {/* Header Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{item.name}</CardTitle>
              {item.description && (
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  {item.description}
                </p>
              )}
              <div className="flex items-center gap-6 pt-2">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {formatDate(item.createdAt)}
                </div>
                {item.model && (
                  <Badge variant="secondary" className="text-xs">
                    {item.model}
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* System Prompt */}
          {item.systemPrompt && (
            <Card>
              <Collapsible
                open={!collapsedSections.systemPrompt}
                onOpenChange={() => toggleSection("systemPrompt")}
              >
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-lg">System Prompt</CardTitle>
                    </div>
                    {collapsedSections.systemPrompt ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <CodeEditor
                      defaultValue={item.systemPrompt}
                      language="markdown"
                      readOnly
                      height="200px"
                      className="rounded-md border"
                    />
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Input Messages */}
          <Card>
            <Collapsible
              open={!collapsedSections.inputMessages}
              onOpenChange={() => toggleSection("inputMessages")}
            >
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-lg">Input Messages</CardTitle>
                    <CopyButton content={inputMessages} />
                  </div>

                  {collapsedSections.inputMessages ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="space-y-4">
                      {inputMessages.map((message, index: number) => (
                        <div
                          key={index}
                          className="bg-muted/30 rounded-md border p-4"
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <Badge
                              variant={
                                message.role === "user"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {message.role}
                            </Badge>
                          </div>
                          <MessageContent message={message} />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Output Messages */}
          {outputMessages.length > 0 && (
            <Card>
              <Collapsible
                open={!collapsedSections.outputMessages}
                onOpenChange={() => toggleSection("outputMessages")}
              >
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-purple-500" />
                      <CardTitle className="text-lg">Output Messages</CardTitle>
                      <CopyButton content={outputMessages} />
                    </div>
                    {collapsedSections.outputMessages ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="space-y-4">
                        {outputMessages.map((message, index: number) => (
                          <div
                            key={index}
                            className="bg-muted/30 rounded-md border p-4"
                          >
                            <div className="mb-3 flex items-center gap-2">
                              <Badge
                                variant={
                                  message.role === "user"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {message.role}
                              </Badge>
                            </div>
                            <MessageContent message={message} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Expected Tool Calls */}
          {item.expectedToolCalls && item.expectedToolCalls.length > 0 && (
            <Card>
              <Collapsible
                open={!collapsedSections.expectedToolCalls}
                onOpenChange={() => toggleSection("expectedToolCalls")}
              >
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-orange-500" />
                      <CardTitle className="text-lg">
                        Expected Tool Calls
                      </CardTitle>
                      <CopyButton content={item.expectedToolCalls} />
                    </div>
                    {collapsedSections.expectedToolCalls ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {item.expectedToolCalls.map((toolCall, index) => (
                          <div
                            key={index}
                            className="bg-muted/30 rounded-md border p-3"
                          >
                            <code className="font-mono text-sm">
                              {toolCall}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Natural Language Criteria */}
          {item.naturalLanguageCriteria &&
            item.naturalLanguageCriteria.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-lg">
                      Evaluation Criteria
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {item.naturalLanguageCriteria.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {item.naturalLanguageCriteria.map((criteria, index) => (
                      <div
                        key={index}
                        className="bg-muted/30 rounded-md border p-3"
                      >
                        <div className="text-sm">{criteria}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </div>
  );
};

export default DatasetItemDetailPage;
