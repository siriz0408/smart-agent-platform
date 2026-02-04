import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TypingIndicatorProps {
  conversationId: string;
  className?: string;
}

interface TypingIndicatorData {
  user_id: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export function TypingIndicator({ conversationId, className }: TypingIndicatorProps) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);

  // Subscribe to typing indicators via realtime
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch active typing users (updated in last 3 seconds)
          const threeSecondsAgo = new Date(Date.now() - 3000).toISOString();
          const { data } = await supabase
            .from("typing_indicators")
            .select("user_id, profiles(full_name, email)")
            .eq("conversation_id", conversationId)
            .neq("user_id", user.id) // Exclude current user
            .gte("updated_at", threeSecondsAgo);

          if (data) {
            const activeTypers = data.map((d: TypingIndicatorData) => ({
              userId: d.user_id,
              userName: d.profiles?.full_name || d.profiles?.email?.split("@")[0] || "Someone",
            }));
            setTypingUsers(activeTypers);
          } else {
            setTypingUsers([]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  if (typingUsers.length === 0) return null;

  const displayText =
    typingUsers.length === 1
      ? `${typingUsers[0].userName} is typing...`
      : typingUsers.length === 2
      ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`
      : `${typingUsers.length} people are typing...`;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
        </div>
        <span>{displayText}</span>
      </div>
    </div>
  );
}
