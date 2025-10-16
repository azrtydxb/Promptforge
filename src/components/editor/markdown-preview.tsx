"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { ComponentErrorBoundary } from "@/components/error-boundary";
import { MinimalErrorFallback } from "@/components/error-boundary/error-fallbacks";
import "@/styles/highlight.css";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

const MarkdownPreviewComponent = ({ content, className = "" }: MarkdownPreviewProps) => {
  return (
    <div className={`markdown-preview prose prose-invert max-w-none p-6 text-foreground ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom components for better styling
          h1: ({ children }) => <h1 className="text-3xl font-bold mb-4 text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="text-2xl font-semibold mb-3 text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xl font-medium mb-2 text-foreground">{children}</h3>,
          p: ({ children }) => <p className="mb-4 text-muted-foreground leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-4 text-muted-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-4 text-muted-foreground">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-muted-foreground pl-4 italic my-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;

            if (isInline) {
              return <code className="bg-muted px-1.5 py-0.5 rounded text-sm text-muted-foreground" {...props}>{children}</code>;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto mb-4 border">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-border">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-sm font-medium text-foreground">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm text-muted-foreground whitespace-nowrap">{children}</td>
          ),
          a: ({ href, children }) => (
            <a href={href} className="text-primary hover:text-primary/80 underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          hr: () => <hr className="my-8 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const MarkdownPreview = (props: MarkdownPreviewProps) => (
  <ComponentErrorBoundary
    fallback={<MinimalErrorFallback />}
    resetKeys={[props.content]}
  >
    <MarkdownPreviewComponent {...props} />
  </ComponentErrorBoundary>
);