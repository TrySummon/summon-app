import { createOpenAI } from '@ai-sdk/openai';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createAzure } from '@ai-sdk/azure';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createXai } from '@ai-sdk/xai';
import { AIProviderCredential, AIProviderType } from "@/components/ai-providers/types";

export function createLLMProvider(credential: AIProviderCredential) {
    switch (credential.provider) {
        case AIProviderType.OpenAI:
            return createOpenAI({ apiKey: credential.key, compatibility: "strict" });
        case AIProviderType.Anthropic:
            return createAnthropic({ apiKey: credential.key, headers: { 'anthropic-dangerous-direct-browser-access': 'true' } });
        case AIProviderType.Mistral:
            return createMistral({ apiKey: credential.key });
        case AIProviderType.AzureOpenAI:
            return createAzure({ apiKey: credential.key, apiVersion: credential.apiVersion, resourceName: credential.resourceName });
        case AIProviderType.AWSBedrock:
            return createAmazonBedrock({ accessKeyId: credential.resourceName, region: credential.apiVersion, secretAccessKey: credential.key });
        case AIProviderType.Google:
            return createGoogleGenerativeAI({ apiKey: credential.key });
        case AIProviderType.Grok:
            return createXai({ apiKey: credential.key });
        case AIProviderType.Custom:
            return createOpenAI({ apiKey: credential.key, baseURL: credential.baseUrl, compatibility: "strict" });
    }
}