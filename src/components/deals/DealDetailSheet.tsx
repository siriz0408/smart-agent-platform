import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { User, MapPin, DollarSign, Calendar, Percent, Plus, FileCheck, Building, CreditCard, Clock } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  // Financials
  earnest_money: number | null;
  option_fee: number | null;
  appraisal_value: number | null;
  final_sale_price: number | null;
  // Key dates
  option_period_end: string | null;
  inspection_date: string | null;
  appraisal_date: string | null;
  financing_deadline: string | null;
  // Contingencies
  has_inspection_contingency: boolean | null;
  has_financing_contingency: boolean | null;
  has_appraisal_contingency: boolean | null;
  has_sale_contingency: boolean | null;
  // Lender
  loan_type: string | null;
  lender_name: string | null;
  loan_officer_name: string | null;
  loan_officer_phone: string | null;
  loan_officer_email: string | null;
  // Title/Escrow
  title_company: string | null;
  escrow_officer_name: string | null;
  escrow_officer_phone: string | null;
  title_policy_type: string | null;
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
          earnest_money,
          option_fee,
          appraisal_value,
          final_sale_price,
          option_period_end,
          inspection_date,
          appraisal_date,
          financing_deadline,
          has_inspection_contingency,
          has_financing_contingency,
          has_appraisal_contingency,
          has_sale_contingency,
          loan_type,
          lender_name,
          loan_officer_name,
          loan_officer_phone,
          loan_officer_email,
          title_company,
          escrow_officer_name,
          escrow_officer_phone,
          title_policy_type,
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

              {/* Additional Financials */}
              {(deal.earnest_money || deal.option_fee || deal.appraisal_value || deal.final_sale_price) && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Transaction Financials
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {deal.earnest_money && (
                      <div className="p-2 rounded border bg-muted/30">
                        <p className="text-xs text-muted-foreground">Earnest Money</p>
                        <p className="font-medium">${deal.earnest_money.toLocaleString()}</p>
                      </div>
                    )}
                    {deal.option_fee && (
                      <div className="p-2 rounded border bg-muted/30">
                        <p className="text-xs text-muted-foreground">Option Fee</p>
                        <p className="font-medium">${deal.option_fee.toLocaleString()}</p>
                      </div>
                    )}
                    {deal.appraisal_value && (
                      <div className="p-2 rounded border bg-muted/30">
                        <p className="text-xs text-muted-foreground">Appraisal Value</p>
                        <p className="font-medium">${deal.appraisal_value.toLocaleString()}</p>
                      </div>
                    )}
                    {deal.final_sale_price && (
                      <div className="p-2 rounded border bg-green-50 dark:bg-green-950">
                        <p className="text-xs text-muted-foreground">Final Sale Price</p>
                        <p className="font-medium text-green-700 dark:text-green-400">${deal.final_sale_price.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Key Dates */}
              {(deal.option_period_end || deal.inspection_date || deal.appraisal_date || deal.financing_deadline) && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Key Dates
                  </h3>
                  <div className="space-y-2 text-sm">
                    {deal.option_period_end && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Option Period:</span>
                        <span className="font-medium">{format(new Date(deal.option_period_end), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {deal.inspection_date && (
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Inspection:</span>
                        <span className="font-medium">{format(new Date(deal.inspection_date), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {deal.appraisal_date && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Appraisal:</span>
                        <span className="font-medium">{format(new Date(deal.appraisal_date), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {deal.financing_deadline && (
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Financing:</span>
                        <span className="font-medium">{format(new Date(deal.financing_deadline), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contingencies */}
              {(deal.has_inspection_contingency !== null || deal.has_financing_contingency !== null || deal.has_appraisal_contingency !== null || deal.has_sale_contingency !== null) && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Contingencies
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {deal.has_inspection_contingency && (
                      <Badge variant="secondary">Inspection</Badge>
                    )}
                    {deal.has_financing_contingency && (
                      <Badge variant="secondary">Financing</Badge>
                    )}
                    {deal.has_appraisal_contingency && (
                      <Badge variant="secondary">Appraisal</Badge>
                    )}
                    {deal.has_sale_contingency && (
                      <Badge variant="secondary">Sale of Home</Badge>
                    )}
                    {!deal.has_inspection_contingency && !deal.has_financing_contingency && !deal.has_appraisal_contingency && !deal.has_sale_contingency && (
                      <span className="text-sm text-muted-foreground">No contingencies</span>
                    )}
                  </div>
                </div>
              )}

              {/* Lender Info */}
              {(deal.loan_type || deal.lender_name || deal.loan_officer_name) && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Lender Information
                  </h3>
                  <div className="space-y-2 text-sm p-3 rounded-lg border bg-muted/30">
                    {deal.loan_type && <p><span className="text-muted-foreground">Loan Type:</span> <span className="font-medium capitalize">{deal.loan_type}</span></p>}
                    {deal.lender_name && <p><span className="text-muted-foreground">Lender:</span> <span className="font-medium">{deal.lender_name}</span></p>}
                    {deal.loan_officer_name && (
                      <div className="pt-2 border-t">
                        <p className="font-medium">{deal.loan_officer_name}</p>
                        {deal.loan_officer_phone && <p className="text-muted-foreground">{deal.loan_officer_phone}</p>}
                        {deal.loan_officer_email && <p className="text-muted-foreground">{deal.loan_officer_email}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Title/Escrow Info */}
              {(deal.title_company || deal.escrow_officer_name) && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Title & Escrow
                  </h3>
                  <div className="space-y-2 text-sm p-3 rounded-lg border bg-muted/30">
                    {deal.title_company && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{deal.title_company}</span>
                      </div>
                    )}
                    {deal.title_policy_type && <p className="text-muted-foreground ml-6">Policy: {deal.title_policy_type}</p>}
                    {deal.escrow_officer_name && (
                      <div className="pt-2 border-t">
                        <p className="font-medium">{deal.escrow_officer_name}</p>
                        {deal.escrow_officer_phone && <p className="text-muted-foreground">{deal.escrow_officer_phone}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
