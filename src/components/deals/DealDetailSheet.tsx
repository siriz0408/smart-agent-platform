import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { User, MapPin, DollarSign, Calendar, Percent, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MilestoneList } from "./MilestoneList";
import { AddNoteDialog } from "./AddNoteDialog";

interface Stage {
  id: string;
  label: string;
  color: string;
}

interface DealDetailSheetProps {
  dealId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
}

interface DealDetails {
  id: string;
  deal_type: string;
  stage: string | null;
  estimated_value: number | null;
  expected_close_date: string | null;
  actual_close_date: string | null;
  commission_rate: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  contacts: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  } | null;
  properties: {
    id: string;
    address: string;
    city: string;
    state: string;
    price: number | null;
  } | null;
}

export function DealDetailSheet({
  dealId,
  open,
  onOpenChange,
  stages,
}: DealDetailSheetProps) {
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal-detail", dealId],
    queryFn: async () => {
      if (!dealId) return null;
      const { data, error } = await supabase
        .from("deals")
        .select(`
          id,
          deal_type,
          stage,
          estimated_value,
          expected_close_date,
          actual_close_date,
          commission_rate,
          notes,
          created_at,
          updated_at,
          contacts(id, first_name, last_name, email, phone),
          properties(id, address, city, state, price)
        `)
        .eq("id", dealId)
        .single();

      if (error) throw error;
      return data as DealDetails;
    },
    enabled: !!dealId && open,
  });

  const currentStage = stages.find((s) => s.id === deal?.stage);
  const contactName = deal?.contacts
    ? `${deal.contacts.first_name} ${deal.contacts.last_name}`
    : "No contact";

  const estimatedCommission = deal?.estimated_value && deal?.commission_rate
    ? (deal.estimated_value * deal.commission_rate) / 100
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : deal ? (
          <>
            <SheetHeader className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl">{contactName}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="capitalize">
                      {deal.deal_type}
                    </Badge>
                    {currentStage && (
                      <Badge className={cn("text-white", currentStage.color)}>
                        {currentStage.label}
                      </Badge>
                    )}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Contact Info */}
              {deal.contacts && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Contact
                  </h3>
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium">{contactName}</p>
                      {deal.contacts.email && (
                        <p className="text-sm text-muted-foreground">{deal.contacts.email}</p>
                      )}
                      {deal.contacts.phone && (
                        <p className="text-sm text-muted-foreground">{deal.contacts.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Property Info */}
              {deal.properties && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Property
                  </h3>
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium">{deal.properties.address}</p>
                      <p className="text-sm text-muted-foreground">
                        {deal.properties.city}, {deal.properties.state}
                      </p>
                      {deal.properties.price && (
                        <p className="text-sm font-medium text-primary">
                          ${deal.properties.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Deal Financials */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Deal Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Est. Value</p>
                      <p className="font-medium">
                        {deal.estimated_value
                          ? `$${deal.estimated_value.toLocaleString()}`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Commission</p>
                      <p className="font-medium">
                        {deal.commission_rate ? `${deal.commission_rate}%` : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Exp. Close</p>
                      <p className="font-medium">
                        {deal.expected_close_date
                          ? format(new Date(deal.expected_close_date), "MMM d, yyyy")
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {estimatedCommission && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-primary/10">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Est. Earnings</p>
                        <p className="font-medium text-primary">
                          ${estimatedCommission.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Notes & Activity
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddNoteOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Note
                  </Button>
                </div>
                {deal.notes ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {deal.notes.split("\n\n---\n\n").map((note, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border bg-muted/30 text-sm"
                      >
                        <p className="whitespace-pre-wrap">{note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                    No notes yet. Add one to track activity.
                  </div>
                )}
              </div>

              <Separator />

              {/* Milestones Section */}
              <MilestoneList dealId={deal.id} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Deal not found
          </div>
        )}
      </SheetContent>

      {/* Add Note Dialog */}
      {deal && (
        <AddNoteDialog
          dealId={deal.id}
          currentNotes={deal.notes}
          open={isAddNoteOpen}
          onOpenChange={setIsAddNoteOpen}
        />
      )}
    </Sheet>
  );
}
