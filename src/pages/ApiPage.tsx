import React, { useState } from "react";
import { useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useApis } from "@/hooks/useApis";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Link } from "@tanstack/react-router";
import { Server } from "lucide-react";
import { SubNav } from "@/components/SubNav";
import { Markdown } from "@/components/Markdown";
import { ServerInformation } from "@/components/ServerInformation";
import { NotFound } from "@/components/ui/NotFound";

// Define the search params interface
interface ApiPageSearchParams {
  tab?: string;
}

export default function ApiPage() {
  const { apiId } = useParams({ from: "/api/$apiId" });
  const navigate = useNavigate();
  const search = useSearch({ from: "/api/$apiId" }) as ApiPageSearchParams;
  const { apis } = useApis();
  const [activeTab, setActiveTab] = useState<string>(search.tab || "overview");

  const api = apis.find((a) => a.id === apiId);

  if (!api) {
    return (
      <NotFound
        title="API Not Found"
        message="The API you're looking for doesn't exist or has been removed."
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "API Not Found", isActive: true },
        ]}
      />
    );
  }

  // Handle tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Use the to parameter with search params to avoid type errors
    navigate({
      to: `/api/${apiId}`,
      replace: true,
    });
  };

  return (
    <div className="flex h-full flex-col">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/api/$apiId" params={{ apiId: api.id }}>
                <BreadcrumbPage>
                  <Server className="mr-2 size-3" /> {api.api.info.title}
                </BreadcrumbPage>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-shrink-0 p-3">
        <SubNav
          items={[
            { name: "Overview", href: `/api/${api.id}`, value: "overview" },
          ]}
          value={activeTab}
          onValueChange={handleTabChange}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">
        {activeTab === "overview" && (
          <div className="mx-auto w-full max-w-4xl p-10">
            {/* Server Information Section */}
            <ServerInformation servers={api.api.servers || []} />

            {/* API Description */}
            <Markdown>
              {api.api.info.description || "* No description provided *"}
            </Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
