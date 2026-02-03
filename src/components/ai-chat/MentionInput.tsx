import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { useMentionSearch, formatMention, formatCollection, getAvailableCollections, type Mention, type MentionType, type CollectionType } from "@/hooks/useMentionSearch";
import { cn } from "@/lib/utils";
import { FileText, User, Home, Briefcase, FolderOpen } from "lucide-react";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentions: Mention[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onSubmit?: () => void;
}

// Trigger type for autocomplete
type TriggerType = "@" | "#";

// Icon map for mention chips
const iconMap: Record<MentionType, React.ReactNode> = {
  doc: <FileText className="h-3 w-3 inline" />,
  contact: <User className="h-3 w-3 inline" />,
  property: <Home className="h-3 w-3 inline" />,
  deal: <Briefcase className="h-3 w-3 inline" />,
};

const colorMap: Record<MentionType, string> = {
  doc: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  contact: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  property: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  deal: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
};

// Collection colors (orange/yellow to distinguish from individual mentions)
const collectionColorMap: Record<CollectionType, string> = {
  Properties: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  Contacts: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  Deals: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  Documents: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
};

// Extract mentions from value string
function extractMentions(value: string): Array<{ type: MentionType; id: string; name: string }> {
  if (!value.includes("@")) return [];
  const mentionRegex = /@(doc|contact|property|deal):([a-f0-9-]+)\[([^\]]+)\]/g;
  const mentions: Array<{ type: MentionType; id: string; name: string }> = [];
  let match;
  while ((match = mentionRegex.exec(value)) !== null) {
    mentions.push({ type: match[1] as MentionType, id: match[2], name: match[3] });
  }
  return mentions;
}

// Extract collection references from value string
function extractCollections(value: string): CollectionType[] {
  if (!value.includes("#")) return [];
  const collectionRegex = /#(Properties|Contacts|Deals|Documents)/gi;
  const collections: CollectionType[] = [];
  const seen = new Set<string>();
  let match;
  while ((match = collectionRegex.exec(value)) !== null) {
    const collection = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() as CollectionType;
    if (!seen.has(collection)) {
      seen.add(collection);
      collections.push(collection);
    }
  }
  return collections;
}

