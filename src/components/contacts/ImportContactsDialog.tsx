import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useContactImport,
  ContactImportRow,
  ImportValidationResult,
  SAMPLE_CSV_CONTENT,
} from "@/hooks/useContactImport";

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "upload" | "preview" | "importing" | "complete";

export function ImportContactsDialog({ open, onOpenChange }: ImportContactsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { validateCSV, importContacts, progress, resetProgress, isImporting } = useContactImport();

  const handleClose = useCallback(() => {
    if (!isImporting) {
      setStep("upload");
      setFile(null);
      setValidationResult(null);
      setError(null);
      resetProgress();
      onOpenChange(false);
    }
  }, [isImporting, resetProgress, onOpenChange]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setError(null);

    try {
      const result = await validateCSV(selectedFile);
      setValidationResult(result);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    }
  }, [validateCSV]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleImport = useCallback(async () => {
    if (!validationResult?.valid.length) return;

    setStep("importing");
    try {
      await importContacts(validationResult.valid);
      setStep("complete");
    } catch {
      setStep("preview");
    }
  }, [validationResult, importContacts]);

  const downloadSampleCSV = useCallback(() => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple contacts at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === "upload" && (
            <div className="space-y-4">
              {/* Drop Zone */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                  "hover:border-primary/50 hover:bg-accent/50",
                  isDragging && "border-primary bg-primary/5"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">Drop your CSV file here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}

              {/* Sample Template */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Need a template?</span>
                  <Button variant="outline" size="sm" onClick={downloadSampleCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample CSV
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Required columns: first_name, last_name
                  <br />
                  Optional: email, phone, contact_type, company, notes, address, city, state, zip_code
                </p>
              </div>
            </div>
          )}

          {step === "preview" && validationResult && (
            <div className="space-y-4">
              {/* Summary Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {validationResult.valid.length} valid
                </Badge>
                {validationResult.invalid.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {validationResult.invalid.length} invalid
                  </Badge>
                )}
                {validationResult.duplicates.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {validationResult.duplicates.length} duplicates
                  </Badge>
                )}
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.valid.slice(0, 100).map((contact, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </TableCell>
                          <TableCell>
                            {contact.first_name} {contact.last_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {contact.email || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {contact.phone || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{contact.contact_type}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {validationResult.invalid.map((item) => (
                        <TableRow key={`invalid-${item.row}`} className="bg-destructive/5">
                          <TableCell>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </TableCell>
                          <TableCell>
                            {item.data.first_name || "-"} {item.data.last_name || "-"}
                          </TableCell>
                          <TableCell colSpan={3}>
                            <span className="text-destructive text-xs">
                              Row {item.row}: {item.errors.join(", ")}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {validationResult.valid.length > 100 && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing first 100 of {validationResult.valid.length} valid contacts
                </p>
              )}
            </div>
          )}

          {step === "importing" && (
            <div className="py-8 space-y-4">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <p className="text-center font-medium">
                Importing {progress.total} contacts...
              </p>
              <Progress
                value={(progress.imported / progress.total) * 100}
                className="w-full"
              />
              <p className="text-center text-sm text-muted-foreground">
                {progress.imported} imported, {progress.failed} failed
              </p>
            </div>
          )}

          {step === "complete" && (
            <div className="py-8 text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Import Complete!</h3>
                <p className="text-muted-foreground mt-1">
                  Successfully imported {progress.imported} contacts
                  {progress.failed > 0 && `. ${progress.failed} failed.`}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={!validationResult?.valid.length}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import {validationResult?.valid.length} Contacts
              </Button>
            </>
          )}
          
          {step === "complete" && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
