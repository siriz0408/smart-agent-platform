import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Participant {
  user_id: string | null;
  contact_id: string | null;
  profile?: {
    full_name: string | null;
    email: string;
  } | null;
  contact?: {
    first_name: string;
    last_name: string;
    email: string | null;
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
  const getParticipantName = (p: Participant): string => {
    if (p.profile?.full_name) return p.profile.full_name;
    if (p.profile?.email) return p.profile.email.split("@")[0];
    if (p.contact) return `${p.contact.first_name} ${p.contact.last_name}`;
    return "";
  };

  const getConversationName = () => {
    if (conversation.title) return conversation.title;
    const names = conversation.participants
      .map(getParticipantName)
      .filter((name) => name.length > 0);
    if (names.length === 0) return "Conversation";
    return names.join(", ");
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
