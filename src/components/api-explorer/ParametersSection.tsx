import React, { JSX } from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { ParameterItem } from './ParameterItem';
import { resolveRef } from './utils';

interface ParametersSectionProps {
  title: string;
  parameters?: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[];
  requestBody?: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject;
  openapiSpec: OpenAPIV3.Document; // Needed for resolving refs
}

export const ParametersSection: React.FC<ParametersSectionProps> = ({ title, parameters, requestBody, openapiSpec }) => {
  const renderParameter = (paramData: OpenAPIV3.ParameterObject) => (
    <ParameterItem
      key={paramData.name + (paramData.in || '')}
      name={paramData.name}
      schema={paramData.schema as OpenAPIV3.SchemaObject} // Assuming schema is not a ref here after resolution
      description={paramData.description}
      required={paramData.required}
      openapiSpec={openapiSpec}
    />
  );

  const getResolvedParameter = (
    param: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject
  ): OpenAPIV3.ParameterObject | undefined => {
    if ('$ref' in param) {
      return resolveRef<OpenAPIV3.ParameterObject>(param.$ref, openapiSpec);
    }
    return param;
  };
  
  const itemsToRender: JSX.Element[] = [];

  if (parameters) {
    parameters.forEach(param => {
      const resolvedParam = getResolvedParameter(param);
      if (resolvedParam) {
        itemsToRender.push(renderParameter(resolvedParam));
      }
    });
  }

  if (requestBody) {
    const resolvedRequestBody = '$ref' in requestBody ? resolveRef<OpenAPIV3.RequestBodyObject>(requestBody.$ref, openapiSpec) : requestBody;
    if (resolvedRequestBody?.content) {
      // Typically, we'd look for 'application/json' or other relevant content types
      const jsonContent = resolvedRequestBody.content['application/json'];
      if (jsonContent?.schema) {
        let schema = jsonContent.schema;
        if ('$ref' in schema) {
          schema = resolveRef<OpenAPIV3.SchemaObject>(schema.$ref, openapiSpec) || {};
        }
        
        if (schema.type === 'object' && schema.properties) {
          Object.entries(schema.properties).forEach(([propName, propSchema]) => {
            let currentPropSchema = propSchema;
            if ('$ref' in currentPropSchema) {
              currentPropSchema = resolveRef<OpenAPIV3.SchemaObject>(currentPropSchema.$ref, openapiSpec) || {};
            }
            
            itemsToRender.push(
              <ParameterItem
                key={propName}
                name={propName}
                schema={currentPropSchema as OpenAPIV3.SchemaObject}
                description={(currentPropSchema as OpenAPIV3.SchemaObject).description}
                required={schema.required?.includes(propName)}
                openapiSpec={openapiSpec}
              />
            );
          });
        } else if (schema.type) { // Handle non-object schema for request body (e.g. string, array)
           itemsToRender.push(
             <ParameterItem
                key="requestBody"
                name="body" // Generic name for non-object body
                schema={schema as OpenAPIV3.SchemaObject}
                description={resolvedRequestBody.description || (schema as OpenAPIV3.SchemaObject).description}
                required={resolvedRequestBody.required}
                openapiSpec={openapiSpec}
              />
           );
        }
      }
    }
  }

  if (itemsToRender.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-base font-semibold tracking-tight mb-3">{title}</h2>
      <div className="divide-y divide-border rounded-md border border-border p-4 md:p-6">
        {itemsToRender.map((item, index) => (
          <React.Fragment key={item.key}>
            {item}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
};