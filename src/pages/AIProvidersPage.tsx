import React from 'react';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbList, 
  BreadcrumbPage,
  BreadcrumbSeparator, 
} from "@/components/ui/breadcrumb";
import AIProvidersTable from '@/components/ai-providers';
import { Settings } from 'lucide-react';

const AIProvidersPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
            <Breadcrumb className="flex-shrink-0">
          <BreadcrumbList>
            <BreadcrumbItem>
                <BreadcrumbPage>
                  <Settings className="size-3 mr-2" /> Settings
                </BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>AI Providers</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

    <div className="flex flex-col overflow-y-auto flex-1">
    <div className="container py-6 max-w-4xl mx-auto">
      <AIProvidersTable />
    </div>
    </div>
    </div>
  );
};

export default AIProvidersPage;
