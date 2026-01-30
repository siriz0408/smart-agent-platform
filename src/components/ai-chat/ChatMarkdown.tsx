import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

// Custom component overrides for enhanced formatting
const markdownComponents: Components = {
  // Headings with proper sizing and spacing
  h1: ({ children }) => (
    <h1 className="text-xl font-bold mt-6 mb-3 first:mt-0 text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold mt-5 mb-2 first:mt-0 text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold mt-4 mb-2 first:mt-0 text-foreground">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold mt-3 mb-1 first:mt-0 text-foreground">
      {children}
    </h4>
  ),

  // Paragraphs with better spacing
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 leading-relaxed text-foreground/90">
      {children}
    </p>
  ),

  // Styled links with primary color
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary font-medium underline underline-offset-2 hover:text-primary/80 transition-colors"
    >
      {children}
    </a>
  ),

  // Strong/bold text
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),

  // Italic/emphasis text
  em: ({ children }) => (
    <em className="italic text-foreground/90">{children}</em>
  ),

  // Horizontal rule as section divider
  hr: () => (
    <hr className="my-4 border-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
  ),

  // Blockquote with accent styling
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/40 bg-accent/30 pl-4 py-2 my-3 italic text-foreground/80 rounded-r-md">
      {children}
    </blockquote>
  ),

  // Unordered list
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-5 mb-3 space-y-1.5 marker:text-primary">
      {children}
    </ul>
  ),

  // Ordered list
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-5 mb-3 space-y-1.5 marker:text-primary marker:font-medium">
      {children}
    </ol>
  ),

  // List items
  li: ({ children }) => (
    <li className="leading-relaxed text-foreground/90 pl-1">{children}</li>
  ),

  // Inline code
  code: ({ className, children }) => {
    const isCodeBlock = className?.includes("language-");
    if (isCodeBlock) {
      return (
        <code className={cn("text-sm", className)}>
          {children}
        </code>
      );
    }
    return (
      <code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono text-foreground/90">
        {children}
      </code>
    );
  },

  // Code blocks
  pre: ({ children }) => (
    <pre className="bg-muted/70 border border-border rounded-lg p-4 overflow-x-auto my-3 text-sm">
      {children}
    </pre>
  ),

  // Tables
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full border border-border rounded-lg overflow-hidden">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/50">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 text-sm text-foreground/90">{children}</td>
  ),
};

export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  return (
    <div className={cn("prose-ai", className)}>
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