export function MentionInput({
  value,
  onChange,
  onMentionsChange,
  placeholder = "Type @ to mention documents, contacts, or properties...",
  className,
  disabled,
  onSubmit,
}: MentionInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { search, clear, results, isSearching } = useMentionSearch();

  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [currentTrigger, setCurrentTrigger] = useState<TriggerType | null>(null);
  const [collectionQuery, setCollectionQuery] = useState("");

  // Memoize extracted mentions
  const mentions = useMemo(() => extractMentions(value), [value]);
  
  // Memoize extracted collections
  const collections = useMemo(() => extractCollections(value), [value]);

  // Get filtered collection results based on query
  const filteredCollections = useMemo(() => {
    const available = getAvailableCollections();
    if (!collectionQuery) return available;
    return available.filter(c => 
      c.collection.toLowerCase().includes(collectionQuery) ||
      c.name.toLowerCase().includes(collectionQuery)
    );
  }, [collectionQuery]);

  // Notify parent of mention changes
  useEffect(() => {
    onMentionsChange?.(mentions);
  }, [mentions, onMentionsChange]);

  // Convert value to HTML with styled mention and collection chips
  const getDisplayHTML = useCallback((text: string): string => {
    if (!text) return '';
    
    const hasAt = text.includes('@');
    const hasHash = text.includes('#');
    
    if (!hasAt && !hasHash) return escapeHtml(text);
    
    // Combined regex to match both @ mentions and # collections
    const combinedRegex = /(@(doc|contact|property|deal):([a-f0-9-]+)\[([^\]]+)\])|(#(Properties|Contacts|Deals|Documents))/gi;
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(text)) !== null) {
      // Add escaped text before the match
      result += escapeHtml(text.slice(lastIndex, match.index));
      
      if (match[1]) {
        // This is an @ mention
        const type = match[2] as MentionType;
        const name = match[4];
        const color = colorMap[type];
        result += `<span class="mention-chip ${color} inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium mx-0.5" contenteditable="false" data-mention="${match[1]}">${getIconSvg(type)}${escapeHtml(name)}</span>`;
      } else if (match[5]) {
        // This is a # collection
        const collection = match[6].charAt(0).toUpperCase() + match[6].slice(1).toLowerCase() as CollectionType;
        const color = collectionColorMap[collection];
        result += `<span class="collection-chip ${color} inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium mx-0.5" contenteditable="false" data-collection="${match[5]}">${getCollectionIconSvg(collection)}${escapeHtml(collection)}</span>`;
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    result += escapeHtml(text.slice(lastIndex));
    return result;
  }, []);

  // Sync editor content with value (only when value changes externally)
  useEffect(() => {
    if (!editorRef.current) return;
    const currentText = getTextFromEditor();
    if (currentText !== value) {
      editorRef.current.innerHTML = getDisplayHTML(value) || `<span class="text-muted-foreground">${placeholder}</span>`;
    }
  }, [value, getDisplayHTML, placeholder]);

  // Get plain text from editor
  const getTextFromEditor = useCallback((): string => {
    if (!editorRef.current) return '';
    
    let text = '';
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.dataset.mention) {
          text += el.dataset.mention;
        } else if (el.dataset.collection) {
          text += el.dataset.collection;
        } else if (el.classList.contains('text-muted-foreground')) {
          // Skip placeholder
        } else {
          el.childNodes.forEach(walk);
        }
      }
    };
    editorRef.current.childNodes.forEach(walk);
    return text;
  }, []);

  // Get cursor position in plain text
  const getCursorPosition = useCallback((): number => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) return 0;
    
    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editorRef.current);
    preRange.setEnd(range.startContainer, range.startOffset);
    
    // Count characters, treating mention and collection chips as their full text
    let pos = 0;
    const walk = (node: Node): boolean => {
      if (node === range.startContainer) {
        if (node.nodeType === Node.TEXT_NODE) {
          pos += range.startOffset;
        }
        return true;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        pos += node.textContent?.length || 0;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.dataset.mention) {
          pos += el.dataset.mention.length;
        } else if (el.dataset.collection) {
          pos += el.dataset.collection.length;
        } else if (!el.classList.contains('text-muted-foreground')) {
          for (const child of Array.from(el.childNodes)) {
            if (walk(child)) return true;
          }
        }
      }
      return false;
    };
    
    for (const child of Array.from(editorRef.current.childNodes)) {
      if (walk(child)) break;
    }
    
    return pos;
  }, []);

  // Handle input
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    
    const newText = getTextFromEditor();
    const cursorPos = getCursorPosition();
    
    // Clear placeholder styling if typing
    if (newText && editorRef.current.querySelector('.text-muted-foreground')) {
      editorRef.current.innerHTML = getDisplayHTML(newText);
      // Restore cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    
    onChange(newText);
    
    // Detect @ mentions or # collections
    let start = cursorPos - 1;
    while (start >= 0 && newText[start] !== "@" && newText[start] !== "#" && newText[start] !== " " && newText[start] !== "\n") {
      start--;
    }

    // Handle @ mentions
    if (start >= 0 && newText[start] === "@") {
      const query = newText.slice(start + 1, cursorPos);
      
      // Skip if inside completed mention
      if (query.includes("[") && query.includes("]")) {
        setShowAutocomplete(false);
        setMentionStart(null);
        setCurrentTrigger(null);
        clear();
        return;
      }

      const filterMatch = query.match(/^(doc|contact|property|deal):/);
      if (filterMatch) {
        search(query.slice(filterMatch[0].length), filterMatch[1] as MentionType);
      } else {
        search(query);
      }

      setMentionStart(start);
      setCurrentTrigger("@");
      setShowAutocomplete(true);
      setActiveIndex(0);
    }
    // Handle # collections
    else if (start >= 0 && newText[start] === "#") {
      const query = newText.slice(start + 1, cursorPos);
      
      // Check if it's already a completed collection (like #Properties)
      const completedMatch = query.match(/^(Properties|Contacts|Deals|Documents)$/i);
      if (completedMatch) {
        setShowAutocomplete(false);
        setMentionStart(null);
        setCurrentTrigger(null);
        setCollectionQuery("");
        return;
      }
      
      setCollectionQuery(query.toLowerCase());
      setMentionStart(start);
      setCurrentTrigger("#");
      setShowAutocomplete(true);
      setActiveIndex(0);
    }
    else {
      setShowAutocomplete(false);
      setMentionStart(null);
      setCurrentTrigger(null);
      setCollectionQuery("");
      clear();
    }
  }, [onChange, getTextFromEditor, getCursorPosition, getDisplayHTML, search, clear]);

  // Select a mention from autocomplete
  const selectMention = useCallback((mention: Mention) => {
    if (mentionStart === null || !editorRef.current) return;

    const currentText = getTextFromEditor();
    const cursorPos = getCursorPosition();
    
    const before = currentText.slice(0, mentionStart);
    const after = currentText.slice(cursorPos);
    const mentionText = formatMention(mention);
    const newValue = `${before}${mentionText} ${after}`;

    onChange(newValue);
    setShowAutocomplete(false);
    setMentionStart(null);
    setCurrentTrigger(null);
    clear();

    // Update display and set cursor
    setTimeout(() => {
      if (!editorRef.current) return;
      editorRef.current.innerHTML = getDisplayHTML(newValue);
      editorRef.current.focus();
      
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }, 0);
  }, [mentionStart, onChange, getTextFromEditor, getCursorPosition, getDisplayHTML, clear]);

  // Select a collection from autocomplete
  const selectCollection = useCallback((collection: CollectionType) => {
    if (mentionStart === null || !editorRef.current) return;

    const currentText = getTextFromEditor();
    const cursorPos = getCursorPosition();
    
    const before = currentText.slice(0, mentionStart);
    const after = currentText.slice(cursorPos);
    const collectionText = formatCollection(collection);
    const newValue = `${before}${collectionText} ${after}`;

    onChange(newValue);
    setShowAutocomplete(false);
    setMentionStart(null);
    setCurrentTrigger(null);
    setCollectionQuery("");

    // Update display and set cursor
    setTimeout(() => {
      if (!editorRef.current) return;
      editorRef.current.innerHTML = getDisplayHTML(newValue);
      editorRef.current.focus();
      
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }, 0);
  }, [mentionStart, onChange, getTextFromEditor, getCursorPosition, getDisplayHTML]);

  // Handle keydown
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle @ mention autocomplete
    if (showAutocomplete && currentTrigger === "@" && results.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % results.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
          break;
        case "Enter":
          e.preventDefault();
          selectMention(results[activeIndex]);
          break;
        case "Escape":
          e.preventDefault();
          setShowAutocomplete(false);
          setCurrentTrigger(null);
          clear();
          break;
        case "Tab":
          e.preventDefault();
          selectMention(results[activeIndex]);
          break;
      }
    }
    // Handle # collection autocomplete
    else if (showAutocomplete && currentTrigger === "#" && filteredCollections.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % filteredCollections.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + filteredCollections.length) % filteredCollections.length);
          break;
        case "Enter":
          e.preventDefault();
          selectCollection(filteredCollections[activeIndex].collection);
          break;
        case "Escape":
          e.preventDefault();
          setShowAutocomplete(false);
          setCurrentTrigger(null);
          setCollectionQuery("");
          break;
        case "Tab":
          e.preventDefault();
          selectCollection(filteredCollections[activeIndex].collection);
          break;
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  }, [showAutocomplete, currentTrigger, results, filteredCollections, activeIndex, selectMention, selectCollection, clear, onSubmit]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (!value && editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  }, [value]);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (!value && editorRef.current) {
      editorRef.current.innerHTML = `<span class="text-muted-foreground">${placeholder}</span>`;
    }
  }, [value, placeholder]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize with placeholder
  useEffect(() => {
    if (editorRef.current && !value && !isFocused) {
      editorRef.current.innerHTML = `<span class="text-muted-foreground">${placeholder}</span>`;
    }
  }, [placeholder, value, isFocused]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* Autocomplete dropdown for @ mentions */}
      {currentTrigger === "@" && (
        <MentionAutocomplete
          results={results}
          activeIndex={activeIndex}
          onSelect={selectMention}
          visible={showAutocomplete && isSearching}
        />
      )}
      
      {/* Autocomplete dropdown for # collections */}
      {currentTrigger === "#" && showAutocomplete && (
        <CollectionAutocomplete
          collections={filteredCollections}
          activeIndex={activeIndex}
          onSelect={selectCollection}
        />
      )}

      {/* Contenteditable input with inline chips - borderless for Glean style */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "min-h-[24px] w-full bg-transparent text-sm",
          "focus:outline-none",
          "overflow-y-auto max-h-32",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        suppressContentEditableWarning
      />
    </div>
  );
}

