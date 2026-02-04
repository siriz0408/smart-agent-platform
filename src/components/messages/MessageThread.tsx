import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useSaveToDocuments, useGetAttachmentUrl, type MessageAttachment } from "@/hooks/useMessageAttachments";
import { FileText, Download, FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TypingIndicator } from "./TypingIndicator";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sent_at: string;
  message_type: string;
  file_url?: string | null;
  senderProfile?: {
    full_name: string | null;
    email: string;
  } | null;
  attachments?: MessageAttachment[];
}

interface MessageThreadProps {
  messages: Message[];
  isLoading: boolean;
  conversationId?: string;
}

export function MessageThread({ messages, isLoading, conversationId }: MessageThreadProps) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getInitials = (message: Message) => {
    const name = message.senderProfile?.full_name || message.senderProfile?.email || "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getSenderName = (message: Message) => {
    return message.senderProfile?.full_name || message.senderProfile?.email?.split("@")[0] || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "" : "flex-row-reverse")}>
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className={cn("space-y-1", i % 2 === 0 ? "" : "items-end")}>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-16 w-48 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        {messages.map((message, index) => {
          const isOwnMessage = message.sender_id === user?.id;
          const showAvatar =
            index === 0 || messages[index - 1].sender_id !== message.sender_id;
          const showTimestamp =
            index === messages.length - 1 ||
            messages[index + 1].sender_id !== message.sender_id;

          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                isOwnMessage ? "flex-row-reverse" : ""
              )}
            >
              {showAvatar ? (
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className={cn(
                      "text-xs",
                      isOwnMessage
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {getInitials(message)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-8" />
              )}

              <div
                className={cn(
                  "flex flex-col max-w-[70%]",
                  isOwnMessage ? "items-end" : "items-start"
                )}
              >
                {showAvatar && (
                  <span className="text-xs text-muted-foreground mb-1">
                    {isOwnMessage ? "You" : getSenderName(message)}
                  </span>
                )}
                <div
                  className={cn(
                    "px-3 py-2 rounded-lg",
                    isOwnMessage
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                {/* Display attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((attachment) => (
                      <AttachmentDisplay
                        key={attachment.id}
                        attachment={attachment}
                        isOwnMessage={isOwnMessage}
                      />
                    ))}
                  </div>
                )}

                {/* Legacy file_url support */}
                {message.file_url && !message.attachments?.length && (
                  <div className="mt-2">
                    <LegacyFileDisplay url={message.file_url} isOwnMessage={isOwnMessage} />
                  </div>
                )}

                {showTimestamp && (
                  <span className="text-xs text-muted-foreground mt-1">
                    {format(new Date(message.sent_at), "h:mm a")}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {conversationId && <TypingIndicator conversationId={conversationId} />}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

interface AttachmentDisplayProps {
  attachment: MessageAttachment;
  isOwnMessage: boolean;
}

function AttachmentDisplay({ attachment, isOwnMessage }: AttachmentDisplayProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const saveToDocuments = useSaveToDocuments();
  const getAttachmentUrl = useGetAttachmentUrl();
  const isImage = attachment.file_type.startsWith("image/");

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async () => {
    setIsLoadingUrl(true);
    try {
      const signedUrl = await getAttachmentUrl(attachment.storage_path);
      if (signedUrl) {
        window.open(signedUrl, "_blank");
      } else {
        toast.error("Failed to get download link");
      }
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleSaveToDocuments = async () => {
    try {
      await saveToDocuments.mutateAsync(attachment.id);
      toast.success("Saved to your documents!");
    } catch (error) {
      toast.error("Failed to save document");
    }
  };

  // Load image preview
  useEffect(() => {
    if (isImage) {
      getAttachmentUrl(attachment.storage_path).then(setUrl);
    }
  }, [attachment.storage_path, isImage, getAttachmentUrl]);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-2 rounded-lg border max-w-xs",
        isOwnMessage ? "bg-primary/10" : "bg-muted"
      )}
    >
      {isImage && url && (
        <img
          src={url}
          alt={attachment.file_name}
          className="rounded max-h-48 object-cover cursor-pointer"
          onClick={handleDownload}
        />
      )}

      <div className="flex items-center gap-2">
        {!isImage && (
          <div className="h-10 w-10 bg-background rounded flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{attachment.file_name}</p>
          <p className="text-xs text-muted-foreground">{formatSize(attachment.file_size)}</p>
        </div>
      </div>

      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={handleDownload}
          disabled={isLoadingUrl}
        >
          {isLoadingUrl ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Download className="h-3 w-3 mr-1" />
              Download
            </>
          )}
        </Button>
        {!isOwnMessage && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleSaveToDocuments}
            disabled={saveToDocuments.isPending}
          >
            {saveToDocuments.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <FolderPlus className="h-3 w-3 mr-1" />
                Save to Docs
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

interface LegacyFileDisplayProps {
  url: string;
  isOwnMessage: boolean;
}

function LegacyFileDisplay({ url, isOwnMessage }: LegacyFileDisplayProps) {
  const fileName = url.split("/").pop() || "File";
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-2 rounded-lg border max-w-xs",
        isOwnMessage ? "bg-primary/10" : "bg-muted"
      )}
    >
      {isImage ? (
        <img
          src={url}
          alt={fileName}
          className="rounded max-h-48 object-cover cursor-pointer"
          onClick={() => window.open(url, "_blank")}
        />
      ) : (
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-background rounded flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{fileName}</p>
          </div>
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => window.open(url, "_blank")}
      >
        <Download className="h-3 w-3 mr-1" />
        Download
      </Button>
    </div>
  );
}
