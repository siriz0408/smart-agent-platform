import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMessageAttachments, type PendingAttachment } from "@/hooks/useMessageAttachments";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { toast } from "sonner";

interface MessageInputProps {
  onSend: (content: string, uploadAttachments?: () => Promise<void>) => Promise<void>;
  disabled?: boolean;
  conversationId?: string;
}

export function MessageInput({ onSend, disabled, conversationId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pendingAttachments, addFiles, removeFile, clearFiles, hasAttachments } = useMessageAttachments();
  const { handleTyping, stopTyping } = useTypingIndicator(conversationId ?? null);

  const handleSend = async () => {
    const trimmedContent = content.trim();
    if ((!trimmedContent && !hasAttachments) || isSending) return;

    setIsSending(true);
    stopTyping(); // Stop typing indicator when sending
    try {
      await onSend(trimmedContent || "(Attachment)");
      setContent("");
      clearFiles();
    } finally {
      setIsSending(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    handleTyping(); // Trigger typing indicator
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const { added, errors } = addFiles(files);

    if (errors.length > 0) {
      toast.error(errors[0]);
    }

    if (added > 0) {
      toast.success(`${added} file${added > 1 ? "s" : ""} attached`);
    }

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [content]);

  return (
    <div className="border-t border-border p-4">
      {/* Pending Attachments */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {pendingAttachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              onRemove={() => removeFile(attachment.id)}
            />
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File Input (hidden) */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp"
        />

        {/* Attach Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSending}
          className="shrink-0"
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled || isSending}
          rows={1}
          className="min-h-[40px] max-h-[120px] resize-none"
        />
        <Button
          onClick={handleSend}
          disabled={(!content.trim() && !hasAttachments) || disabled || isSending}
          size="icon"
          className="shrink-0"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}

interface AttachmentPreviewProps {
  attachment: PendingAttachment;
  onRemove: () => void;
}

function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  const isImage = attachment.type.startsWith("image/");
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="relative group flex items-center gap-2 p-2 bg-muted rounded-lg max-w-[200px]">
      {isImage && attachment.preview ? (
        <img
          src={attachment.preview}
          alt={attachment.name}
          className="h-10 w-10 object-cover rounded"
        />
      ) : (
        <div className="h-10 w-10 bg-background rounded flex items-center justify-center">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">{formatSize(attachment.size)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
        aria-label="Remove attachment"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
