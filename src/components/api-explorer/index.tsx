import React from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { LeftColumn } from './LeftColumn';
import { RightColumn } from './RightColumn';

interface ApiExplorerProps {
  openapiSpec: OpenAPIV3.Document;
  endpointPath: string;
  endpointMethod: Lowercase<OpenAPIV3.HttpMethods>;
}

export const ApiExplorer: React.FC<ApiExplorerProps> = ({ openapiSpec, endpointPath, endpointMethod }) => {
  const pathItem = openapiSpec.paths[endpointPath];
  if (!pathItem) {
    return <div className="p-8 text-red-500">Error: Path "{endpointPath}" not found in OpenAPI spec.</div>;
  }

  const operation = pathItem[endpointMethod] as OpenAPIV3.OperationObject | undefined;
  if (!operation) {
    return <div className="p-8 text-red-500">Error: Method "{endpointMethod.toUpperCase()}" not found for path "{endpointPath}".</div>;
  }

  return (
    <div className="bg-background text-foreground w-full">
      <div className="container py-4">
        <div className="flex flex-col xl:flex-row xl:relative">
          {/* Left Column: API Details */}
          <div className="w-full xl:w-[60%] xl:pr-6">
            <LeftColumn
              operation={operation}
              path={endpointPath}
              method={endpointMethod}
              openapiSpec={openapiSpec}
            />
          </div>

          {/* Right Column: Code Examples & Response */}
          {/* On smaller screens (less than xl), this will stack below the LeftColumn */}
          {/* On xl screens and up, it's a sticky sidebar */}
          <div className="w-full xl:w-[40%] xl:mt-0 mt-4">
            <div className="xl:sticky xl:top-4">
              <RightColumn
                operation={operation}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};