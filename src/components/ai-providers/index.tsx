import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PencilIcon, TrashIcon, PlusIcon } from "lucide-react";
import {
  AIProviderType,
  AI_PROVIDERS_CONFIG,
  PersistedAIProviderCredential,
} from "./types";
import { CredentialDialog, CredentialFormValues } from "./CredentialDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAIProviders } from "@/hooks/useAIProviders";
import ProviderLogo from "./Logo";

export const AIProvidersTable: React.FC = () => {
  const {
    credentials,
    isLoading,
    isError,
    error,
    saveCredential,
    deleteCredential,
  } = useAIProviders();
  const [id, setId] = useState<string | null>(null);
  const [providerType, setProviderType] = useState<AIProviderType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Format date for display
  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "N/A";

    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  // Mask API key to show only last 4 characters
  const maskApiKey = (key: string | null | undefined) => {
    if (!key) return "N/A";
    if (key.length <= 4) return key;

    return "****" + key.slice(-4);
  };

  // Handle opening the credential dialog for a specific provider
  const handleConfigureProvider = (
    providerType: AIProviderType,
    id?: string,
  ) => {
    setProviderType(providerType);
    setId(id || null);
    setDialogOpen(true);
  };

  // Handle deletion of a provider
  const handleDeleteProvider = async () => {
    if (!id) return;

    try {
      await deleteCredential.mutateAsync(id);
      setDeleteDialogOpen(false);
      setId(null);
    } catch (err) {
      console.error("Error deleting provider:", err);
    }
  };

  // Handle saving a provider
  const handleProviderSaved = (values: CredentialFormValues) => {
    saveCredential.mutate({
      id: id || uuidv4(),
      providerData: {
        ...values,
        configured: true,
        createdAt: new Date(),
      },
    });
  };

  // Organize providers to show each provider only once
  const organizeProviders = () => {
    // Track which provider types we've seen
    const seenTypes = new Set<string>();
    const customProviders: PersistedAIProviderCredential[] = [];
    const standardProviders: PersistedAIProviderCredential[] = [];
    const unconfiguredProviders: AIProviderType[] = [];

    // First, process all configured providers
    credentials.forEach((credential) => {
      // Add custom providers to their own array
      if (credential.provider === AIProviderType.Custom) {
        customProviders.push(credential);
      } else if (!seenTypes.has(credential.provider)) {
        // Add standard providers if we haven't seen this type yet
        standardProviders.push(credential);
        seenTypes.add(credential.provider);
      }
    });

    // Then, add unconfigured standard providers
    Object.values(AIProviderType).forEach((type) => {
      if (type !== AIProviderType.Custom && !seenTypes.has(type)) {
        unconfiguredProviders.push(type);
      }
    });

    return { customProviders, standardProviders, unconfiguredProviders };
  };

  const { customProviders, standardProviders, unconfiguredProviders } =
    organizeProviders();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Providers</h2>
        <Button
          size="sm"
          className="gap-1"
          onClick={() => handleConfigureProvider(AIProviderType.Custom)}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add custom provider
        </Button>
      </div>

      <p className="text-muted-foreground mb-4 text-sm">
        The credentials are securely encrypted on your local machine.
      </p>

      {isError && error && (
        <div className="bg-destructive/10 text-destructive mb-4 rounded-md p-3">
          {error instanceof Error ? error.message : "An error occurred"}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Configured</TableHead>
            <TableHead>API Key</TableHead>
            <TableHead>Created at</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-4 text-center">
                Loading providers...
              </TableCell>
            </TableRow>
          ) : customProviders.length === 0 &&
            standardProviders.length === 0 &&
            unconfiguredProviders.length === 0 ? null : (
            <>
              {/* Custom providers first */}
              {customProviders.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ProviderLogo
                        svgString={
                          AI_PROVIDERS_CONFIG[provider.provider]?.logo || ""
                        }
                        width={24}
                      />
                      <span>{provider.displayName || provider.provider}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {provider.configured ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-red-500">✗</span>
                    )}
                  </TableCell>
                  <TableCell>{maskApiKey(provider.key)}</TableCell>
                  <TableCell>{formatDate(provider.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex">
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleConfigureProvider(
                              provider.provider,
                              provider.id,
                            )
                          }
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setId(provider.id);
                            setProviderType(provider.provider);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* Standard providers (configured) */}
              {standardProviders.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ProviderLogo
                        svgString={AI_PROVIDERS_CONFIG[provider.provider]?.logo}
                        width={24}
                      />
                      <span>{provider.provider}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {provider.configured ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-red-500">✗</span>
                    )}
                  </TableCell>
                  <TableCell>{maskApiKey(provider.key)}</TableCell>
                  <TableCell>{formatDate(provider.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex">
                      {provider.configured ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleConfigureProvider(
                                provider.provider,
                                provider.id,
                              )
                            }
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setId(provider.id);
                              setProviderType(provider.provider);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleConfigureProvider(provider.provider)
                          }
                        >
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* Unconfigured standard providers */}
              {unconfiguredProviders.map((type) => (
                <TableRow key={type}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ProviderLogo
                        svgString={AI_PROVIDERS_CONFIG[type]?.logo || ""}
                        width={24}
                      />
                      <span>{type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-red-500">✗</span>
                  </TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell>
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleConfigureProvider(type)}
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </>
          )}
        </TableBody>
      </Table>

      {/* Credential Dialog */}
      {providerType && (
        <CredentialDialog
          isOpen={dialogOpen}
          onOpenChange={setDialogOpen}
          providerType={providerType}
          defaultValues={credentials.find((c) => c.id === id)}
          onSave={handleProviderSaved}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this provider? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProvider}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIProvidersTable;
