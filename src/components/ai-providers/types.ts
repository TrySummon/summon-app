export enum AIProviderType {
  OpenAI = "OpenAI",
  Anthropic = "Anthropic",
  Mistral = "Mistral",
  AzureOpenAI = "AzureOpenAI",
  AWSBedrock = "AWSBedrock",
  Google = "Google",
  Grok = "Grok",
  Custom = "Custom",
}

export interface AIProviderCredential {
  id: string;
  name: string;
  type: AIProviderType;
  configured: boolean;
  apiKey: string;
  createdAt: Date | null;
  // Additional fields for specific providers
  resourceName?: string;
  apiVersion?: string;
  deploymentId?: string;
  baseUrl?: string;
  models?: string[];
}

export interface ProviderConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'list';
  placeholder?: string;
  required: boolean;
  autoComplete?: string;
}

export type AIProviderConfig = {
  displayName: string;
  logo: string;
  config: {
    autoComplete?: "on" | "off";
    key: "key" | "models" | "baseUrl" | "resourceName" | "apiVersion";
    label: string;
    placeholder?: string;
    type: string;
  }[];
  models: Record<
    string,
    {
      name: string;
      max_tokens: number;
      temperatureRange: [number, number];
    }
  >;
  defaultModel?: string;
  defaultTemperatureRange: [number, number];
};

export const API_KEY_LABEL = 'API Key *';

