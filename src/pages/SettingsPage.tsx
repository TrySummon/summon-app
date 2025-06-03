import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import AIProvidersTable from "@/components/ai-providers";
import GeneralSettings from "@/components/general-settings";
import { Settings } from "lucide-react";

const SettingsPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col">
      <Breadcrumb className="flex-shrink-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>
              <Settings className="mr-2 size-3" /> Settings
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="container mx-auto max-w-4xl space-y-8 py-6">
          <GeneralSettings />
          <AIProvidersTable />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
