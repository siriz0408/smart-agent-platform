import { Link } from "react-router-dom";
import { FileText, User, Home, Briefcase, FolderOpen } from "lucide-react";

interface UserMessageContentProps {
  content: string;
}

// Mention link component with icon for user messages
function MentionLink({ type, id, name }: { type: string; id: string; name: string }) {
  const getIcon = () => {
    switch (type) {
      case "doc":
        return <FileText className="h-3 w-3" />;
      case "contact":
        return <User className="h-3 w-3" />;
      case "property":
        return <Home className="h-3 w-3" />;
      case "deal":
        return <Briefcase className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
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
        return `/pipeline`;
      default:
        return "#";
    }
  };

  return (
    <Link
      to={getPath()}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
      title={`View: ${name}`}
      onClick={(e) => e.stopPropagation()}
    >
      {getIcon()}
      <span className="underline underline-offset-2">{name}</span>
    </Link>
  );
}

// Collection chip component for #Collection references
function CollectionChip({ collection }: { collection: string }) {
  const getIcon = () => {
    switch (collection.toLowerCase()) {
      case "properties":
        return <Home className="h-3 w-3" />;
      case "contacts":
        return <User className="h-3 w-3" />;
      case "deals":
        return <Briefcase className="h-3 w-3" />;
      case "documents":
        return <FileText className="h-3 w-3" />;
      default:
        return <FolderOpen className="h-3 w-3" />;
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

  // Normalize collection name (e.g., "properties" -> "Properties")
  const displayName = collection.charAt(0).toUpperCase() + collection.slice(1).toLowerCase();

  return (
    <Link
      to={getPath()}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/30 hover:bg-orange-500/50 rounded text-sm font-medium transition-colors"
      title={`Browse all ${displayName}`}
      onClick={(e) => e.stopPropagation()}
    >
      {getIcon()}
      <span className="underline underline-offset-2">{displayName}</span>
    </Link>
  );
}

// Parse content and render with mention links and collection chips
export function UserMessageContent({ content }: UserMessageContentProps) {
  // Combined regex to match both @ mentions and # collections
  const combinedRegex = /(@(doc|contact|property|deal):([a-f0-9-]+)\[([^\]]+)\])|(#(Properties|Contacts|Deals|Documents))/gi;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = combinedRegex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    
    if (match[1]) {
      // This is an @ mention: @type:uuid[name]
      const [, , type, id, name] = match;
      parts.push(
        <MentionLink key={`mention-${keyIndex++}`} type={type} id={id} name={name} />
      );
    } else if (match[5]) {
      // This is a # collection: #Collection
      const collection = match[6];
      parts.push(
        <CollectionChip key={`collection-${keyIndex++}`} collection={collection} />
      );
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add any remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return (
    <p className="whitespace-pre-wrap text-sm">
      {parts}
    </p>
  );
}
