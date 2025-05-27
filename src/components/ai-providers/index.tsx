import React, { useState } from 'react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PencilIcon, TrashIcon, PlusIcon } from 'lucide-react';
import { AIProviderType, AIProviderCredential, AI_PROVIDERS_CONFIG } from './types';
import { CredentialDialog } from './CredentialDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useAIProviders } from '@/hooks/useAIProviders';
import ProviderLogo from './Logo';


export const AIProvidersTable: React.FC = () => {
  const { 
    providers, 
    isLoading, 
    isError, 
    error, 
    saveCredential, 
    deleteCredential 
  } = useAIProviders();
  
  const [selectedProvider, setSelectedProvider] = useState<AIProviderCredential | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProviderType, setSelectedProviderType] = useState<AIProviderType | null>(null);
  
  // Format date for display
  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return 'N/A';
    
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  

  
  // Handle opening the credential dialog for a specific provider
  const handleConfigureProvider = (providerType: AIProviderType, provider?: AIProviderCredential) => {
    setSelectedProviderType(providerType);
    setSelectedProvider(provider || null);
    setDialogOpen(true);
  };
  
  // Handle deletion of a provider
  const handleDeleteProvider = async () => {
    if (!selectedProvider) return;
    
    try {
      await deleteCredential.mutateAsync(selectedProvider.id);
      setDeleteDialogOpen(false);
      setSelectedProvider(null);
    } catch (err) {
      console.error('Error deleting provider:', err);
    }
  };
  
  // Handle saving a provider
  const handleProviderSaved = (values: any) => {
    const id = selectedProvider?.id || `${values.type}-${Date.now()}`;
    saveCredential.mutate({ 
      providerId: id, 
      providerData: {
        ...values,
        configured: true,
        createdAt: new Date().toISOString(),
      }
    });
  };

  // Get available provider types that aren't configured yet
  const getAvailableProviderTypes = () => {
    const configuredTypes = new Set(providers.map(p => p.type));
    return Object.values(AIProviderType).filter(type => 
      type !== AIProviderType.Custom && !configuredTypes.has(type)
    );
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">AI Providers</h2>
        <Button 
          size="sm"
          className='gap-1'
          onClick={() => handleConfigureProvider(AIProviderType.Custom)}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add custom provider
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        The credentials are securely encrypted on your local machine.
      </p>
      
      {isError && error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4">
          {error instanceof Error ? error.message : 'An error occurred'}
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
              <TableCell colSpan={5} className="text-center py-4">
                Loading providers...
              </TableCell>
            </TableRow>
          ) : providers.length === 0 ? (
            null
          ) : (
            providers.map((provider) => (
              <TableRow key={provider.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <ProviderLogo 
                      svgString={AI_PROVIDERS_CONFIG[provider.type as AIProviderType]?.logo || ''} 
                      width={24} 
                    />
                    <span>{provider.name || provider.type}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {provider.configured ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="text-red-500">✗</span>
                  )}
                </TableCell>
                <TableCell>{provider.apiKey || 'N/A'}</TableCell>
                <TableCell>{formatDate(provider.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    {provider.configured ? (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleConfigureProvider(provider.type as AIProviderType, provider)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedProvider(provider);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleConfigureProvider(provider.type as AIProviderType)}
                      >
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
          
          {/* Add rows for unconfigured providers */}
          {getAvailableProviderTypes().map((type) => (
            <TableRow key={type}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <ProviderLogo 
                    svgString={AI_PROVIDERS_CONFIG[type]?.logo || ''} 
                    width={24} 
                  />
                  <span>{AI_PROVIDERS_CONFIG[type]?.displayName || type}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-red-500">✗</span>
              </TableCell>
              <TableCell>N/A</TableCell>
              <TableCell>N/A</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleConfigureProvider(type)}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Credential Dialog */}
      {selectedProviderType && (
        <CredentialDialog
          isOpen={dialogOpen}
          onOpenChange={setDialogOpen}
          providerType={selectedProviderType}
          providerId={selectedProvider?.id}
          defaultValues={selectedProvider as any}
          onSave={handleProviderSaved}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this provider? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
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
