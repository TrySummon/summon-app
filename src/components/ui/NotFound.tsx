import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

interface NotFoundProps {
  title?: string;
  message?: string;
  breadcrumbs?: Array<{
    label: string;
    to?: string;
    params?: Record<string, string>;
    isActive?: boolean;
  }>;
  className?: string;
}

export function NotFound({
  title = "Not Found",
  message = "The resource you're looking for doesn't exist or has been removed.",
  breadcrumbs = [
    { label: "Home", to: "/" },
    { label: "Not Found", isActive: true },
  ],
  className,
}: NotFoundProps) {
  return (
    <div className={className}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {crumb.isActive ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : crumb.to ? (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to} params={crumb.params || {}}>
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Not Found Card */}
      <Card className="border-destructive/20 mx-auto mt-8 max-w-md">
        <CardHeader className="flex items-center justify-center pb-2">
          <AlertCircle className="text-destructive h-6 w-6" />
          <h1 className="text-destructive text-xl font-bold">{title}</h1>
        </CardHeader>
        <CardContent className="text-muted-foreground text-center">
          <p>{message}</p>
        </CardContent>
        <CardFooter className="flex justify-center pb-6">
          <Button variant="outline" asChild>
            <Link to="/">Return to Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
