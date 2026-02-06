import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMessageAttachments, type PendingAttachment } from "@/hooks/useMessageAttachments";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (content: string, uploadAttachments?: (messageId: string) => Promise<void>) => Promise<void>;
  disabled?: boolean;
  conversationId?: string;
}

export function MessageInput({ onSend, disabled, conversationId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { pendingAttachments, addFiles, removeFile, clearFiles, hasAttachments, uploadAttachments } =
    useMessageAttachments();
  const { handleTyping, stopTyping } = useTypingIndicator(conversationId ?? null);

  const handleSend = async () => {
    const trimmedContent = content.trim();
    if ((!trimmedContent && !hasAttachments) || isSending || !conversationId) return;

    setIsSending(true);
    stopTyping(); // Stop typing indicator when sending
    try {
      // Create upload function that receives messageId
      const uploadFn = hasAttachments
        ? async (messageId: string) => {
            await uploadAttachments(conversationId, messageId);
          }
        : undefined;

      await onSend(trimmedContent || "(Attachment)", uploadFn);
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

  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = files instanceof FileList ? Array.from(files) : files;
    if (fileArray.length === 0) return;

    const { added, errors } = addFiles(fileArray);

    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
    }

    if (added > 0) {
      toast.success(`${added} file${added > 1 ? "s" : ""} attached`);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    handleFileSelect(files);

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isSending) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isSending) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
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
    <div
      ref={dropZoneRef}
      className={cn(
        "border-t border-border p-4 transition-colors",
        isDragging && "bg-primary/5 border-primary/50"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium text-primary">Drop files here to attach</p>
          </div>
        </div>
      )}

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
          onChange={handleFileInputChange}
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

  const getFileIcon = () => {
    const ext = attachment.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "📄";
    if (["doc", "docx"].includes(ext || "")) return "📝";
    if (["xls", "xlsx"].includes(ext || "")) return "📊";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return "🖼️";
    return "📎";
  };

  return (
    <div className="relative group flex items-center gap-2 p-2 bg-muted rounded-lg border border-border hover:border-primary/50 transition-colors max-w-[240px]">
      {isImage && attachment.preview ? (
        <div className="relative h-12 w-12 rounded overflow-hidden bg-background flex-shrink-0">
          <img
            src={attachment.preview}
            alt={attachment.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="h-12 w-12 bg-background rounded flex items-center justify-center flex-shrink-0 border border-border">
          <span className="text-lg">{getFileIcon()}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" title={attachment.name}>
          {attachment.name}
        </p>
        <p className="text-xs text-muted-foreground">{formatSize(attachment.size)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={onRemove}
        aria-label="Remove attachment"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
