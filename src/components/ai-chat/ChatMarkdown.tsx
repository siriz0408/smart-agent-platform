import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { FileText, User, Home, Briefcase, FolderOpen } from "lucide-react";

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

// Convert mention and collection patterns to clickable links with icons
function processMentions(content: string): string {
  // Match @type:uuid[name] pattern and convert to markdown link with custom protocol
  const mentionRegex = /@(doc|contact|property|deal):([a-f0-9-]+)\[([^\]]+)\]/g;
  
  let result = content.replace(mentionRegex, (_match, type, id, name) => {
    // Create a special link format that we'll intercept in the link component
    return `[mention:${type}:${id}:${name}](mention://${type}/${id})`;
  });
  
  // Match #Collection pattern and convert to markdown link with custom protocol
  const collectionRegex = /#(Properties|Contacts|Deals|Documents)/gi;
  
  result = result.replace(collectionRegex, (_match, collection) => {
    // Normalize collection name
    const normalizedCollection = collection.charAt(0).toUpperCase() + collection.slice(1).toLowerCase();
    return `[collection:${normalizedCollection}](collection://${normalizedCollection.toLowerCase()})`;
  });
  
  return result;
}

// Mention link component with icon
function MentionLink({ type, id, name }: { type: string; id: string; name: string }) {
  const getIcon = () => {
    switch (type) {
      case "doc":
        return <FileText className="h-3.5 w-3.5" />;
      case "contact":
        return <User className="h-3.5 w-3.5" />;
      case "property":
        return <Home className="h-3.5 w-3.5" />;
      case "deal":
        return <Briefcase className="h-3.5 w-3.5" />;
      default:
        return <FileText className="h-3.5 w-3.5" />;
    }
  };

  const getPath = () => {
    switch (type) {
      case "doc":
        return `/documents/${id}`;
      case "contact":
        return `/contacts/${id}`;
      case "property":
        return `/properties/${id}`;
      case "deal":
        return `/pipeline`;  // Deals don't have individual pages, go to pipeline
      default:
        return "#";
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case "doc":
        return "Document";
      case "contact":
        return "Contact";
      case "property":
        return "Property";
      case "deal":
        return "Deal";
      default:
        return "Item";
    }
  };

  return (
    <Link
      to={getPath()}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-sm font-medium transition-colors"
      title={`View ${getTypeLabel()}: ${name}`}
    >
      {getIcon()}
      <span>{name}</span>
    </Link>
  );
}

// Collection link component with icon
function CollectionLink({ collection }: { collection: string }) {
  const getIcon = () => {
    switch (collection.toLowerCase()) {
      case "properties":
        return <Home className="h-3.5 w-3.5" />;
      case "contacts":
        return <User className="h-3.5 w-3.5" />;
      case "deals":
        return <Briefcase className="h-3.5 w-3.5" />;
      case "documents":
        return <FileText className="h-3.5 w-3.5" />;
      default:
        return <FolderOpen className="h-3.5 w-3.5" />;
    }
  };

  const getPath = () => {
    switch (collection.toLowerCase()) {
      case "properties":
        return `/properties`;
      case "contacts":
        return `/contacts`;
      case "deals":
        return `/pipeline`;
      case "documents":
        return `/documents`;
      default:
        return "#";
    }
  };

  // Normalize collection name for display
  const displayName = collection.charAt(0).toUpperCase() + collection.slice(1).toLowerCase();

  return (
    <Link
      to={getPath()}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/40 dark:hover:bg-orange-900/60 dark:text-orange-300 rounded-md text-sm font-medium transition-colors"
      title={`Browse all ${displayName}`}
    >
      {getIcon()}
      <span>{displayName}</span>
    </Link>
  );
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

  // Styled links with primary color - intercept mention and collection links
  a: ({ href, children }) => {
    // Check if this is a mention link
    if (href?.startsWith("mention://")) {
      const [, type, id] = href.replace("mention://", "").split("/");
      // Extract name from children (format: "mention:type:id:name")
      const childText = typeof children === "string" ? children : 
        Array.isArray(children) ? children.join("") : "";
      const nameMatch = childText.match(/^mention:[^:]+:[^:]+:(.+)$/);
      const name = nameMatch ? nameMatch[1] : childText;
      return <MentionLink type={type} id={id} name={name} />;
    }
    
    // Check if this is a collection link
    if (href?.startsWith("collection://")) {
      const collection = href.replace("collection://", "");
      return <CollectionLink collection={collection} />;
    }
    
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary font-medium underline underline-offset-2 hover:text-primary/80 transition-colors"
      >
        {children}
      </a>
    );
  },

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
  // Pre-process content to convert mentions to special markdown links
  const processedContent = processMentions(content);
  
  return (
    <div className={cn("prose-ai", className)}>
      <ReactMarkdown components={markdownComponents}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
