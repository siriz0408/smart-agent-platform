import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2, FileText, MessageSquare, Target, Calendar, Reply, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function getNotificationIcon(type: string) {
  switch (type) {
    case "milestone_reminder":
      return <Target className="h-4 w-4 text-orange-500" />;
    case "deal_stage_change":
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case "document_shared":
      return <FileText className="h-4 w-4 text-purple-500" />;
    case "message_received":
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate?: (url: string) => void;
  onQuickReply?: (conversationId: string, message: string) => Promise<void>;
}

function NotificationItem({ notification, onMarkAsRead, onDelete, onNavigate, onQuickReply }: NotificationItemProps) {
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [quickReplyText, setQuickReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const conversationId = notification.metadata?.conversation_id as string | undefined;
  const isMessageNotification = notification.type === "message_received" && conversationId;

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate to conversation or action_url if available
    if (isMessageNotification && conversationId) {
      onNavigate?.(`/messages/${conversationId}`);
    } else if (notification.action_url) {
      onNavigate?.(notification.action_url);
    }
  };

  const handleQuickReply = async () => {
    if (!conversationId || !quickReplyText.trim() || !onQuickReply) return;
    
    setIsSending(true);
    try {
      await onQuickReply(conversationId, quickReplyText.trim());
      setQuickReplyText("");
      setShowQuickReply(false);
      onMarkAsRead(notification.id);
      toast.success("Reply sent");
    } catch (error) {
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="group">
      <div
        className={cn(
          "flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer",
          !notification.read && "bg-primary/5"
        )}
        onClick={handleClick}
      >
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-sm", !notification.read && "font-medium")}>
              {notification.title}
            </p>
            {!notification.read && (
              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          {notification.body && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.body}
            </p>
          )}
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              {formatTimeAgo(notification.created_at)}
            </p>
            {isMessageNotification && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuickReply(!showQuickReply);
                }}
                aria-label="Reply to message"
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          aria-label="Delete notification"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Quick Reply Input */}
      {showQuickReply && isMessageNotification && onQuickReply && (
        <div className="px-3 pb-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2 mt-2">
            <Textarea
              value={quickReplyText}
              onChange={(e) => setQuickReplyText(e.target.value)}
              placeholder="Type a quick reply..."
              className="min-h-[60px] text-sm resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuickReply();
                }
                if (e.key === "Escape") {
                  setShowQuickReply(false);
                  setQuickReplyText("");
                }
              }}
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <Button
                size="icon"
                className="h-7 w-7"
                onClick={handleQuickReply}
                disabled={!quickReplyText.trim() || isSending}
                aria-label="Send reply"
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setShowQuickReply(false);
                  setQuickReplyText("");
                }}
                aria-label="Cancel reply"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Press Enter to send, Esc to cancel
          </p>
        </div>
      )}
    </div>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const recentNotifications = notifications.slice(0, 10);

  const handleNavigate = (url: string) => {
    navigate(url);
  };

  const handleQuickReply = async (conversationId: string, content: string) => {
    if (!user?.id) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: "text",
      });

    if (error) throw error;

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <h4 className="font-medium">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={() => markAllAsRead()}
              aria-label="Mark all notifications as read"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y">
              {recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onNavigate={handleNavigate}
                  onQuickReply={handleQuickReply}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {notifications.length > 10 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center">
              <Link to="/notifications" className="text-sm text-primary">
                View all notifications
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
