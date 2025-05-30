"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';

interface ToolParameterDetailsProps {
  tool: any;
}

export const ToolParameterDetails: React.FC<ToolParameterDetailsProps> = ({ tool }) => {
  const hasParameters = tool.parameters && Object.keys(tool.parameters.properties || {}).length > 0;
  
  // Helper function to render properties of a schema object
  const renderSchemaProperties = (properties: any, required: string[] = []) => {
    return Object.entries(properties).map(([propName, propSchema]: [string, any]) => (
      <div key={propName} className="py-3 border-b border-border last:border-b-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-mono text-xs font-semibold">{propName}</span>
          {propSchema.type && (
            <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
              {propSchema.type}
              {propSchema.type === 'array' && propSchema.items && propSchema.items.type && 
                `<${propSchema.items.type}>`}
            </Badge>
          )}
          {required?.includes(propName) && (
            <Badge variant="outline" className="font-mono text-xs border-red-500/50 bg-red-500/10 text-red-500">
              required
            </Badge>
          )}
        </div>

        {propSchema.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {propSchema.description}
          </p>
        )}

        {propSchema.enum && (
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold">Possible values: </span>
            {propSchema.enum.map((val: any, idx: number) => (
              <code key={idx} className="font-mono bg-muted p-0.5 rounded-sm mx-0.5">
                {JSON.stringify(val)}
              </code>
            ))}
          </div>
        )}

        {propSchema.default !== undefined && (
          <div className="mt-1">
            <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
              default: {JSON.stringify(propSchema.default)}
            </Badge>
          </div>
        )}

        {/* Recursively render nested object properties */}
        {propSchema.type === 'object' && propSchema.properties && (
          <div className="mt-2 pl-4 border-l-2 border-border">
            <p className="text-xs font-medium mb-1">Properties:</p>
            {renderSchemaProperties(propSchema.properties, propSchema.required)}
          </div>
        )}

        {/* Render array item details if it's an object */}
        {propSchema.type === 'array' && propSchema.items && propSchema.items.type === 'object' && propSchema.items.properties && (
          <div className="mt-2 pl-4 border-l-2 border-border">
            <p className="text-xs font-medium mb-1">Array item properties:</p>
            {renderSchemaProperties(propSchema.items.properties, propSchema.items.required)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Tool Information</h3>
        <p className="text-sm text-muted-foreground">{tool.description}</p>
      </div>

      {hasParameters && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-medium mb-2">Parameters</h3>
            <Accordion type="multiple" className="w-full" defaultValue={Object.keys(tool.parameters.properties)}>
              {Object.entries(tool.parameters.properties).map(([name, schema]: [string, any]) => (
                <AccordionItem value={name} key={name}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{name}</span>
                      {schema.type && (
                        <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                          {schema.type}
                        </Badge>
                      )}
                      {tool.parameters.required?.includes(name) && (
                        <Badge variant="outline" className="font-mono text-xs border-red-500/50 bg-red-500/10 text-red-500">
                          required
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {schema.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {schema.description}
                      </p>
                    )}
                    
                    {/* For object types, render their properties */}
                    {schema.type === 'object' && schema.properties && (
                      <div className="border rounded-md divide-y divide-border">
                        {renderSchemaProperties(schema.properties, schema.required)}
                      </div>
                    )}
                    
                    {/* For array types with object items */}
                    {schema.type === 'array' && schema.items && schema.items.type === 'object' && schema.items.properties && (
                      <div className="border rounded-md divide-y divide-border">
                        <p className="text-xs font-medium p-2">Array item properties:</p>
                        {renderSchemaProperties(schema.items.properties, schema.items.required)}
                      </div>
                    )}
                    
                    {/* For simple types */}
                    {(!schema.properties && schema.type !== 'object' && 
                      !(schema.type === 'array' && schema.items && schema.items.type === 'object')) && (
                      <div className="text-sm">
                        {schema.enum && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="font-semibold">Possible values: </span>
                            {schema.enum.map((val: any, idx: number) => (
                              <code key={idx} className="font-mono bg-muted p-0.5 rounded-sm mx-0.5">
                                {JSON.stringify(val)}
                              </code>
                            ))}
                          </div>
                        )}
                        {schema.default !== undefined && (
                          <div className="mt-1">
                            <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                              default: {JSON.stringify(schema.default)}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </>
      )}

      {/* Add return type section if needed */}
      {tool.returnSchema && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-medium mb-2">Return Type</h3>
            <div className="border rounded-md p-3">
              <pre className="text-xs overflow-auto whitespace-pre-wrap">
                {JSON.stringify(tool.returnSchema, null, 2)}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
