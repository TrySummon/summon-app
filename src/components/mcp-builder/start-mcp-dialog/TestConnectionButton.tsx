import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface TestConnectionButtonProps {
  form: UseFormReturn<any>;
  apiId: string;
}

export function TestConnectionButton({ form, apiId }: TestConnectionButtonProps) {
  const [testStatus, setTestStatus] = useState<{ 
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  // Get the server URL and auth data from the form
  const serverUrl = form.watch(`apiAuth.${apiId}.serverUrl`);
  const auth = form.watch(`apiAuth.${apiId}.auth`);
  const authType = auth?.type;
  const useMockData = form.watch(`apiAuth.${apiId}.useMockData`);
  
  // Button should be enabled if URL is provided and we're not in loading state
  // Trim the URL to ensure empty strings with whitespace don't enable the button
  const isButtonDisabled = !serverUrl?.trim() || testStatus.status === 'loading';

  const testConnection = async () => {
    try {
      setTestStatus({ status: 'loading' });
      
      // Check if server URL is provided
      if (!serverUrl) {
        setTestStatus({ 
          status: 'error', 
          message: 'Please select a server URL to test against' 
        });
        return;
      }
      
      // Skip test if using mock data
      if (useMockData) {
        setTestStatus({ 
          status: 'success', 
          message: 'Using mock data, no connection test needed' 
        });
        return;
      }
      
      // Get the auth data based on the auth type
      let authData = null;
      const authValue = form.getValues(`apiAuth.${apiId}.auth`);
      
      if (authType === 'bearerToken') {
        authData = {
          token: authValue.token
        };
      } else if (authType === 'apiKey') {
        authData = {
          key: authValue.key,
          in: authValue.in,
          name: authValue.name
        };
      }
      
      // Use the IPC API to test credentials - this avoids CORS issues
      const result = await window.auth.testCredentials(serverUrl, authType, authData);
      
      if (result.success) {
        setTestStatus({ 
          status: 'success', 
          message: `Connection successful (${result.message})` 
        });
      } else {
        setTestStatus({ 
          status: 'error', 
          message: `Connection failed (${result.message})` 
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestStatus({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={testConnection}
          disabled={isButtonDisabled}
          size="sm"
          className="flex-shrink-0"
        >
          {testStatus.status === 'loading' ? (
            <>
              <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              Testing
            </>
          ) : 'Test Connection'}
        </Button>
        
        {/* Inline status message */}
        {testStatus.status !== 'idle' && (
          <span className={`text-xs flex items-center ${testStatus.status === 'success' ? 'text-green-600' : 
                            testStatus.status === 'error' ? 'text-red-600' : 
                            'text-blue-600'}`}>
            {testStatus.status === 'success' && (
              <CheckCircle2 className="mr-1 h-3 w-3 text-green-500" />
            )}
            {testStatus.status === 'error' && (
              <AlertCircle className="mr-1 h-3 w-3 text-red-500" />
            )}
            {testStatus.message || (testStatus.status === 'loading' ? 'Testing connection...' : '')}
          </span>
        )}
      </div>
    </div>
  );
}
