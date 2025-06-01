import React, { useMemo, useEffect } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Plus, RefreshCcw, Settings2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { AI_PROVIDERS_CONFIG, AIProviderType, PersistedAIProviderCredential } from "@/components/ai-providers/types";
import { useAIProviders } from "@/hooks/useAIProviders";

import { MaxLengthSelector } from "./MaxLength";
import { PresenceSelector } from "./PresencePenalty";
import { TemperatureSelector } from "./Temperature";
import { cn } from "@/utils/tailwind";
import { LLMSettings } from "../playground/state";
import { useNavigate } from "@tanstack/react-router";
import ProviderLogo from "../ai-providers/Logo";

export interface IModelConfiguration {
  credentialId?: string;
  model?: string;
  settings: LLMSettings
}

interface Props {
  className?: string;
  config: IModelConfiguration;
  hideSettings?: boolean;
  onChange: (
    nextConfig: IModelConfiguration,
    shouldModify?: boolean
  ) => void;
}

export default function LLMPicker({
  config,
  onChange,
  className,
  hideSettings,
}: Props) {
  const navigate = useNavigate();
  const { credentials, isLoading, refetch } = useAIProviders();

  const { credentialId, model } = config;
  const credential = useMemo(() => {
    if (!credentialId || !credentials) return undefined;
    return credentials.find(c => c.id === credentialId);
  }, [credentialId, credentials]);
  const provider = credential?.provider;

  // Validate that the credential ID exists in available credentials
  useEffect(() => {
    if (!credentialId || !credentials?.length) return;
    
    // Check if the credential exists in the available credentials
    const credentialExists = credentials.find(c => c.id === credentialId);
    if (!credentialExists) {
      // If credential doesn't exist, reset it
      onChange({ ...config, credentialId: undefined });
    }
  }, [credentialId, credentials, config, onChange]);

  // No need for additional effect since we're handling credential validation in the useMemo above

  const currentProvider = useMemo(() => {
    if (!provider) return null;

    return AI_PROVIDERS_CONFIG[provider];
  }, [provider]);

  const modelsByProvider = useMemo(() => {
    if (!credentials) return {};
    const _modelsByProvider: Record<
      string,
      {
        logo: string;
        credentialId: string;
        defaultModels: string[];
        customModels: string[];
      }
    > = {};
    
    credentials.forEach((c) => {
      const providerConfig = AI_PROVIDERS_CONFIG[c.provider];
      const customModels = c.models || [];
      const knownModels = providerConfig ? Object.keys(providerConfig.models) : [];
      
      _modelsByProvider[c.provider] = {
        logo: providerConfig?.logo || "",
        credentialId: c.id,
        defaultModels: knownModels,
        customModels: customModels,
      };
    });

    return _modelsByProvider;
  }, [credentials]);

  const subMenus = useMemo(() => {
    const entries = Object.entries(modelsByProvider);
    if (!entries.length) {
      return (
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            No AI provider configured.
          </DropdownMenuItem>
        </DropdownMenuGroup>
      );
    }
    return (
      <DropdownMenuRadioGroup value={provider || "" + model || ""}>
        {entries.map(([providerName, providerDetails]) => {
          const hasDefaultModels = providerDetails.defaultModels.length > 0;
          const hasCustomModels = providerDetails.customModels.length > 0;
          
          return (
            <DropdownMenuGroup key={providerName}>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  id={`provider-${providerName}`}
                  className="flex items-center gap-2"
                >
                  <ProviderLogo svgString={providerDetails.logo} width={22} />
                  {providerName}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-56 max-h-[60vh] overflow-y-auto">
                    {/* Default Models Section */}
                    {hasDefaultModels && (
                      <>
                        {providerDetails.defaultModels.map((m) => (
                          <DropdownMenuItem
                            id={`model-${m}`}
                            key={m}
                            onClick={() => {
                              // Get the provider configuration
                              const providerConfig = AI_PROVIDERS_CONFIG[providerName as AIProviderType];
                              
                              // Get temperature range for the selected model
                              let temperatureRange: [number, number] = [0, 1];
                              let maxTokensLimit = 4096; // Default fallback
                              if (providerConfig) {
                                if (m in providerConfig.models) {
                                  temperatureRange = providerConfig.models[m].temperatureRange;
                                  maxTokensLimit = providerConfig.models[m].max_tokens;
                                } else {
                                  temperatureRange = providerConfig.defaultTemperatureRange;
                                  // For custom models, use a reasonable default
                                  maxTokensLimit = 4096;
                                }
                              }
                              
                              // Adjust temperature to fit within the valid range if needed
                              let adjustedTemperature = config.settings.temperature ?? 0;
                              if (adjustedTemperature < temperatureRange[0]) {
                                adjustedTemperature = temperatureRange[0];
                              } else if (adjustedTemperature > temperatureRange[1]) {
                                adjustedTemperature = temperatureRange[1];
                              }
                              
                              // Adjust maxTokens to fit within the model's limit if needed
                              let adjustedMaxTokens = config.settings.maxTokens;
                              if (adjustedMaxTokens && adjustedMaxTokens > maxTokensLimit) {
                                adjustedMaxTokens = maxTokensLimit;
                              }
                              
                              onChange({
                                ...config,
                                credentialId: providerDetails.credentialId,
                                model: m,
                                settings: {
                                  ...config.settings,
                                  temperature: adjustedTemperature,
                                  maxTokens: adjustedMaxTokens
                                }
                              });
                            }}
                          >
                            {m}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                    
                    {/* Custom Models Section */}
                    {hasCustomModels && (
                      <>
                      {hasDefaultModels && <DropdownMenuSeparator />}
                        {providerDetails.customModels.map((m) => (
                          <DropdownMenuItem
                            id={`model-${m}`}
                            key={m}
                            onClick={() => {
                              // Get the provider configuration
                              const providerConfig = AI_PROVIDERS_CONFIG[providerName as AIProviderType];
                              
                              // Get temperature range for the selected model
                              let temperatureRange: [number, number] = [0, 1];
                              let maxTokensLimit = 4096; // Default fallback
                              if (providerConfig) {
                                if (m in providerConfig.models) {
                                  temperatureRange = providerConfig.models[m].temperatureRange;
                                  maxTokensLimit = providerConfig.models[m].max_tokens;
                                } else {
                                  temperatureRange = providerConfig.defaultTemperatureRange;
                                  // For custom models, use a reasonable default
                                  maxTokensLimit = 4096;
                                }
                              }
                              
                              // Adjust temperature to fit within the valid range if needed
                              let adjustedTemperature = config.settings.temperature ?? 0;
                              if (adjustedTemperature < temperatureRange[0]) {
                                adjustedTemperature = temperatureRange[0];
                              } else if (adjustedTemperature > temperatureRange[1]) {
                                adjustedTemperature = temperatureRange[1];
                              }
                              
                              // Adjust maxTokens to fit within the model's limit if needed
                              let adjustedMaxTokens = config.settings.maxTokens;
                              if (adjustedMaxTokens && adjustedMaxTokens > maxTokensLimit) {
                                adjustedMaxTokens = maxTokensLimit;
                              }
                              
                              onChange({
                                ...config,
                                credentialId: providerDetails.credentialId,
                                model: m,
                                settings: {
                                  ...config.settings,
                                  temperature: adjustedTemperature,
                                  maxTokens: adjustedMaxTokens
                                }
                              });
                            }}
                          >
                            {m}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          );
        })}
      </DropdownMenuRadioGroup>
    );
  }, [modelsByProvider, provider, model, config, onChange]);

  const currentModelData = useMemo(() => {
    if (!currentProvider || !model) return null;
    return currentProvider.models[model];
  }, [currentProvider, model]);

  return (
    <div className={cn("flex", className)}>
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id="model-selector"
              variant="outline"
              role="combobox"
              className={cn("gap-2", model && "rounded-r-none border-r-0")}
              size="sm"
            >
              {isLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : model && provider && currentProvider ? (
                <div className="flex items-center gap-2">
                  <ProviderLogo svgString={currentProvider.logo} width={22} />
                  <span>{model}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Select a model...</span>
              )}
              <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-semibold">Models</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    refetch();
                  }}
                  title="Refresh providers"
                >
                  <RefreshCcw className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({to: "/settings"});
                  }}
                  title="Add provider"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <DropdownMenuSeparator />
            {subMenus}
          </DropdownMenuContent>
        </DropdownMenu>

        {!hideSettings && model && (
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="rounded-l-none px-2"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Model settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure the model parameters
                  </p>
                </div>
                <div className="grid gap-2">
                  <TemperatureSelector
                    value={config.settings.temperature ?? 0}
                    onChange={(temperature) => onChange({ ...config, settings: { ...config.settings, temperature } })}
                    model={model || ''}
                    provider={provider || ''}
                  />
                  <Separator />
                  <MaxLengthSelector
                    model={model}
                    provider={provider || ""}
                    value={config.settings.maxTokens}
                    onChange={(max_tokens) => onChange({ ...config, settings: { ...config.settings, maxTokens: max_tokens } })}
                  />
                  <Separator />
                  <PresenceSelector
                    value={config.settings.presencePenalty ?? 0}
                    onChange={(presence_penalty) =>
                      onChange({ ...config, settings: { ...config.settings, presencePenalty: presence_penalty } })
                    }
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
