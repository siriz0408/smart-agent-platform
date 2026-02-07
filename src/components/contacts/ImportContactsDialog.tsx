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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
  ArrowRight,
  Columns,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useContactImport,
  ImportValidationResult,
  SAMPLE_CSV_CONTENT,
  parseCSVRaw,
  autoDetectMappings,
  validateMappedRows,
  ColumnMapping,
  ALL_FIELDS,
  FIELD_LABELS,
  REQUIRED_FIELDS,
  RawCSVData,
} from "@/hooks/useContactImport";

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "complete";

export function ImportContactsDialog({ open, onOpenChange }: ImportContactsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rawData, setRawData] = useState<RawCSVData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { importContacts, progress, resetProgress, isImporting } = useContactImport();

  const handleClose = useCallback(() => {
    if (!isImporting) {
      setStep("upload");
      setFile(null);
      setRawData(null);
      setColumnMapping({});
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

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit");
      return;
    }

    setFile(selectedFile);
    setError(null);

    try {
      const text = await selectedFile.text();
      const parsed = parseCSVRaw(text);

      if (parsed.rawHeaders.length === 0) {
        setError("CSV file appears to be empty or has no headers");
        return;
      }

      if (parsed.rawRows.length === 0) {
        setError("CSV file has headers but no data rows");
        return;
      }

      setRawData(parsed);

      // Auto-detect column mappings
      const detectedMapping = autoDetectMappings(parsed.rawHeaders);
      setColumnMapping(detectedMapping);
      setStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV file");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleMappingChange = useCallback((colIndex: number, fieldName: string) => {
    setColumnMapping((prev) => {
      const updated = { ...prev };

      // If the user selected "skip", set null
      if (fieldName === "__skip__") {
        updated[colIndex] = null;
        return updated;
      }

      // Remove the field from any other column that had it
      for (const key of Object.keys(updated)) {
        if (updated[parseInt(key)] === fieldName) {
          updated[parseInt(key)] = null;
        }
      }

      updated[colIndex] = fieldName;
      return updated;
    });
  }, []);

  const handleApplyMapping = useCallback(() => {
    if (!rawData) return;

    // Check that required fields are mapped
    const mappedFields = Object.values(columnMapping).filter(Boolean);
    const missingRequired = REQUIRED_FIELDS.filter((f) => !mappedFields.includes(f));

    if (missingRequired.length > 0) {
      setError(
        `Required fields not mapped: ${missingRequired.map((f) => FIELD_LABELS[f]).join(", ")}. Please map these columns before continuing.`
      );
      return;
    }

    setError(null);
    const result = validateMappedRows(rawData.rawRows, columnMapping);
    setValidationResult(result);
    setStep("preview");
  }, [rawData, columnMapping]);

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

  // Count how many fields are mapped
  const mappedFieldCount = Object.values(columnMapping).filter(Boolean).length;
  const requiredFieldsMapped = REQUIRED_FIELDS.every((f) =>
    Object.values(columnMapping).includes(f)
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file to import multiple contacts at once."}
            {step === "mapping" && "Map your CSV columns to contact fields. Required fields are marked with *."}
            {step === "preview" && "Review the parsed contacts before importing."}
            {step === "importing" && "Importing contacts..."}
            {step === "complete" && "Import finished!"}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        {step !== "complete" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <span className={cn("font-medium", step === "upload" && "text-primary")}>
              1. Upload
            </span>
            <ArrowRight className="h-3 w-3" />
            <span className={cn("font-medium", step === "mapping" && "text-primary")}>
              2. Map Columns
            </span>
            <ArrowRight className="h-3 w-3" />
            <span className={cn("font-medium", step === "preview" && "text-primary")}>
              3. Preview
            </span>
            <ArrowRight className="h-3 w-3" />
            <span className={cn("font-medium", step === "importing" && "text-primary")}>
              4. Import
            </span>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
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
                  or click to browse (max 10MB)
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

              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Need a template?</span>
                  <Button variant="outline" size="sm" onClick={downloadSampleCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample CSV
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Required columns: First Name, Last Name
                  <br />
                  Optional: Email, Phone, Contact Type, Company, Notes, Address, City, State, Zip Code
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === "mapping" && rawData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Columns className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {file?.name} &mdash; {rawData.rawRows.length} rows, {rawData.rawHeaders.length} columns
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant={requiredFieldsMapped ? "default" : "destructive"} className="gap-1">
                  {requiredFieldsMapped ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {requiredFieldsMapped ? "Required fields mapped" : "Required fields missing"}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  {mappedFieldCount} of {rawData.rawHeaders.length} columns mapped
                </Badge>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}

              <div className="border rounded-lg">
                <ScrollArea className="h-[350px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">CSV Column</TableHead>
                        <TableHead className="w-[200px]">Maps To</TableHead>
                        <TableHead>Sample Data (first 3 rows)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawData.rawHeaders.map((header, colIdx) => {
                        const currentField = columnMapping[colIdx] || null;
                        // Determine which fields are already used by other columns
                        const usedByOthers = new Set(
                          Object.entries(columnMapping)
                            .filter(([idx, val]) => parseInt(idx) !== colIdx && val)
                            .map(([, val]) => val as string)
                        );

                        return (
                          <TableRow key={colIdx}>
                            <TableCell className="font-medium">
                              {header}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={currentField || "__skip__"}
                                onValueChange={(val) => handleMappingChange(colIdx, val)}
                              >
                                <SelectTrigger className="w-full h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__skip__">
                                    <span className="text-muted-foreground">-- Skip --</span>
                                  </SelectItem>
                                  {ALL_FIELDS.map((field) => {
                                    const isUsed = usedByOthers.has(field);
                                    const isRequired = REQUIRED_FIELDS.includes(field);
                                    return (
                                      <SelectItem
                                        key={field}
                                        value={field}
                                        disabled={isUsed}
                                      >
                                        {FIELD_LABELS[field]}{isRequired ? " *" : ""}
                                        {isUsed ? " (mapped)" : ""}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {rawData.rawRows.slice(0, 3).map((row, i) => (
                                <span key={i}>
                                  {row[colIdx] || <span className="italic">empty</span>}
                                  {i < Math.min(rawData.rawRows.length - 1, 2) ? " | " : ""}
                                </span>
                              ))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && validationResult && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {validationResult.valid.length} valid
                </Badge>
                {validationResult.invalid.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {validationResult.invalid.length} invalid (will be skipped)
                  </Badge>
                )}
                {validationResult.duplicates.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {validationResult.duplicates.length} duplicates
                  </Badge>
                )}
              </div>

              <div className="border rounded-lg">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Status</TableHead>
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

          {/* Step 4: Importing */}
          {step === "importing" && (
            <div className="py-8 space-y-4">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <p className="text-center font-medium">
                Importing {progress.total} contacts...
              </p>
              <Progress
                value={progress.total > 0 ? (progress.imported / progress.total) * 100 : 0}
                className="w-full"
              />
              <p className="text-center text-sm text-muted-foreground">
                {progress.imported} imported, {progress.failed} failed
              </p>
            </div>
          )}

          {/* Step 5: Complete */}
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

          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => { setStep("upload"); setRawData(null); setError(null); }}>
                Back
              </Button>
              <Button
                onClick={handleApplyMapping}
                disabled={!requiredFieldsMapped}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Preview {rawData?.rawRows.length} Rows
              </Button>
            </>
          )}
          
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => { setStep("mapping"); setError(null); }}>
                Back to Mapping
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
