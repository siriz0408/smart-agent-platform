import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface DataExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportFormat = "csv" | "json";
type DataType = "contacts" | "properties" | "deals";

export function DataExportDialog({ open, onOpenChange }: DataExportDialogProps) {
  const [selectedData, setSelectedData] = useState<DataType[]>(["contacts"]);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const toggleDataType = (type: DataType) => {
    setSelectedData((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Handle null/undefined
            if (value === null || value === undefined) return "";
            // Handle arrays and objects
            if (typeof value === "object") {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            // Handle strings with commas, quotes, or newlines
            const str = String(value);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      ),
    ].join("\n");

    downloadFile(csvRows, `${filename}.csv`, "text/csv");
  };

  const exportToJSON = (data: Record<string, unknown>[], filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    downloadFile(jsonStr, `${filename}.json`, "application/json");
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (selectedData.length === 0) {
      toast.error("No data selected", { description: "Please select at least one data type to export." });
      return;
    }

    setIsExporting(true);
    setExportComplete(false);

    try {
      const timestamp = new Date().toISOString().split("T")[0];

      for (const dataType of selectedData) {
        let data: Record<string, unknown>[] = [];
        let filename = "";

        switch (dataType) {
          case "contacts": {
            const { data: contacts, error } = await supabase
              .from("contacts")
              .select("id, first_name, last_name, email, phone, company, contact_type, status, tags, notes, created_at, updated_at")
              .order("created_at", { ascending: false });
            if (error) throw error;
            data = (contacts || []).map((c) => ({
              ...c,
              tags: c.tags?.join("; ") || "",
            }));
            filename = `contacts_export_${timestamp}`;
            break;
          }
          case "properties": {
            const { data: properties, error } = await supabase
              .from("properties")
              .select("id, address, city, state, zip_code, property_type, status, bedrooms, bathrooms, square_feet, price, description, created_at, updated_at")
              .order("created_at", { ascending: false });
            if (error) throw error;
            data = (properties || []) as Record<string, unknown>[];
            filename = `properties_export_${timestamp}`;
            break;
          }
          case "deals": {
            const { data: deals, error } = await supabase
              .from("deals")
              .select(`
                id, deal_type, stage, estimated_value, commission_rate,
                expected_close_date, actual_close_date, notes, created_at, updated_at,
                contacts(first_name, last_name, email),
                properties(address, city, state)
              `)
              .order("created_at", { ascending: false });
            if (error) throw error;
            data = (deals || []).map((d) => ({
              id: d.id,
              deal_type: d.deal_type,
              stage: d.stage,
              estimated_value: d.estimated_value,
              commission_rate: d.commission_rate,
              expected_close_date: d.expected_close_date,
              actual_close_date: d.actual_close_date,
              notes: d.notes,
              contact_name: d.contacts ? `${d.contacts.first_name} ${d.contacts.last_name}` : "",
              contact_email: d.contacts?.email || "",
              property_address: d.properties ? `${d.properties.address}, ${d.properties.city}, ${d.properties.state}` : "",
              created_at: d.created_at,
              updated_at: d.updated_at,
            }));
            filename = `deals_export_${timestamp}`;
            break;
          }
        }

        if (data.length > 0) {
          if (format === "csv") {
            exportToCSV(data, filename);
          } else {
            exportToJSON(data, filename);
          }
        }
      }

      setExportComplete(true);
      toast.success("Export complete", { description: `Successfully exported ${selectedData.length} data type(s) as ${format.toUpperCase()}.` });

      // Reset after a delay
      setTimeout(() => {
        setExportComplete(false);
      }, 3000);
    } catch (error) {
      logger.error("Export error:", error);
      toast.error("Export failed", { description: error instanceof Error ? error.message : "An error occurred during export." });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </DialogTitle>
          <DialogDescription>
            Download your data in CSV or JSON format. You own your data - export it anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Data Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select data to export</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contacts"
                  checked={selectedData.includes("contacts")}
                  onCheckedChange={() => toggleDataType("contacts")}
                />
                <Label htmlFor="contacts" className="text-sm font-normal cursor-pointer">
                  Contacts
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="properties"
                  checked={selectedData.includes("properties")}
                  onCheckedChange={() => toggleDataType("properties")}
                />
                <Label htmlFor="properties" className="text-sm font-normal cursor-pointer">
                  Properties
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="deals"
                  checked={selectedData.includes("deals")}
                  onCheckedChange={() => toggleDataType("deals")}
                />
                <Label htmlFor="deals" className="text-sm font-normal cursor-pointer">
                  Deals (with related contact & property info)
                </Label>
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  CSV (Excel compatible)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                  <FileJson className="h-4 w-4 text-blue-600" />
                  JSON (for developers)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedData.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : exportComplete ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Downloaded!
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {selectedData.length > 0 ? `(${selectedData.length})` : ""}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
