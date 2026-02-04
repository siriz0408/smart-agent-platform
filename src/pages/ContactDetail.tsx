import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ContactDetailsView } from "@/components/contacts/ContactDetailsView";
import { ContactDetailSheet } from "@/components/contacts/ContactDetailSheet";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { Tables } from "@/integrations/supabase/types";
import { useState } from "react";

type Contact = Tables<"contacts">;

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const { data: contact, isLoading, error } = useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      if (!id) throw new Error("Contact ID is required");

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        logger.error("Failed to fetch contact:", error);
        throw error;
      }

      return data as Contact;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Contact Not Found</h2>
            <p className="text-muted-foreground">
              The contact you're looking for doesn't exist or you don't have permission to view it.
            </p>
          </div>
          <Button onClick={() => navigate("/contacts")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/contacts">Contacts</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {contact.first_name} {contact.last_name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contacts
        </Button>

        {/* Contact Details */}
        <ContactDetailsView
          contact={contact}
          onEdit={() => setIsEditSheetOpen(true)}
          onDelete={() => navigate(-1)}
        />
      </div>

      {/* Edit Sheet - Reuse existing ContactDetailSheet */}
      <ContactDetailSheet
        contact={contact}
        open={isEditSheetOpen}
        onOpenChange={(open) => {
          setIsEditSheetOpen(open);
          // Refresh contact data when sheet closes
          if (!open) {
            // Query will auto-refresh due to invalidation in ContactDetailSheet
          }
        }}
        defaultTab="edit"
      />
    </>
  );
}
