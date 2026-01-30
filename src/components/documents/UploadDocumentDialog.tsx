import { useState, useCallback } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";
import { toast } from "@/hooks/use-toast";

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const CATEGORIES = [
  { value: "contract", label: "Contract" },
  { value: "disclosure", label: "Disclosure" },
  { value: "inspection", label: "Inspection" },
  { value: "appraisal", label: "Appraisal" },
  { value: "title", label: "Title" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadDocumentDialog({ open, onOpenChange }: UploadDocumentDialogProps) {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [dealId, setDealId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Fetch deals for linking
  const { data: deals = [] } = useQuery({
    queryKey: ["deals-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, deal_type, contacts(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch properties for linking
  const { data: properties = [] } = useQuery({
    queryKey: ["properties-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, address, city")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch contacts for linking
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const resetForm = useCallback(() => {
    setFile(null);
    setName("");
    setCategory("other");
    setDealId(null);
    setPropertyId(null);
    setContactId(null);
    setProgress(0);
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, Word document, or image file.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, "")); // Remove extension for name
    }
  }, [name]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleUpload = async () => {
    if (!file || !profile?.tenant_id || !user?.id) {
      toast({
        title: "Upload error",
        description: "Missing file or user information.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // Generate unique filename with tenant folder
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${profile.tenant_id}/${timestamp}-${sanitizedName}`;

      setProgress(30);

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      setProgress(70);

      // Create database record
      const { error: dbError } = await supabase.from("documents").insert({
        tenant_id: profile.tenant_id,
        name: name || file.name,
        file_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        category: category,
        deal_id: dealId,
        property_id: propertyId,
        contact_id: contactId,
        uploaded_by: user.id,
      });

      if (dbError) {
        throw dbError;
      }

      setProgress(100);

      toast({
        title: "Document uploaded",
        description: `${name || file.name} has been uploaded successfully.`,
      });

      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: ["documents"] });

      // Close dialog and reset
      resetForm();
      onOpenChange(false);
    } catch (error) {
      logger.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload contracts, disclosures, inspections, and other real estate documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
              ${file ? "bg-muted/50" : ""}
            `}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) handleFileSelect(selectedFile);
              }}
            />
            
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Drag and drop or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Word, or images up to 10MB
                </p>
              </>
            )}
          </div>

          {/* Document Name */}
          <div className="space-y-2">
            <Label htmlFor="doc-name">Document Name</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter document name"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Associations */}
          <div className="grid grid-cols-1 gap-4">
            {/* Link to Deal */}
            <div className="space-y-2">
              <Label>Link to Deal (optional)</Label>
              <Select value={dealId || "none"} onValueChange={(v) => setDealId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select deal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No deal</SelectItem>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.contacts?.first_name} {deal.contacts?.last_name} ({deal.deal_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Link to Property */}
            <div className="space-y-2">
              <Label>Link to Property (optional)</Label>
              <Select value={propertyId || "none"} onValueChange={(v) => setPropertyId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No property</SelectItem>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.address}, {prop.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Link to Contact */}
            <div className="space-y-2">
              <Label>Link to Contact (optional)</Label>
              <Select value={contactId || "none"} onValueChange={(v) => setContactId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No contact</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
