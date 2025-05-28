import React from 'react';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbList, 
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import AIProvidersTable from '@/components/ai-providers';
import GeneralSettings from '@/components/general-settings';
import { Settings } from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
            <Breadcrumb className="flex-shrink-0">
          <BreadcrumbList>
            <BreadcrumbItem>
                <BreadcrumbPage>
                  <Settings className="size-3 mr-2" /> Settings
                </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

    <div className="flex flex-col overflow-y-auto flex-1">
    <div className="container py-6 max-w-4xl mx-auto space-y-8">
      <GeneralSettings />
      <AIProvidersTable />
    </div>
    </div>
    </div>
  );
};

export default SettingsPage;