// Helper to escape HTML
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Get SVG icon string for inline use
function getIconSvg(type: MentionType): string {
  const icons: Record<MentionType, string> = {
    contact: '<svg class="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    property: '<svg class="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    doc: '<svg class="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    deal: '<svg class="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  };
  return icons[type] || icons.doc;
}

// Get SVG icon string for collection chips
function getCollectionIconSvg(collection: CollectionType): string {
  const icons: Record<CollectionType, string> = {
    Properties: '<svg class="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    Contacts: '<svg class="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    Deals: '<svg class="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    Documents: '<svg class="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  };
  return icons[collection] || icons.Documents;
}

// Collection Autocomplete component
interface CollectionAutocompleteProps {
  collections: Array<{ type: "collection"; collection: CollectionType; name: string; subtitle: string }>;
  activeIndex: number;
  onSelect: (collection: CollectionType) => void;
}

function CollectionAutocomplete({ collections, activeIndex, onSelect }: CollectionAutocompleteProps) {
  if (collections.length === 0) return null;
  
  return (
    <div className="absolute bottom-full mb-1 left-0 right-0 z-50 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
      <div className="p-1">
        <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Collections</div>
        {collections.map((item, index) => (
          <button
            key={item.collection}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded",
              "hover:bg-accent hover:text-accent-foreground",
              index === activeIndex && "bg-accent text-accent-foreground"
            )}
            onClick={() => onSelect(item.collection)}
            type="button"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300">
              {item.collection === "Properties" && <Home className="h-3.5 w-3.5" />}
              {item.collection === "Contacts" && <User className="h-3.5 w-3.5" />}
              {item.collection === "Deals" && <Briefcase className="h-3.5 w-3.5" />}
              {item.collection === "Documents" && <FileText className="h-3.5 w-3.5" />}
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.subtitle}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
