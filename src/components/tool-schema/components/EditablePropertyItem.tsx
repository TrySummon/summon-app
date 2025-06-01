import React from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, RotateCcw, EyeOff, Eye } from 'lucide-react';
import { cn } from '@/utils/tailwind';
import { PropertyEdit } from '../types';

interface EditablePropertyItemProps {
  propName: string;
  originalPropSchema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  propSchema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  edit: PropertyEdit;
  originalDescription: string;
  originalIsRequired: boolean;
  onEditChange: (propName: string, edit: PropertyEdit) => void;
  onReset: (propName: string) => void;
  onSave: (propName: string) => void;
}

export const EditablePropertyItem: React.FC<EditablePropertyItemProps> = ({
  propName,
  originalPropSchema,
  propSchema,
  edit,
  originalDescription,
  originalIsRequired,
  onEditChange,
  onReset,
  onSave,
}) => {
  const hasChanges = edit.name !== propName || 
                     edit.description !== originalDescription ||
                     edit.isRequired !== originalIsRequired ||
                     edit.isDisabled;

  const handleNameChange = (value: string) => {
    onEditChange(propName, { ...edit, name: value });
    setTimeout(() => onSave(propName), 500);
  };

  const handleDescriptionChange = (value: string) => {
    onEditChange(propName, { ...edit, description: value });
    setTimeout(() => onSave(propName), 1000);
  };

  const handleRequiredToggle = () => {
    onEditChange(propName, { ...edit, isRequired: !edit.isRequired });
    setTimeout(() => onSave(propName), 0);
  };

  const handleDisableToggle = () => {
    onEditChange(propName, { ...edit, isDisabled: !edit.isDisabled });
    setTimeout(() => onSave(propName), 0);
  };

  return (
    <div 
      className={cn(
        "py-4 border-b border-border last:border-b-0 transition-all",
        edit.isDisabled && "opacity-60"
      )}
    >
      {/* Property header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Input
            value={edit.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className={cn(
              "font-mono text-sm font-semibold h-7 px-2 bg-transparent border-transparent hover:border-border focus:border-border",
              edit.isDisabled && "text-muted-foreground line-through"
            )}
            disabled={edit.isDisabled}
          />
          
          {/* Type badge */}
          {'type' in propSchema && propSchema.type && (
            <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
              {propSchema.type}
            </Badge>
          )}
          
          {/* Required badge */}
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-6 px-2 text-xs font-mono transition-colors",
              edit.isRequired 
                ? "border-red-500/50 bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            )}
            onClick={handleRequiredToggle}
            disabled={edit.isDisabled}
          >
            {edit.isRequired ? 'required' : 'optional'}
          </Button>

          {/* Modified badge */}
          {hasChanges && !edit.isDisabled && (
            <Badge variant="outline" className="font-mono text-xs border-blue-500/50 bg-blue-500/10 text-blue-500">
              modified
            </Badge>
          )}

          {/* Disabled badge */}
          {edit.isDisabled && (
            <Badge variant="outline" className="font-mono text-xs border-orange-500/50 bg-orange-500/10 text-orange-500">
              disabled
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1 ml-2">
          {/* Reset button */}
          {hasChanges && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onReset(propName)}
              title="Reset changes"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          
          {/* Disable/Enable button - only for optional fields */}
          {!edit.isRequired && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleDisableToggle}
              title={edit.isDisabled ? "Enable field" : "Disable field"}
            >
              {edit.isDisabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>

      {/* Description field */}
      {!edit.isDisabled && (
        <div className="space-y-2">
          <Textarea
            value={edit.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Add a description for this property..."
            className="min-h-[60px] text-sm resize-none bg-muted/50 border-transparent hover:border-border focus:border-border"
            rows={2}
          />
        </div>
      )}

      {/* Show original description when disabled */}
      {edit.isDisabled && originalDescription && (
        <div className="mt-2">
          <p className="text-sm text-muted-foreground line-through">
            {originalDescription}
          </p>
        </div>
      )}
    </div>
  );
};
