import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Participant {
  user_id: string;
  profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

interface Conversation {
  id: string;
  title: string | null;
  participants: Participant[];
}

interface ConversationHeaderProps {
  conversation: Conversation;
  onBack: () => void;
}

export function ConversationHeader({ conversation, onBack }: ConversationHeaderProps) {
  const getConversationName = () => {
    if (conversation.title) return conversation.title;
    const otherParticipants = conversation.participants.filter(
      (p) => p.profile?.full_name || p.profile?.email
    );
    if (otherParticipants.length === 0) return "Conversation";
    return otherParticipants
      .map((p) => p.profile?.full_name || p.profile?.email?.split("@")[0])
      .join(", ");
  };

  const getInitials = () => {
    const name = getConversationName();
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex items-center gap-3 p-4 border-b border-border">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="md:hidden"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary/10 text-primary">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      <div>
        <h3 className="font-semibold">{getConversationName()}</h3>
        <p className="text-sm text-muted-foreground">
          {conversation.participants.length} participant{conversation.participants.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
