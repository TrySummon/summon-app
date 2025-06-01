import React from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { Badge } from '@/components/ui/badge';

interface PrimitiveTypeProps {
  schema: OpenAPIV3.SchemaObject;
}

export const PrimitiveType: React.FC<PrimitiveTypeProps> = ({
  schema
}) => {
  return (
    <div className="space-y-4">
      {/* Description */}
      {'description' in schema && schema.description && (
        <div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {schema.description}
          </p>
        </div>
      )}
      
      {/* Schema details */}
      <div className="space-y-3">
        {/* Format */}
        {'format' in schema && schema.format && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Format:</span>
            <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
              {schema.format}
            </Badge>
          </div>
        )}
        
        {/* Default value */}
        {'default' in schema && schema.default !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Default:</span>
            <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
              {JSON.stringify(schema.default)}
            </Badge>
          </div>
        )}
        
        {/* Enum values */}
        {'enum' in schema && schema.enum && (
          <div>
            <span className="text-sm text-muted-foreground font-medium mb-2 block">
              Possible values:
            </span>
            <div className="flex flex-wrap gap-1">
              {schema.enum.map((val, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="font-mono text-xs bg-muted text-muted-foreground"
                >
                  {JSON.stringify(val)}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Minimum/Maximum for numbers */}
        {schema.type === 'number' || schema.type === 'integer' ? (
          <div className="space-y-2">
            {'minimum' in schema && schema.minimum !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">Minimum:</span>
                <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                  {schema.minimum}
                </Badge>
              </div>
            )}
            {'maximum' in schema && schema.maximum !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">Maximum:</span>
                <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                  {schema.maximum}
                </Badge>
              </div>
            )}
          </div>
        ) : null}
        
        {/* String length constraints */}
        {schema.type === 'string' ? (
          <div className="space-y-2">
            {'minLength' in schema && schema.minLength !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">Min Length:</span>
                <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                  {schema.minLength}
                </Badge>
              </div>
            )}
            {'maxLength' in schema && schema.maxLength !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">Max Length:</span>
                <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                  {schema.maxLength}
                </Badge>
              </div>
            )}
            {'pattern' in schema && schema.pattern && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">Pattern:</span>
                <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                  {schema.pattern}
                </Badge>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
