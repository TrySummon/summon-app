import React from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';

interface SchemaDialogHeaderProps {
  schema: OpenAPIV3.SchemaObject;
  historyLength: number;
  name?: string;
  onGoBack?: () => void;
}

export const SchemaDialogHeader: React.FC<SchemaDialogHeaderProps> = ({
  schema,
  historyLength,
  name,
  onGoBack,
}) => {
  return (
    <DialogHeader className="flex-shrink-0 border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {historyLength > 1 && onGoBack && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 flex-shrink-0" 
              onClick={onGoBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <DialogTitle className="text-lg font-semibold truncate">
                  {name || 'Schema'}
                </DialogTitle>
            </div>
            
            <DialogDescription className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                {schema.type || 'unknown'}
              </Badge>
            </DialogDescription>
          </div>
        </div>
      </div>
      
      {/* Schema description */}
      {schema.description && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {schema.description}
          </p>
        </div>
      )}
    </DialogHeader>
  );
};
