/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/utils/tailwind";
import { MarkdownCodeSnippet } from "./CodeSnippet";
import { MentionData } from "./CodeEditor";

function omit<T extends object, K extends string>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj } as any;
  keys.forEach((key) => delete result[key]);
  return result;
}

interface Props {
  children: string;
  className?: string;
  textSize?: "sm" | "base";
  mentionData?: MentionData[];
}

const Markdown = ({
  className,
  children,
  textSize = "sm",
  mentionData,
}: Props) => {
  const remarkPlugins = useMemo(() => {
    const remarkPlugins = [remarkGfm as any];
    return remarkPlugins;
  }, []);

  // Create harmonized text size classes for different elements
  const sizeClasses = useMemo(() => {
    if (textSize === "base") {
      return {
        h1: "text-3xl",
        h2: "text-2xl",
        h3: "text-xl",
        h4: "text-lg",
        p: "text-base",
        code: "text-base",
        blockquote: "text-base",
        list: "text-base",
      };
    } else {
      return {
        h1: "text-xl",
        h2: "text-lg",
        h3: "text-base",
        h4: "text-sm",
        p: "text-sm",
        code: "text-sm",
        blockquote: "text-sm",
        list: "text-sm",
      };
    }
  }, [textSize]);

  // Create mention regex from mention data
  const mentionRegex = useMemo(() => {
    if (!mentionData || mentionData.length === 0) return null;

    const mentionPatterns = mentionData
      .map((item) => {
        const escapedName = item.name.replace(/[-/^$*+?.()|[\]{}]/g, "\\$&");
        return `@(${item.type}:${escapedName}|${escapedName})`;
      })
      .sort((a, b) => b.length - a.length);

    return new RegExp(`${mentionPatterns.join("|")}`, "g");
  }, [mentionData]);

  // Function to render text with inline mentions
  const renderTextWithMentions = (text: string) => {
    // Early return if no mention data or regex
    if (!mentionData || !mentionRegex || !text) {
      return text;
    }

    const parts = [];
    let lastIndex = 0;
    let match;

    // Reset regex to start from beginning
    mentionRegex.lastIndex = 0;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add the mention with inline styling (matching CodeMirror editor style)
      parts.push(
        <span
          key={`${match[0]}-${match.index}`}
          className="bg-muted text-primary rounded-sm px-0.5 font-semibold"
        >
          {match[0]}
        </span>,
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 1 ? parts : text;
  };

  return (
    <div className={cn("prose", className)}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={{
          code(props) {
            return (
              <code
                {...omit(props, ["node"])}
                className={`bg-sidebar-accent relative rounded px-[0.2rem] py-[0.1rem] font-mono ${sizeClasses.code} font-semibold`}
              />
            );
          },
          a(props) {
            return (
              <a
                {...omit(props, ["node"])}
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              />
            );
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          pre({ children, ...props }: any) {
            return <MarkdownCodeSnippet {...props} />;
          },
          img: (image: any) => {
            return (
              <div className="sm:max-w-sm md:max-w-md">
                <AspectRatio
                  ratio={16 / 9}
                  className="bg-muted overflow-hidden rounded-md"
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="h-full w-full object-contain"
                  />
                </AspectRatio>
              </div>
            );
          },
          blockquote(props) {
            return (
              <blockquote
                {...omit(props, ["node"])}
                className={`mt-6 border-l-2 pl-6 italic ${sizeClasses.blockquote}`}
              />
            );
          },
          em(props) {
            return <span {...omit(props, ["node"])} className="italic" />;
          },
          strong(props) {
            return <span {...omit(props, ["node"])} className="font-bold" />;
          },
          hr() {
            return <Separator />;
          },
          ul(props) {
            return (
              <ul
                {...omit(props, ["node"])}
                className={`my-3 ml-3 list-disc pl-2 [&>li]:mt-1 ${sizeClasses.list}`}
              />
            );
          },
          ol(props) {
            return (
              <ol
                {...omit(props, ["node"])}
                className={`my-3 ml-3 list-decimal pl-2 [&>li]:mt-1 ${sizeClasses.list}`}
              />
            );
          },
          h1(props) {
            return (
              <h1
                {...omit(props, ["node"])}
                className={`mt-8 scroll-m-20 font-extrabold tracking-tight first:mt-0 ${sizeClasses.h1}`}
              />
            );
          },
          h2(props) {
            return (
              <h2
                {...omit(props, ["node"])}
                className={`mt-8 scroll-m-20 border-b pb-2 font-semibold tracking-tight first:mt-0 ${sizeClasses.h2}`}
              />
            );
          },
          h3(props) {
            return (
              <h3
                {...omit(props, ["node"])}
                className={`mt-6 scroll-m-20 font-semibold tracking-tight first:mt-0 ${sizeClasses.h3}`}
              />
            );
          },
          h4(props) {
            return (
              <h4
                {...omit(props, ["node"])}
                className={`mt-6 scroll-m-20 font-semibold tracking-tight first:mt-0 ${sizeClasses.h4}`}
              />
            );
          },
          p(props) {
            // Handle mentions in paragraph text
            const processedChildren = React.Children.map(
              props.children,
              (child) => {
                if (typeof child === "string") {
                  return renderTextWithMentions(child);
                }
                return child;
              },
            );

            return (
              <div
                {...omit(props, ["node"])}
                className={`${sizeClasses.p} leading-7 break-words whitespace-pre-wrap [&:not(:first-child)]:mt-4`}
                role="article"
              >
                {processedChildren}
              </div>
            );
          },
          // Add text renderer to handle inline mentions
          text(props) {
            if (typeof props.children === "string") {
              return renderTextWithMentions(props.children);
            }
            return props.children;
          },
          table({ children, ...props }) {
            return (
              <Card className="[&:not(:first-child)]:mt-2 [&:not(:last-child)]:mb-2">
                <Table {...(props as any)}>{children}</Table>
              </Card>
            );
          },
          thead({ children, ...props }) {
            return <TableHeader {...(props as any)}>{children}</TableHeader>;
          },
          tr({ children, ...props }) {
            return <TableRow {...(props as any)}>{children}</TableRow>;
          },
          th({ children, ...props }) {
            return <TableHead {...(props as any)}>{children}</TableHead>;
          },
          td({ children, ...props }) {
            return <TableCell {...(props as any)}>{children}</TableCell>;
          },
          tbody({ children, ...props }) {
            return <TableBody {...(props as any)}>{children}</TableBody>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export { Markdown };
