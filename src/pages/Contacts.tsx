import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Mail, Phone, MoreHorizontal, MessageSquare, UserPlus, Eye, Pencil, GitBranch, Trash2, Upload, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PresenceDot } from "@/components/messages/PresenceDot";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { CreateContactDialog } from "@/components/contacts/CreateContactDialog";
import { ContactDetailSheet } from "@/components/contacts/ContactDetailSheet";
import { AddToPipelineDialog } from "@/components/contacts/AddToPipelineDialog";
import { ImportContactsDialog } from "@/components/contacts/ImportContactsDialog";
import { useConversation } from "@/hooks/useConversation";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Contact = Tables<"contacts"> & { user_id?: string | null };

const contactTypeColors: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  buyer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  seller: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  agent: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  vendor: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  both: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
};

export default function Contacts() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [detailSheetTab, setDetailSheetTab] = useState<"details" | "edit">("details");
  const [isPipelineDialogOpen, setIsPipelineDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { createOrFindConversation, createOrFindContactConversation } = useConversation(null);

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (contact: Contact) => {
      if (!contact.email) {
        throw new Error("Contact has no email address");
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("send-invite", {
        body: {
          contactId: contact.id,
          contactEmail: contact.email,
          contactName: `${contact.first_name} ${contact.last_name}`,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast.success("Invitation sent successfully!");
    },
    onError: (error) => {
      logger.error("Failed to send invite:", error);
      toast.error("Failed to send invitation. Please try again.");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setIsDeleteDialogOpen(false);
      setSelectedContact(null);
    },
    onError: (error) => {
      logger.error("Failed to delete contact:", error);
      toast.error("Failed to delete contact");
    },
  });

  const handleSendMessage = async (contact: Contact) => {
    // If contact has a user_id (they're on the platform), use user-to-user messaging
    // Otherwise, use agent-to-contact messaging
    let conversationId: string | null = null;
    
    if (contact.user_id) {
      conversationId = await createOrFindConversation(contact.user_id);
    } else {
      conversationId = await createOrFindContactConversation(contact.id);
    }
    
    if (conversationId) {
      navigate(`/messages/${conversationId}`);
    }
  };

  const handleInvite = (contact: Contact) => {
    if (!contact.email) {
      toast.error("This contact has no email address. Please add one first.");
      return;
    }
    inviteMutation.mutate(contact);
  };

  const handleViewDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailSheetTab("details");
    setIsDetailSheetOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailSheetTab("edit");
    setIsDetailSheetOpen(true);
  };

  const handleAddToPipeline = (contact: Contact) => {
    setSelectedContact(contact);
    setIsPipelineDialogOpen(true);
  };

  const handleDeleteClick = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDeleteDialogOpen(true);
  };

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Contact[];
    },
  });

  const filteredContacts = contacts.filter((contact) => {
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      fullName.includes(query) ||
      (contact.email?.toLowerCase().includes(query) ?? false) ||
      (contact.phone?.includes(query) ?? false);
    const matchesFilter =
      filterTypes.length === 0 || filterTypes.includes(contact.contact_type || "");
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredContacts.length / pageSize);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters/search change
  const resetPage = () => setCurrentPage(1);

  const buyerCount = contacts.filter((c) => c.contact_type === "buyer" || c.contact_type === "both").length;
  const sellerCount = contacts.filter((c) => c.contact_type === "seller" || c.contact_type === "both").length;
  const leadCount = contacts.filter((c) => c.contact_type === "lead").length;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Contacts</h1>
            <p className="text-muted-foreground">
              Manage your clients, leads, and business contacts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">Import</span>
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Contact</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        <CreateContactDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-semibold">{contacts.length}</div>
              )}
              <div className="text-sm text-muted-foreground">Total Contacts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-semibold">{buyerCount}</div>
              )}
              <div className="text-sm text-muted-foreground">Buyers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-semibold">{sellerCount}</div>
              )}
              <div className="text-sm text-muted-foreground">Sellers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-semibold">{leadCount}</div>
              )}
              <div className="text-sm text-muted-foreground">Leads</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }}
              className="pl-10"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative" aria-label="Filter contacts">
                <Filter className="h-4 w-4" />
                {filterTypes.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {filterTypes.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Filter by Type</h4>
                  {filterTypes.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 px-2 text-xs"
                      onClick={() => { setFilterTypes([]); resetPage(); }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                {Object.keys(contactTypeColors).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filterTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        setFilterTypes((prev) =>
                          checked
                            ? [...prev, type]
                            : prev.filter((t) => t !== type)
                        );
                        resetPage();
                      }}
                    />
                    <Badge variant="secondary" className={contactTypeColors[type]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Badge>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Contacts Table / Cards */}
        {isMobile ? (
          /* Mobile: Card Layout */
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                      <Skeleton className="h-11 w-11 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredContacts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {searchQuery || filterTypes.length > 0 ? "No contacts match your search or filters" : "No contacts yet. Add your first contact!"}
                </CardContent>
              </Card>
            ) : (
              paginatedContacts.map((contact) => (
                <Card
                  key={contact.id}
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewDetails(contact)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-lg">
                            {contact.first_name[0]}
                            {contact.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <ContactPresence userId={contact.user_id} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">
                              {contact.first_name} {contact.last_name}
                            </p>
                            {contact.company && (
                              <p className="text-sm text-muted-foreground">{contact.company}</p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-11 w-11 flex-shrink-0" aria-label="Contact actions">
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {contact.user_id ? (
                                <DropdownMenuItem onClick={() => handleSendMessage(contact)}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Send message
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleInvite(contact)}
                                  disabled={inviteMutation.isPending || !contact.email}
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  {inviteMutation.isPending ? "Sending..." : "Invite to platform"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewDetails(contact)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit contact
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAddToPipeline(contact)}>
                                <GitBranch className="h-4 w-4 mr-2" />
                                Add to pipeline
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteClick(contact)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={contactTypeColors[contact.contact_type || "lead"]}
                            variant="secondary"
                          >
                            {(contact.contact_type || "lead").charAt(0).toUpperCase() + (contact.contact_type || "lead").slice(1)}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          {contact.email && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate">{contact.email}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>{contact.email}</TooltipContent>
                            </Tooltip>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                        </div>
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {contact.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* Desktop: Table View */
          <Card>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery || filterTypes.length > 0 ? "No contacts match your search or filters" : "No contacts yet. Add your first contact!"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedContacts.map((contact) => (
                  <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => handleViewDetails(contact)}>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {contact.first_name[0]}
                              {contact.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <ContactPresence userId={contact.user_id} />
                        </div>
                        <div>
                          <div className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </div>
                          {contact.company && (
                            <div className="text-sm text-muted-foreground">
                              {contact.company}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleViewDetails(contact)}>
                      <div className="space-y-1">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleViewDetails(contact)}>
                      <Badge 
                        className={contactTypeColors[contact.contact_type || "lead"]} 
                        variant="secondary"
                      >
                        {(contact.contact_type || "lead").charAt(0).toUpperCase() + (contact.contact_type || "lead").slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => handleViewDetails(contact)}>
                      <div className="flex flex-wrap gap-1">
                        {(contact.tags || []).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Contact actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          {contact.user_id ? (
                            <DropdownMenuItem onClick={() => handleSendMessage(contact)}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Send message
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => handleInvite(contact)}
                              disabled={inviteMutation.isPending || !contact.email}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              {inviteMutation.isPending ? "Sending..." : "Invite to platform"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewDetails(contact)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit contact
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddToPipeline(contact)}>
                            <GitBranch className="h-4 w-4 mr-2" />
                            Add to pipeline
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteClick(contact)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredContacts.length)} of {filteredContacts.length}
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        isActive={currentPage === pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Contact Detail Sheet */}
        <ContactDetailSheet
          contact={selectedContact}
          open={isDetailSheetOpen}
          onOpenChange={setIsDetailSheetOpen}
          defaultTab={detailSheetTab}
        />

        {/* Add to Pipeline Dialog */}
        <AddToPipelineDialog
          contact={selectedContact}
          open={isPipelineDialogOpen}
          onOpenChange={setIsPipelineDialogOpen}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Contact</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedContact?.first_name} {selectedContact?.last_name}? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedContact && deleteMutation.mutate(selectedContact.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import Contacts Dialog */}
        <ImportContactsDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
        />
      </div>
    </AppLayout>
  );
}

// Helper component to show presence for a contact
function ContactPresence({ userId }: { userId: string | null }) {
  const { data: presence } = useQuery({
    queryKey: ["presence", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("user_presence")
        .select("status")
        .eq("user_id", userId)
        .single();
      return data;
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (!presence) return null;

  return (
    <div className="absolute bottom-0 right-0">
      <PresenceDot status={presence.status} showPulse={true} />
    </div>
  );
}
