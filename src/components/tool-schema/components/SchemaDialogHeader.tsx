import React from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Edit3, RotateCcw } from 'lucide-react';

interface SchemaDialogHeaderProps {
  schema: OpenAPIV3.SchemaObject;
  historyLength: number;
  hasChanges?: boolean;
  name?: string;
  editingName?: boolean;
  nameValue?: string;
  editable?: boolean;
  onGoBack?: () => void;
  onResetAll?: () => void;
  onEditName?: () => void;
  onNameChange?: (value: string) => void;
  onResetName?: () => void;
}

export const SchemaDialogHeader: React.FC<SchemaDialogHeaderProps> = ({
  schema,
  historyLength,
  hasChanges = false,
  name,
  editingName = false,
  nameValue = '',
  editable = false,
  onGoBack,
  onResetAll,
  onEditName,
  onNameChange,
  onResetName,
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
              {editingName && onNameChange ? (
                <Input
                  value={nameValue}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="font-semibold text-lg h-8 px-2 bg-transparent border-transparent hover:border-border focus:border-border"
                  placeholder="Tool name"
                />
              ) : (
                <DialogTitle className="text-lg font-semibold truncate">
                  {name || 'Schema'}
                </DialogTitle>
              )}
              
              {editable && !editingName && onEditName && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onEditName}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
              
              {editingName && onResetName && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onResetName}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            <DialogDescription className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                {schema.type || 'unknown'}
              </Badge>
              {hasChanges && (
                <Badge variant="outline" className="font-mono text-xs border-blue-500/50 bg-blue-500/10 text-blue-500">
                  modified
                </Badge>
              )}
            </DialogDescription>
          </div>
        </div>
        
        {hasChanges && onResetAll && (
          <Button
            variant="outline"
            size="sm"
            className="ml-3 flex-shrink-0"
            onClick={onResetAll}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset All
          </Button>
        )}
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