// Configuration for each provider
export const AI_PROVIDERS_CONFIG: Record<AIProviderType, AIProviderConfig> = {
    [AIProviderType.OpenAI]: {
      displayName: "OpenAI",
      logo: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2"><path d="M474.123 209.81c11.525-34.577 7.569-72.423-10.838-103.904-27.696-48.168-83.433-72.94-137.794-61.414a127.14 127.14 0 00-95.475-42.49c-55.564 0-104.936 35.781-122.139 88.593-35.781 7.397-66.574 29.76-84.637 61.414-27.868 48.167-21.503 108.72 15.826 150.007-11.525 34.578-7.569 72.424 10.838 103.733 27.696 48.34 83.433 73.111 137.966 61.585 24.084 27.18 58.833 42.835 95.303 42.663 55.564 0 104.936-35.782 122.139-88.594 35.782-7.397 66.574-29.76 84.465-61.413 28.04-48.168 21.676-108.722-15.654-150.008v-.172zm-39.567-87.218c11.01 19.267 15.139 41.803 11.354 63.65-.688-.516-2.064-1.204-2.924-1.72l-101.152-58.49a16.965 16.965 0 00-16.687 0L206.621 194.5v-50.232l97.883-56.597c45.587-26.32 103.732-10.666 130.052 34.921zm-227.935 104.42l49.888-28.9 49.887 28.9v57.63l-49.887 28.9-49.888-28.9v-57.63zm23.223-191.81c22.364 0 43.867 7.742 61.07 22.02-.688.344-2.064 1.204-3.097 1.72L186.666 117.26c-5.161 2.925-8.258 8.43-8.258 14.45v136.934l-43.523-25.116V130.333c0-52.64 42.491-95.13 95.131-95.302l-.172.172zM52.14 168.697c11.182-19.268 28.557-34.062 49.544-41.803V247.14c0 6.02 3.097 11.354 8.258 14.45l118.354 68.295-43.695 25.288-97.711-56.425c-45.415-26.32-61.07-84.465-34.75-130.052zm26.665 220.71c-11.182-19.095-15.139-41.802-11.354-63.65.688.516 2.064 1.204 2.924 1.72l101.152 58.49a16.965 16.965 0 0016.687 0l118.354-68.467v50.232l-97.883 56.425c-45.587 26.148-103.732 10.665-130.052-34.75h.172zm204.54 87.39c-22.192 0-43.867-7.741-60.898-22.02a62.439 62.439 0 003.097-1.72l101.152-58.317c5.16-2.924 8.429-8.43 8.257-14.45V243.527l43.523 25.116v113.022c0 52.64-42.663 95.303-95.131 95.303v-.172zM461.22 343.303c-11.182 19.267-28.729 34.061-49.544 41.63V264.687c0-6.021-3.097-11.526-8.257-14.45L284.893 181.77l43.523-25.116 97.883 56.424c45.587 26.32 61.07 84.466 34.75 130.053l.172.172z" fill-rule="nonzero"/></svg>`,      config: [
        {
          autoComplete: "off",
          key: "key",
          label: API_KEY_LABEL,
          placeholder: "sk-1234",
          type: "string",
        },
        {
          key: "models",
          label: "Custom Models",
          type: "list",
        },
        {
          key: "baseUrl",
          label: "Base URL",
          placeholder: "https://api.openai.com/v1",
          type: "string",
        },
      ],
      models: {
        "gpt-4o": {
          name: "gpt-4o",
          max_tokens: 16384,
          temperatureRange: [0, 2],
        },
        "gpt-4o-mini": {
            name: "gpt-4o-mini",
            max_tokens: 16384,
            temperatureRange: [0, 2],
          },
        "gpt-4.1": {
            name: "gpt-4.1",
            max_tokens: 32768,
            temperatureRange: [0, 2],
          },
          "gpt-4.1-mini": {
            name: "gpt-4.1-mini",
            max_tokens: 32768,
            temperatureRange: [0, 2],
          },
          "gpt-4.1-nano": {
            name: "gpt-4.1-nano",
            max_tokens: 32768,
            temperatureRange: [0, 2],
          },
        "o4-mini": {
            name: "o4-mini",
            max_tokens: 100000,
            temperatureRange: [1, 1],
          },
          "o3": {
            name: "o3",
            max_tokens: 100000,
            temperatureRange: [1, 1],
          },
          "o3-mini": {
            name: "o3-mini",
            max_tokens: 100000,
            temperatureRange: [1, 1],
          },
        "o1": {
          name: "o1",
          max_tokens: 100000,
          temperatureRange: [1, 1],
        },
        "o1-mini": {
          name: "o1-mini",
          max_tokens: 100000,
          temperatureRange: [1, 1],
        }
      },
      defaultModel: "gpt-4o",
      defaultTemperatureRange: [0, 2],
    },
    [AIProviderType.Mistral]: {
      displayName: "Mistral",
      logo: `<svg width="256px" height="233px" viewBox="0 0 256 233" version="1.1" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
      <g>
          <rect fill="#000000" x="186.181818" y="0" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#F7D046" x="209.454545" y="0" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#000000" x="0" y="0" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#000000" x="0" y="46.5454545" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#000000" x="0" y="93.0909091" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#000000" x="0" y="139.636364" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#000000" x="0" y="186.181818" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#F7D046" x="23.2727273" y="0" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#F2A73B" x="209.454545" y="46.5454545" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#F2A73B" x="23.2727273" y="46.5454545" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#000000" x="139.636364" y="46.5454545" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#F2A73B" x="162.909091" y="46.5454545" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#F2A73B" x="69.8181818" y="46.5454545" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#EE792F" x="116.363636" y="93.0909091" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#EE792F" x="162.909091" y="93.0909091" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#EE792F" x="69.8181818" y="93.0909091" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#000000" x="93.0909091" y="139.636364" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#EB5829" x="116.363636" y="139.636364" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#EE792F" x="209.454545" y="93.0909091" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#EE792F" x="23.2727273" y="93.0909091" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#000000" x="186.181818" y="139.636364" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#EB5829" x="209.454545" y="139.636364" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#000000" x="186.181818" y="186.181818" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#EB5829" x="23.2727273" y="139.636364" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#EA3326" x="209.454545" y="186.181818" width="46.5454545" height="46.5454545"></rect>
          <rect fill="#EA3326" x="23.2727273" y="186.181818" width="46.5454545" height="46.5454545"></rect>
      </g>
  </svg>`,      config: [
        {
          autoComplete: "off",
          key: "key",
          label: API_KEY_LABEL,
          placeholder: "sk-1234",
          type: "string",
        },
        {
          key: "models",
          label: "Custom Models",
          type: "list",
        },
        {
          key: "baseUrl",
          label: "Base URL",
          placeholder: "https://api.openai.com/v1",
          type: "string",
        },
      ],
      models: {
        "mistral-large-latest": {
          name: "mistral-large-latest",
          max_tokens: 131072,
          temperatureRange: [0, 1],
        },
        "mistral-medium-latest": {
          name: "mistral-medium-latest",
          max_tokens: 32768,
          temperatureRange: [0, 1],
        },
       
        "mistral-small-latest": {
          name: "mistral-small-latest",
          max_tokens: 32768,
          temperatureRange: [0, 1],
        },
       
        "ministral-8b-latest": {
            name: "ministral-8b-latest",
            max_tokens: 32768,
            temperatureRange: [0, 1],
          },
         
        "codestral-latest": {
          name: "codestral-latest",
          max_tokens: 32768,
          temperatureRange: [0, 1],
        }
      },
      defaultModel: "mistral-large-latest",
      defaultTemperatureRange: [0, 1],
    },
    [AIProviderType.AzureOpenAI]: {
      displayName: "Azure OpenAI",
      logo: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2"><g fill-rule="nonzero"><path d="M52.091 10.225h40.684L50.541 135.361a6.5 6.5 0 01-6.146 4.412H12.732c-3.553 0-6.477-2.923-6.477-6.476 0-.704.115-1.403.34-2.07L45.944 14.638a6.501 6.501 0 016.147-4.415v.002z" fill="url(#prefix___Linear1)" transform="translate(2.076 1.626) scale(3.37462)"/><path d="M377.371 319.374H159.644c-5.527 0-10.076 4.549-10.076 10.077 0 2.794 1.164 5.466 3.206 7.37l139.901 130.577a21.986 21.986 0 0015.004 5.91H430.96l-53.589-153.934z" fill="#0078d4"/><path d="M52.091 10.225a6.447 6.447 0 00-6.161 4.498L6.644 131.12a6.457 6.457 0 00-.38 2.185c0 3.548 2.92 6.468 6.469 6.468H45.23a6.95 6.95 0 005.328-4.531l7.834-23.089 27.985 26.102a6.622 6.622 0 004.165 1.518h36.395l-15.962-45.615-46.533.011 28.48-83.944H52.091z" fill="url(#prefix___Linear2)" transform="translate(2.076 1.626) scale(3.37462)"/><path d="M104.055 14.631a6.492 6.492 0 00-6.138-4.406H52.575a6.493 6.493 0 016.138 4.406l39.35 116.594c.225.668.34 1.367.34 2.072 0 3.554-2.924 6.478-6.478 6.478h45.344c3.553-.001 6.476-2.925 6.476-6.478 0-.705-.115-1.404-.34-2.072l-39.35-116.594z" fill="url(#prefix___Linear3)" transform="translate(2.076 1.626) scale(3.37462)"/></g><defs><linearGradient id="prefix___Linear1" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="rotate(108.701 26.35 33.911) scale(131.7791)"><stop offset="0" stop-color="#114a8b"/><stop offset="1" stop-color="#0669bc"/></linearGradient><linearGradient id="prefix___Linear2" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="rotate(161.318 33.644 45.587) scale(10.31703)"><stop offset="0" stop-opacity=".3"/><stop offset=".07" stop-opacity=".2"/><stop offset=".32" stop-opacity=".1"/><stop offset=".62" stop-opacity=".05"/><stop offset="1" stop-opacity="0"/></linearGradient><linearGradient id="prefix___Linear3" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="rotate(69.426 25.69 62.036) scale(131.9816)"><stop offset="0" stop-color="#3ccbf4"/><stop offset="1" stop-color="#2892df"/></linearGradient></defs></svg>`,      config: [
        {
          autoComplete: "off",
          key: "key",
          label: API_KEY_LABEL,
          placeholder: "sk-1234",
          type: "string",
        },
        {
          key: "resourceName",
          label: "Azure Resource Name *",
          type: "string",
          placeholder: "my-resource-name",
        },
        {
          key: "apiVersion",
          label: "Azure API version *",
          type: "string",
          placeholder: "2023-12-01-preview",
        },
        {
          key: "models",
          label: "Azure deployment ID list *",
          type: "list",
        },
        {
          key: "baseUrl",
          label: "Base URL",
          placeholder: "https://api.openai.com/v1",
          type: "string",
        },
      ],
      models: {},
      defaultModel: undefined,
      defaultTemperatureRange: [0, 2],
    },
    [AIProviderType.AWSBedrock]: {
      displayName: "AWS Bedrock",
      logo: `<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 304 182" style="enable-background:new 0 0 304 182;" xml:space="preserve">
      <style type="text/css">
        .st0{fill:#252F3E;}
        .st1{fill-rule:evenodd;clip-rule:evenodd;fill:#FF9900;}
      </style>
      <g>
        <path class="st0" d="M86.4,66.4c0,3.7,0.4,6.7,1.1,8.9c0.8,2.2,1.8,4.6,3.2,7.2c0.5,0.8,0.7,1.6,0.7,2.3c0,1-0.6,2-1.9,3l-6.3,4.2   c-0.9,0.6-1.8,0.9-2.6,0.9c-1,0-2-0.5-3-1.4C76.2,90,75,88.4,74,86.8c-1-1.7-2-3.6-3.1-5.9c-7.8,9.2-17.6,13.8-29.4,13.8   c-8.4,0-15.1-2.4-20-7.2c-4.9-4.8-7.4-11.2-7.4-19.2c0-8.5,3-15.4,9.1-20.6c6.1-5.2,14.2-7.8,24.5-7.8c3.4,0,6.9,0.3,10.6,0.8   c3.7,0.5,7.5,1.3,11.5,2.2v-7.3c0-7.6-1.6-12.9-4.7-16c-3.2-3.1-8.6-4.6-16.3-4.6c-3.5,0-7.1,0.4-10.8,1.3c-3.7,0.9-7.3,2-10.8,3.4   c-1.6,0.7-2.8,1.1-3.5,1.3c-0.7,0.2-1.2,0.3-1.6,0.3c-1.4,0-2.1-1-2.1-3.1v-4.9c0-1.6,0.2-2.8,0.7-3.5c0.5-0.7,1.4-1.4,2.8-2.1   c3.5-1.8,7.7-3.3,12.6-4.5c4.9-1.3,10.1-1.9,15.6-1.9c11.9,0,20.6,2.7,26.2,8.1c5.5,5.4,8.3,13.6,8.3,24.6V66.4z M45.8,81.6   c3.3,0,6.7-0.6,10.3-1.8c3.6-1.2,6.8-3.4,9.5-6.4c1.6-1.9,2.8-4,3.4-6.4c0.6-2.4,1-5.3,1-8.7v-4.2c-2.9-0.7-6-1.3-9.2-1.7   c-3.2-0.4-6.3-0.6-9.4-0.6c-6.7,0-11.6,1.3-14.9,4c-3.3,2.7-4.9,6.5-4.9,11.5c0,4.7,1.2,8.2,3.7,10.6   C37.7,80.4,41.2,81.6,45.8,81.6z M126.1,92.4c-1.8,0-3-0.3-3.8-1c-0.8-0.6-1.5-2-2.1-3.9L96.7,10.2c-0.6-2-0.9-3.3-0.9-4   c0-1.6,0.8-2.5,2.4-2.5h9.8c1.9,0,3.2,0.3,3.9,1c0.8,0.6,1.4,2,2,3.9l16.8,66.2l15.6-66.2c0.5-2,1.1-3.3,1.9-3.9c0.8-0.6,2.2-1,4-1   h8c1.9,0,3.2,0.3,4,1c0.8,0.6,1.5,2,1.9,3.9l15.8,67l17.3-67c0.6-2,1.3-3.3,2-3.9c0.8-0.6,2.1-1,3.9-1h9.3c1.6,0,2.5,0.8,2.5,2.5   c0,0.5-0.1,1-0.2,1.6c-0.1,0.6-0.3,1.4-0.7,2.5l-24.1,77.3c-0.6,2-1.3,3.3-2.1,3.9c-0.8,0.6-2.1,1-3.8,1h-8.6c-1.9,0-3.2-0.3-4-1   c-0.8-0.7-1.5-2-1.9-4L156,23l-15.4,64.4c-0.5,2-1.1,3.3-1.9,4c-0.8,0.7-2.2,1-4,1H126.1z M254.6,95.1c-5.2,0-10.4-0.6-15.4-1.8   c-5-1.2-8.9-2.5-11.5-4c-1.6-0.9-2.7-1.9-3.1-2.8c-0.4-0.9-0.6-1.9-0.6-2.8v-5.1c0-2.1,0.8-3.1,2.3-3.1c0.6,0,1.2,0.1,1.8,0.3   c0.6,0.2,1.5,0.6,2.5,1c3.4,1.5,7.1,2.7,11,3.5c4,0.8,7.9,1.2,11.9,1.2c6.3,0,11.2-1.1,14.6-3.3c3.4-2.2,5.2-5.4,5.2-9.5   c0-2.8-0.9-5.1-2.7-7c-1.8-1.9-5.2-3.6-10.1-5.2L246,52c-7.3-2.3-12.7-5.7-16-10.2c-3.3-4.4-5-9.3-5-14.5c0-4.2,0.9-7.9,2.7-11.1   c1.8-3.2,4.2-6,7.2-8.2c3-2.3,6.4-4,10.4-5.2c4-1.2,8.2-1.7,12.6-1.7c2.2,0,4.5,0.1,6.7,0.4c2.3,0.3,4.4,0.7,6.5,1.1   c2,0.5,3.9,1,5.7,1.6c1.8,0.6,3.2,1.2,4.2,1.8c1.4,0.8,2.4,1.6,3,2.5c0.6,0.8,0.9,1.9,0.9,3.3v4.7c0,2.1-0.8,3.2-2.3,3.2   c-0.8,0-2.1-0.4-3.8-1.2c-5.7-2.6-12.1-3.9-19.2-3.9c-5.7,0-10.2,0.9-13.3,2.8c-3.1,1.9-4.7,4.8-4.7,8.9c0,2.8,1,5.2,3,7.1   c2,1.9,5.7,3.8,11,5.5l14.2,4.5c7.2,2.3,12.4,5.5,15.5,9.6c3.1,4.1,4.6,8.8,4.6,14c0,4.3-0.9,8.2-2.6,11.6   c-1.8,3.4-4.2,6.4-7.3,8.8c-3.1,2.5-6.8,4.3-11.1,5.6C264.4,94.4,259.7,95.1,254.6,95.1z"/>
        <g>
          <path class="st1" d="M273.5,143.7c-32.9,24.3-80.7,37.2-121.8,37.2c-57.6,0-109.5-21.3-148.7-56.7c-3.1-2.8-0.3-6.6,3.4-4.4    c42.4,24.6,94.7,39.5,148.8,39.5c36.5,0,76.6-7.6,113.5-23.2C274.2,133.6,278.9,139.7,273.5,143.7z"/>
          <path class="st1" d="M287.2,128.1c-4.2-5.4-27.8-2.6-38.5-1.3c-3.2,0.4-3.7-2.4-0.8-4.5c18.8-13.2,49.7-9.4,53.3-5    c3.6,4.5-1,35.4-18.6,50.2c-2.7,2.3-5.3,1.1-4.1-1.9C282.5,155.7,291.4,133.4,287.2,128.1z"/>
        </g>
      </g>
      </svg>`,      config: [
        {
          key: "key",
          label: "Secret Access key *",
          placeholder: "sk-1234",
          type: "string",
        },
        {
          key: "resourceName",
          label: "Access Key ID *",
          type: "string",
          placeholder: "my-access-key-id",
        },
        {
          key: "apiVersion",
          label: "Region *",
          type: "string",
          placeholder: "us-east-1",
        },
        {
          key: "models",
          label: "Models",
          type: "list",
        },
        {
          key: "baseUrl",
          label: "Base URL",
          placeholder: "https://api.openai.com/v1",
          type: "string",
        },
      ],
      models: {},
      defaultModel: undefined,
      defaultTemperatureRange: [0, 2],
    },
    [AIProviderType.Anthropic]: {
      displayName: "Anthropic",
      logo: `<svg width="256px" height="176px" viewBox="0 0 256 176" version="1.1" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
      <title>Anthropic</title>
      <g fill="#181818">
          <path d="M147.486878,0 C147.486878,0 217.568251,175.780074 217.568251,175.780074 C217.568251,175.780074 256,175.780074 256,175.780074 C256,175.780074 185.918621,0 185.918621,0 C185.918621,0 147.486878,0 147.486878,0 C147.486878,0 147.486878,0 147.486878,0 Z"></path>
          <path d="M66.1828124,106.221191 C66.1828124,106.221191 90.1624677,44.4471185 90.1624677,44.4471185 C90.1624677,44.4471185 114.142128,106.221191 114.142128,106.221191 C114.142128,106.221191 66.1828124,106.221191 66.1828124,106.221191 C66.1828124,106.221191 66.1828124,106.221191 66.1828124,106.221191 Z M70.0705318,0 C70.0705318,0 0,175.780074 0,175.780074 C0,175.780074 39.179211,175.780074 39.179211,175.780074 C39.179211,175.780074 53.5097704,138.86606 53.5097704,138.86606 C53.5097704,138.86606 126.817544,138.86606 126.817544,138.86606 C126.817544,138.86606 141.145724,175.780074 141.145724,175.780074 C141.145724,175.780074 180.324935,175.780074 180.324935,175.780074 C180.324935,175.780074 110.254409,0 110.254409,0 C110.254409,0 70.0705318,0 70.0705318,0 C70.0705318,0 70.0705318,0 70.0705318,0 Z"></path>
      </g></svg>`,      config: [
        {
          autoComplete: "off",
          key: "key",
          label: API_KEY_LABEL,
          placeholder: "sk-1234",
          type: "string",
        },
        {
          key: "models",
          label: "Custom Models",
          type: "list",
        },
        {
          key: "baseUrl",
          label: "Base URL",
          placeholder: "https://api.openai.com/v1",
          type: "string",
        },
      ],
      models: {
        "claude-opus-4-20250514": {
            name: "claude-opus-4-20250514",
            max_tokens: 32000,
            temperatureRange: [0, 1],
          },
          "claude-sonnet-4-20250514": {
            name: "claude-sonnet-4-20250514",
            max_tokens: 64000,
            temperatureRange: [0, 1],
          },
        "claude-3-7-sonnet-latest": {
          name: "claude-3-7-sonnet-latest",
          max_tokens: 64000,
          temperatureRange: [0, 1],
        },
        "claude-3-5-sonnet-latest": {
          name: "claude-3-5-sonnet-latest",
          max_tokens: 8192,
          temperatureRange: [0, 1],
        }
      },
      defaultModel: "claude-sonnet-4-20250514",
      defaultTemperatureRange: [0, 1],
    },
    [AIProviderType.Google]: {
      displayName: "Google",
      logo: `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>`,      config: [
        {
          autoComplete: "off",
          key: "key",
          label: API_KEY_LABEL,
          placeholder: "sk-1234",
          type: "string",
        },
        {
          key: "models",
          label: "Custom Models",
          type: "list",
        },
        {
          key: "baseUrl",
          label: "Base URL",
          placeholder: "https://api.openai.com/v1",
          type: "string",
        },
      ],
      models: {
        "gemini-2.5-pro-preview-05-06": {
          name: "gemini-2.5-pro-preview-05-06",
          max_tokens: 65536,
          temperatureRange: [0, 2],
        },
        "gemini-2.5-flash-preview-05-20": {
            name: "gemini-2.5-flash-preview-05-20",
            max_tokens: 65536,
            temperatureRange: [0, 2],
          },
      },
      defaultModel: "gemini-2.5-pro-preview-05-06",
      defaultTemperatureRange: [0, 2],
    },
    [AIProviderType.Custom]: {
      displayName: "Custom",
      logo: `<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 21H6C4.11438 21 3.17157 21 2.58579 20.4142C2 19.8284 2 18.8856 2 17C2 15.1144 2 14.1716 2 13.5858C2.58579 13 3.17157 13 4.00001 13H18C19.8856 13 20.8284 13 21.4142 13.5858C22 14.1716 22 15.1144 22 17C22 18.8856 22 19.8284 21.4142 20.4142C20.8284 21 19.8856 21 18 21H17" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/><path d="M11 2H18C19.8856 2 20.8284 2 21.4142 2.58579C22 3.17157 22 4.11438 22 6C22 7.88562 22 8.82843 21.4142 9.41421C20.8284 10 19.8856 10 18 10H6C4.11438 10 3.17157 10 2.58579 9.41421C2 8.82843 2 7.88562 2 6C2 4.11438 2 3.17157 2.58579 2.58579C3.17157 2 4.11438 2 6 2H7" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/><path d="M11 6H18" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/><path d="M6 6H8" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/><path d="M11 17H18" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/><path d="M6 17H8" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      config: [
        {
          autoComplete: "off",
          key: "key",
          label: API_KEY_LABEL,
          placeholder: "sk-1234",
          type: "string",
        },
        {
          key: "models",
          label: "Models",
          type: "list",
        },
        {
          key: "baseUrl",
          label: "Base URL",
          placeholder: "https://api.openai.com/v1",
          type: "string",
        },
      ],
      models: {},
      defaultModel: undefined,
      defaultTemperatureRange: [0, 2],
    },
    [AIProviderType.Grok]: {
      displayName: "Grok",
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="727.27" height="778.68" version="1.1" viewBox="0 0 727.27 778.68">
    <polygon transform="translate(-134,-113.32)" points="508.67 574.07 761.27 213.32 639.19 213.32 447.64 486.9"/>
    <polygon transform="translate(-134,-113.32)" points="356.08 792 417.12 704.83 356.08 617.66 234 792"/>
    <polygon transform="translate(-134,-113.32)" points="508.67 792 630.75 792 356.08 399.72 234 399.72"/>
    <polygon transform="translate(-134,-113.32)" points="761.27 256.91 661.27 399.72 671.27 792 751.27 792"/>
  </svg>`,      config: [
        {
          autoComplete: "off",
          key: "key",
          label: API_KEY_LABEL,
          placeholder: "xai-1234",
          type: "string",
        },
        {
          key: "baseUrl",
          label: "Base URL",
          placeholder: "https://api.xai.com",
          type: "string",
        },
      ],
      models: {
        "grok-3-latest": {
          name: "grok-3-latest",
          max_tokens: 131072,
          temperatureRange: [0, 1],
        },
        "grok-3-fast": {
            name: "grok-3-fast",
            max_tokens: 131072,
            temperatureRange: [0, 1],
          },
          "grok-3-mini": {
            name: "grok-3-mini",
            max_tokens: 131072,
            temperatureRange: [0, 1],
          },
          "grok-3-mini-fast": {
            name: "grok-3-mini-fast",
            max_tokens: 131072,
            temperatureRange: [0, 1],
          },
      },
      defaultModel: "grok-3-latest",
      defaultTemperatureRange: [0, 1],
    },
  } as const;
