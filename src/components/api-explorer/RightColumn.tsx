import React from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { ResponseExample } from './ResponseExample';

interface RightColumnProps {
  operation: OpenAPIV3.OperationObject;
}

export const RightColumn: React.FC<RightColumnProps> = ({ operation }) => {
  return (
    <div className="w-full">
      <ResponseExample responses={operation.responses} />
    </div>
  );
};