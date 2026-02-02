import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Building } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { SearchResult } from "@/hooks/useGlobalSearch";

const contactTypeColors: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  buyer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  seller: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  agent: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  vendor: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  both: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
};

interface ContactResultCardProps {
  result: SearchResult;
}

export function ContactResultCard({ result }: ContactResultCardProps) {
  const navigate = useNavigate();

  const email = result.metadata?.email as string | undefined;
  const phone = result.metadata?.phone as string | undefined;
  const company = result.metadata?.company as string | undefined;
  const contactType = (result.metadata?.contact_type as string) || "lead";

  // Extract initials from name
  const getInitials = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleClick = () => {
    navigate(`/contacts/${result.entity_id}`);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(result.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate mb-1">{result.name}</h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="secondary"
                className={`text-xs ${contactTypeColors[contactType]}`}
              >
                {contactType.charAt(0).toUpperCase() + contactType.slice(1)}
              </Badge>
            </div>
            <div className="space-y-1">
              {email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span className="truncate">{phone}</span>
                </div>
              )}
              {company && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                  <Building className="h-3 w-3 shrink-0" />
                  <span className="truncate">{company}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
