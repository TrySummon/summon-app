import React from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ParameterItem } from './ParameterItem';

interface ResponseTypeSectionProps {
  responses: OpenAPIV3.ResponsesObject;
  openapiSpec: OpenAPIV3.Document;
  title: string;
}

interface ResponseTypeInfo {
  statusCode: string;
  contentType: string;
  schema: OpenAPIV3.SchemaObject;
  properties: Array<{
    name: string;
    schema: OpenAPIV3.SchemaObject;
    description?: string;
    required?: boolean;
  }>;
}

export const ResponseTypeSection: React.FC<ResponseTypeSectionProps> = ({ 
  responses, 
  openapiSpec,
  title
}) => {
  const [responseTypes, setResponseTypes] = React.useState<ResponseTypeInfo[]>([]);
  const [activeTab, setActiveTab] = React.useState<string>('0');

  React.useEffect(() => {
    const extractedTypes: ResponseTypeInfo[] = [];
    
    // Process all response status codes
    Object.entries(responses).forEach(([statusCode, response]) => {
      if ('content' in response && response.content) {
        processResponseContent(statusCode, response.content, response.description);
      }
    });

    function processResponseContent(statusCode: string, content: Record<string, OpenAPIV3.MediaTypeObject>, description?: string) {
      // Process each content type (application/json, etc.)
      Object.entries(content).forEach(([contentType, mediaTypeObject]) => {
        if (mediaTypeObject.schema) {
          let schema = mediaTypeObject.schema;
          
          const properties: ResponseTypeInfo['properties'] = [];
          
          // Extract properties from schema
          if ('type' in schema) {
            if (schema.type === 'object' && 'properties' in schema && schema.properties) {
              Object.entries(schema.properties).forEach(([propName, propSchema]) => {
                let resolvedPropSchema: OpenAPIV3.SchemaObject;
                
                resolvedPropSchema = propSchema as OpenAPIV3.SchemaObject;
                
                properties.push({
                  name: propName,
                  schema: resolvedPropSchema,
                  description: resolvedPropSchema.description,
                  required: 'required' in schema && Array.isArray(schema.required) ? schema.required.includes(propName) : false
                });
              });
            } else if (schema.type === 'array' && 'items' in schema && schema.items) {
              // For array types, we show the array item type
              let itemSchema: OpenAPIV3.SchemaObject;
              

              itemSchema = schema.items as OpenAPIV3.SchemaObject;
              
              properties.push({
                name: 'Array items',
                schema: {
                  ...itemSchema,
                  description: 'description' in itemSchema ? itemSchema.description : 'Array item type'
                },
                description: 'description' in itemSchema ? itemSchema.description : 'Array item type'
              });
            } else {
              // For primitive types
              properties.push({
                name: 'value',
                schema: schema,
                description: 'description' in schema ? schema.description : description
              });
            }
          } else {
            // Handle non-standard schema
            properties.push({
              name: 'value',
              schema: { type: 'object', description: 'Schema details not available' },
              description: 'Schema details not available'
            });
          }
          
          extractedTypes.push({
            statusCode,
            contentType,
            schema: schema as OpenAPIV3.SchemaObject,
            properties
          });
        }
      });
    }
    
    setResponseTypes(extractedTypes);
    // If types were found, set the first one as active
    if (extractedTypes.length > 0) {
      setActiveTab('0');
    }
  }, [responses, openapiSpec]);



  if (responseTypes.length === 0) {
    return null;
  }

  // Single response type
  if (responseTypes.length === 1) {
    const responseType = responseTypes[0];
    return (
      <section>
        <h2 className="text-base font-semibold tracking-tight mb-3">{title}</h2>
        <div className="divide-y divide-border rounded-md border border-border p-4 md:p-6">
          {responseType.properties.map((prop, index) => (
            <ParameterItem
              key={`${responseType.statusCode}-${prop.name}-${index}`}
              name={prop.name}
              schema={prop.schema}
              description={prop.description}
              required={prop.required}
              openapiSpec={openapiSpec}
            />
          ))}
          {responseType.properties.length === 0 && (
            <div className="py-4 text-sm text-muted-foreground">
              No detailed schema information available for this response.
            </div>
          )}
        </div>
      </section>
    );
  }

  // Multiple response types with tabs
  return (
    <section>
      <h2 className="text-base font-semibold tracking-tight mb-3">{title}</h2>
      <Tabs defaultValue="0" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          {responseTypes.map((type, index) => (
            <TabsTrigger key={index} value={index.toString()}>
              {type.statusCode}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {responseTypes.map((type, index) => (
          <TabsContent key={index} value={index.toString()}>
            <div className="divide-y divide-border rounded-md border border-border p-4 md:p-6">
              <div className="pb-2 mb-2 border-b border-border">
                <span className="text-xs font-medium">{type.contentType}</span>
              </div>
              {type.properties.map((prop, propIndex) => (
                <ParameterItem
                  key={`${type.statusCode}-${prop.name}-${propIndex}`}
                  name={prop.name}
                  schema={prop.schema}
                  description={prop.description}
                  required={prop.required}
                  openapiSpec={openapiSpec}
                />
              ))}
              {type.properties.length === 0 && (
                <div className="py-4 text-xs text-muted-foreground">
                  No detailed schema information available for this response.
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
};
