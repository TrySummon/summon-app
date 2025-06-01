import React from 'react';
import { EditableSchemaDialog } from './components/EditableSchemaDialog';
import { ReadOnlySchemaDialog } from './components/ReadOnlySchemaDialog';
import { SchemaDialogProps } from './types';

/**
 * SchemaDialog component that serves as the main entry point for displaying schema information.
 * It conditionally renders either an editable or read-only schema dialog based on the editable prop.
 */
export const SchemaDialog: React.FC<SchemaDialogProps> = ({
  open,
  onOpenChange,
  schema,
  modifiedSchema,
  name,
  editable = false,
  onChange,
}) => {
  // If editable, use the EditableSchemaDialog
  if (editable) {
    return (
      <EditableSchemaDialog
        open={open}
        onOpenChange={onOpenChange}
        schema={schema}
        modifiedSchema={modifiedSchema}
        name={name}
        editable={editable}
        onChange={onChange}
      />
    );
  }

  // Otherwise, use the read-only dialog
  return (
    <ReadOnlySchemaDialog
      open={open}
      onOpenChange={onOpenChange}
      schema={schema}
      name={name}
    />
  );
};
