import { useState, useRef, useCallback, useEffect, KeyboardEvent, ChangeEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { MentionPill } from "./MentionPill";
import { useMentionSearch, formatMention, type Mention, type MentionType } from "@/hooks/useMentionSearch";
import { cn } from "@/lib/utils";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentions: Mention[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onSubmit?: () => void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { search, clear, results, isSearching } = useMentionSearch();

  const [mentions, setMentions] = useState<Mention[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [_mentionFilter, setMentionFilter] = useState<MentionType | undefined>(undefined);

  // Detect @ trigger and extract search query
  const detectMention = useCallback((text: string, cursorPos: number) => {
    // Find the start of the current mention (@ character)
    let start = cursorPos - 1;
    while (start >= 0 && text[start] !== "@" && text[start] !== " " && text[start] !== "\n") {
      start--;
    }

    if (start >= 0 && text[start] === "@") {
      const query = text.slice(start + 1, cursorPos);

      // Check if user typed a filter like "@doc:"
      const filterMatch = query.match(/^(doc|contact|property):/);
      if (filterMatch) {
        const filter = filterMatch[1] as MentionType;
        const searchText = query.slice(filterMatch[0].length);
        setMentionFilter(filter);
        search(searchText, filter);
      } else {
        setMentionFilter(undefined);
        search(query);
      }

      setMentionStart(start);
      setShowAutocomplete(true);
      setActiveIndex(0);
    } else {
      setShowAutocomplete(false);
      setMentionStart(null);
      clear();
    }
  }, [search, clear]);

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    onChange(newValue);
    detectMention(newValue, cursorPos);
  }, [onChange, detectMention]);

  const selectMention = useCallback((mention: Mention) => {
    if (mentionStart === null) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const before = value.slice(0, mentionStart);
    const after = value.slice(textarea.selectionStart || mentionStart);
    const mentionText = formatMention(mention);
    const newValue = `${before}${mentionText} ${after}`;

    onChange(newValue);
    setMentions((prev) => {
      const updated = [...prev, mention];
      onMentionsChange?.(updated);
      return updated;
    });
    setShowAutocomplete(false);
    setMentionStart(null);
    clear();

    // Focus back on textarea and position cursor after mention
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = mentionStart + mentionText.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange, mentionStart, clear, onMentionsChange]);

  const removeMention = useCallback((mentionToRemove: Mention) => {
    // Remove the mention from state
    setMentions((prev) => {
      const updated = prev.filter((m) => m.id !== mentionToRemove.id);
      onMentionsChange?.(updated);
      return updated;
    });

    // Remove the mention text from the value
    const mentionText = formatMention(mentionToRemove);
    const newValue = value.replace(mentionText + " ", "").replace(mentionText, "");
    onChange(newValue);
  }, [value, onChange, onMentionsChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutocomplete && results.length > 0) {
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
          if (!e.shiftKey) {
            e.preventDefault();
            selectMention(results[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowAutocomplete(false);
          clear();
          break;
        case "Tab":
          e.preventDefault();
          selectMention(results[activeIndex]);
          break;
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  }, [showAutocomplete, results, activeIndex, selectMention, clear, onSubmit]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)}>
      {/* Show selected mentions as pills */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {mentions.map((mention) => (
            <MentionPill
              key={`${mention.type}-${mention.id}`}
              mention={mention}
              onRemove={() => removeMention(mention)}
            />
          ))}
        </div>
      )}

      {/* Autocomplete dropdown */}
      <MentionAutocomplete
        results={results}
        activeIndex={activeIndex}
        onSelect={selectMention}
        visible={showAutocomplete && isSearching}
      />

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[44px] max-h-32 resize-none"
        rows={1}
      />

      {/* Helper text */}
      {!showAutocomplete && (
        <p className="text-xs text-muted-foreground mt-1">
          Type <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">@</kbd> to mention documents, contacts, or properties
        </p>
      )}
    </div>
  );
}
