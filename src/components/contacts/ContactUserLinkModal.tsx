import { useState } from "react";
import { Search, Link as LinkIcon, User, Mail, Users, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useContactUserLink } from "@/hooks/useContactUserLink";

interface ContactUserLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactEmail?: string | null;
  onLinked?: () => void;
}

export function ContactUserLinkModal({
  open,
  onOpenChange,
  contactId,
  contactEmail,
  onLinked,
}: ContactUserLinkModalProps) {
  const [searchEmail, setSearchEmail] = useState(contactEmail || "");
  const {
    searchUser,
    isSearching,
    searchResults,
    clearSearch,
    linkContactToUser,
    isLinking,
    sendInvitation,
    isSendingInvitation,
  } = useContactUserLink();

  const handleSearch = async () => {
    await searchUser(searchEmail);
  };

  const handleLink = () => {
    if (searchResults) {
      linkContactToUser(
        { contactId, userId: searchResults.user_id },
        {
          onSuccess: () => {
            onLinked?.();
            onOpenChange(false);
            setSearchEmail("");
            clearSearch();
          },
        }
      );
    }
  };

  const handleSendInvitation = () => {
    sendInvitation(searchEmail, {
      onSuccess: () => {
        onOpenChange(false);
        setSearchEmail("");
        clearSearch();
      },
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearchEmail("");
    clearSearch();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Link Contact to Platform User
          </DialogTitle>
          <DialogDescription>
            Search for a platform user by email address to link this contact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter email address..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSearching) {
                    handleSearch();
                  }
                }}
                className="pl-9"
                disabled={isSearching}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchEmail.trim()}
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={searchResults.avatar_url || undefined} />
                  <AvatarFallback>
                    {searchResults.full_name?.[0] || searchResults.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{searchResults.full_name || "No name"}</p>
                    {searchResults.is_platform_user && (
                      <Badge variant="secondary" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        Platform User
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{searchResults.email}</p>
                  {searchResults.primary_role && (
                    <p className="text-sm text-muted-foreground">
                      Role: {searchResults.primary_role}
                    </p>
                  )}
                  {searchResults.linked_contact_count > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Users className="h-3 w-3" />
                      <span>
                        {searchResults.linked_contact_count} other agent
                        {searchResults.linked_contact_count === 1 ? "" : "s"} working with this user
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleLink} disabled={isLinking} className="flex-1">
                  {isLinking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Link Contact
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={clearSearch}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* No Results - Show Invitation Option */}
          {searchEmail && !searchResults && !isSearching && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No platform user found with email <strong>{searchEmail}</strong>.
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSendInvitation}
                    disabled={isSendingInvitation}
                  >
                    {isSendingInvitation ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-3 w-3" />
                        Send Platform Invitation
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Help Text */}
          <div className="text-sm text-muted-foreground space-y-2 pt-2 border-t">
            <p className="font-medium">What happens when you link a contact?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>You'll see the user's real-time preferences (budget, property needs, timeline)</li>
              <li>Your CRM notes remain private and editable by you</li>
              <li>User preferences are read-only (controlled by the user)</li>
              <li>Multiple agents can link to the same user</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
