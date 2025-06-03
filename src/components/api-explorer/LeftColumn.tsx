import React from "react";
import { OpenAPIV3 } from "openapi-types";
import { EndpointHeader } from "./EndpointHeader";
import { EndpointPathDisplay } from "./EndpointPath";
import { ParametersSection } from "./ParametersSection";
import { ResponseTypeSection } from "./ResponseTypeSection";
import { Separator } from "@/components/ui/separator";

interface LeftColumnProps {
  operation: OpenAPIV3.OperationObject;
  path: string;
  method: string;
  openapiSpec: OpenAPIV3.Document;
}

export const LeftColumn: React.FC<LeftColumnProps> = ({
  operation,
  path,
  method,
  openapiSpec,
}) => {
  const pathParams = operation.parameters?.filter(
    (p) => "in" in p && p.in === "path",
  ) as OpenAPIV3.ParameterObject[] | undefined;
  const queryParams = operation.parameters?.filter(
    (p) => "in" in p && p.in === "query",
  ) as OpenAPIV3.ParameterObject[] | undefined;
  const headerParams = operation.parameters?.filter(
    (p) => "in" in p && p.in === "header",
  ) as OpenAPIV3.ParameterObject[] | undefined;

  return (
    <div className="flex w-full flex-col gap-6 xl:pr-8">
      <EndpointHeader
        tags={operation.tags}
        summary={
          operation.operationId || operation.summary || "Untitled Endpoint"
        }
        description={operation.description}
      />
      <EndpointPathDisplay method={method} path={path} />

      <Separator />

      {operation.requestBody && (
        <ParametersSection
          title="Body Parameters"
          requestBody={operation.requestBody as OpenAPIV3.RequestBodyObject}
        />
      )}

      {pathParams && pathParams.length > 0 && (
        <ParametersSection title="Path Parameters" parameters={pathParams} />
      )}

      {queryParams && queryParams.length > 0 && (
        <ParametersSection title="Query Parameters" parameters={queryParams} />
      )}

      {headerParams && headerParams.length > 0 && (
        <ParametersSection
          title="Header Parameters"
          parameters={headerParams}
        />
      )}

      {operation.responses && Object.keys(operation.responses).length > 0 && (
        <>
          <Separator />
          <ResponseTypeSection
            title="Response Types"
            responses={operation.responses}
            openapiSpec={openapiSpec}
          />
        </>
      )}
    </div>
  );
};
