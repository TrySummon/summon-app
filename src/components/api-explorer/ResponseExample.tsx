import React, { useState } from "react";
import { OpenAPIV3 } from "openapi-types";
import { CodeSnippet } from "../CodeSnippet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";

interface ResponseExampleProps {
  responses: OpenAPIV3.ResponsesObject;
}

interface Example {
  name: string;
  value: OpenAPIV3.ExampleObject;
  contentType: string;
}

export const ResponseExample: React.FC<ResponseExampleProps> = ({
  responses,
}) => {
  // Find the first successful response (e.g., 200, 201)
  const successStatusCode = Object.keys(responses).find((code) =>
    code.startsWith("2"),
  );
  const [examples, setExamples] = useState<Example[]>([]);
  const [activeTab, setActiveTab] = useState<string>("0");

  React.useEffect(() => {
    const extractedExamples: Example[] = [];

    if (successStatusCode) {
      const response = responses[successStatusCode];

      // Handle response content
      if ("content" in response && response.content) {
        // Process each content type (application/json, etc.)
        Object.entries(response.content).forEach(
          ([contentType, mediaTypeObject]) => {
            // Single example
            if (mediaTypeObject.example) {
              extractedExamples.push({
                name: "Example",
                value: mediaTypeObject.example,
                contentType,
              });
            }

            // Multiple examples
            if (mediaTypeObject.examples) {
              Object.entries(mediaTypeObject.examples).forEach(
                ([exampleName, exampleObj]) => {
                  let exampleValue;

                  if ("value" in exampleObj) {
                    exampleValue = exampleObj.value;
                  }

                  if (exampleValue) {
                    extractedExamples.push({
                      name: exampleName,
                      value: exampleValue,
                      contentType,
                    });
                  }
                },
              );
            }
          },
        );
      }
    }

    setExamples(extractedExamples);
    // If examples were found, set the first one as active
    if (extractedExamples.length > 0) {
      setActiveTab("0");
    }
  }, [responses, successStatusCode]);

  // Format the example based on content type
  const formatExample = (example: Example) => {
    if (example.contentType.includes("json")) {
      return JSON.stringify(example.value, null, 2);
    }
    return String(example.value);
  };

  // Determine the language for syntax highlighting
  const getLanguage = (contentType: string) => {
    if (contentType.includes("json")) return "json";
    if (contentType.includes("xml")) return "xml";
    if (contentType.includes("html")) return "html";
    return "text";
  };

  if (examples.length === 0) {
    return (
      <div className="flex w-full items-center justify-center">
        <p className="text-muted-foreground bg-accent rounded-lg p-4 text-sm">
          No example responses available.
        </p>
      </div>
    );
  }

  // Single example
  if (examples.length === 1) {
    const example = examples[0];
    return (
      <div className="h-full w-full">
        <CodeSnippet
          title={`Response Example: ${example.name}`}
          language={getLanguage(example.contentType)}
          maxHeight="50svh"
        >
          {formatExample(example)}
        </CodeSnippet>
      </div>
    );
  }

  // Multiple examples with tabs
  return (
    <div className="h-full w-full">
      <Tabs
        defaultValue="0"
        value={activeTab}
        onValueChange={setActiveTab}
        className="h-full"
      >
        <TabsList className="w-full">
          {examples.map((example, index) => (
            <TabsTrigger key={index} value={index.toString()}>
              {example.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {examples.map((example, index) => (
          <TabsContent key={index} value={index.toString()} className="h-full">
            <CodeSnippet
              title={`Response Example`}
              language={getLanguage(example.contentType)}
              maxHeight="50svh"
            >
              {formatExample(example)}
            </CodeSnippet>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
