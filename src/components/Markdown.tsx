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
}

const Markdown = ({ className, children }: Props) => {
  const remarkPlugins = useMemo(() => {
    const remarkPlugins = [remarkGfm as any];
    return remarkPlugins;
  }, []);

  return (
    <div className={cn("prose", className)}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={{
          code(props) {
            return (
              <code
                {...omit(props, ["node"])}
                className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
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
                className="mt-6 border-l-2 pl-6 italic"
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
                className="my-3 ml-3 list-disc pl-2 [&>li]:mt-1"
              />
            );
          },
          ol(props) {
            return (
              <ol
                {...omit(props, ["node"])}
                className="my-3 ml-3 list-decimal pl-2 [&>li]:mt-1"
              />
            );
          },
          h1(props) {
            return (
              <h1
                {...omit(props, ["node"])}
                className="mt-8 scroll-m-20 text-2xl font-extrabold tracking-tight first:mt-0"
              />
            );
          },
          h2(props) {
            return (
              <h2
                {...omit(props, ["node"])}
                className="mt-8 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight first:mt-0"
              />
            );
          },
          h3(props) {
            return (
              <h3
                {...omit(props, ["node"])}
                className="mt-6 scroll-m-20 text-lg font-semibold tracking-tight first:mt-0"
              />
            );
          },
          h4(props) {
            return (
              <h4
                {...omit(props, ["node"])}
                className="mt-6 scroll-m-20 text-base font-semibold tracking-tight first:mt-0"
              />
            );
          },
          p(props) {
            return (
              <div
                {...omit(props, ["node"])}
                className="text-sm leading-7 break-words whitespace-pre-wrap [&:not(:first-child)]:mt-4"
                role="article"
              />
            );
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
