import React, { JSX } from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { ParameterItem } from './ParameterItem';

interface ParametersSectionProps {
  title: string;
  parameters?: OpenAPIV3.ParameterObject[];
  requestBody?: OpenAPIV3.RequestBodyObject;
}

export const ParametersSection: React.FC<ParametersSectionProps> = ({ title, parameters, requestBody }) => {
  const renderParameter = (paramData: OpenAPIV3.ParameterObject) => (
    <ParameterItem
      key={paramData.name + (paramData.in || '')}
      name={paramData.name}
      schema={paramData.schema as OpenAPIV3.SchemaObject}
      description={paramData.description}
      required={paramData.required}
    />
  );
  
  const itemsToRender: JSX.Element[] = parameters?.map(param => renderParameter(param)) || [];


  if (requestBody) {
    if (requestBody?.content) {
      // Typically, we'd look for 'application/json' or other relevant content types
      const jsonContent = requestBody.content['application/json'];
      if (jsonContent?.schema) {
        let schema = jsonContent.schema as OpenAPIV3.SchemaObject;

        if (schema.type === 'object' && schema.properties) {
          Object.entries(schema.properties).forEach(([propName, propSchema]) => {
            itemsToRender.push(
              <ParameterItem
                key={propName}
                name={propName}
                schema={propSchema as OpenAPIV3.SchemaObject}
                description={(propSchema as OpenAPIV3.SchemaObject).description}
                required={schema.required?.includes(propName)}
              />
            );
          });
        } else if (schema.type) { // Handle non-object schema for request body (e.g. string, array)
           itemsToRender.push(
             <ParameterItem
                key="requestBody"
                name="body" // Generic name for non-object body
                schema={schema}
                description={requestBody.description}
                required={requestBody.required}
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
        {itemsToRender.map((item) => (
          <React.Fragment key={item.key}>
            {item}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
};