import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

export interface ContactImportRow {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  contact_type?: string;
  company?: string;
  notes?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export interface ImportValidationResult {
  valid: ContactImportRow[];
  invalid: { row: number; errors: string[]; data: Record<string, string> }[];
  duplicates: { row: number; email: string }[];
}

export interface ImportProgress {
  total: number;
  imported: number;
  failed: number;
  status: "idle" | "validating" | "importing" | "complete" | "error";
}

const REQUIRED_FIELDS = ["first_name", "last_name"];
const OPTIONAL_FIELDS = ["email", "phone", "contact_type", "company", "notes", "address", "city", "state", "zip_code"];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

// Common CSV column name mappings
const COLUMN_MAPPINGS: Record<string, string> = {
  "first name": "first_name",
  "firstname": "first_name",
  "first": "first_name",
  "last name": "last_name",
  "lastname": "last_name",
  "last": "last_name",
  "e-mail": "email",
  "email address": "email",
  "phone number": "phone",
  "mobile": "phone",
  "cell": "phone",
  "type": "contact_type",
  "category": "contact_type",
  "organization": "company",
  "business": "company",
  "street": "address",
  "street address": "address",
  "zip": "zip_code",
  "postal": "zip_code",
  "postal code": "zip_code",
};

function normalizeColumnName(name: string): string {
  const lower = name.toLowerCase().trim();
  return COLUMN_MAPPINGS[lower] || lower.replace(/\s+/g, "_");
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse header row
  const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const headers = rawHeaders.map(normalizeColumnName);

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every((v) => !v.trim())) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim().replace(/^"|"$/g, "") || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function validateEmail(email: string): boolean {
  if (!email) return true; // Empty is OK (optional)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  if (!phone) return true; // Empty is OK (optional)
  // Allow various phone formats, strip non-digits and check length
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function useContactImport() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    imported: 0,
    failed: 0,
    status: "idle",
  });

  const validateCSV = useCallback(async (file: File): Promise<ImportValidationResult> => {
    setProgress({ total: 0, imported: 0, failed: 0, status: "validating" });

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    // Check for required columns
    const missingColumns = REQUIRED_FIELDS.filter(
      (field) => !headers.includes(field)
    );
    if (missingColumns.length > 0) {
      throw new Error(
        `Missing required columns: ${missingColumns.join(", ")}. ` +
        `Expected columns: ${REQUIRED_FIELDS.join(", ")} (required), ` +
        `${OPTIONAL_FIELDS.join(", ")} (optional)`
      );
    }

    const valid: ContactImportRow[] = [];
    const invalid: ImportValidationResult["invalid"] = [];
    const duplicates: ImportValidationResult["duplicates"] = [];
    const seenEmails = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const errors: string[] = [];

      // Check required fields
      if (!row.first_name?.trim()) errors.push("First name is required");
      if (!row.last_name?.trim()) errors.push("Last name is required");

      // Validate email
      if (row.email && !validateEmail(row.email)) {
        errors.push("Invalid email format");
      }

      // Validate phone
      if (row.phone && !validatePhone(row.phone)) {
        errors.push("Invalid phone format");
      }

      // Check for duplicate emails within the file
      if (row.email) {
        const emailLower = row.email.toLowerCase();
        if (seenEmails.has(emailLower)) {
          duplicates.push({ row: i + 2, email: row.email }); // +2 for 1-indexed and header row
        } else {
          seenEmails.add(emailLower);
        }
      }

      if (errors.length > 0) {
        invalid.push({ row: i + 2, errors, data: row });
      } else {
        valid.push({
          first_name: row.first_name.trim(),
          last_name: row.last_name.trim(),
          email: row.email?.trim() || undefined,
          phone: row.phone?.trim() || undefined,
          contact_type: row.contact_type?.trim() || "lead",
          company: row.company?.trim() || undefined,
          notes: row.notes?.trim() || undefined,
          address: row.address?.trim() || undefined,
          city: row.city?.trim() || undefined,
          state: row.state?.trim() || undefined,
          zip_code: row.zip_code?.trim() || undefined,
        });
      }
    }

    setProgress({ total: rows.length, imported: 0, failed: 0, status: "idle" });
    return { valid, invalid, duplicates };
  }, []);

  const importMutation = useMutation({
    mutationFn: async (contacts: ContactImportRow[]) => {
      setProgress({
        total: contacts.length,
        imported: 0,
        failed: 0,
        status: "importing",
      });

      const results = { imported: 0, failed: 0, errors: [] as string[] };

      // Import in batches of 50 for better performance
      const batchSize = 50;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from("contacts")
          .insert(batch)
          .select("id");

        if (error) {
          results.failed += batch.length;
          results.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          results.imported += data?.length || 0;
          results.failed += batch.length - (data?.length || 0);
        }

        setProgress((prev) => ({
          ...prev,
          imported: results.imported,
          failed: results.failed,
        }));
      }

      return results;
    },
    onSuccess: (results) => {
      setProgress((prev) => ({ ...prev, status: "complete" }));
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      trackEvent("contact_created", {
        count: results.imported,
        source: "csv_import",
      });
      toast.success("Import complete", { description: `Successfully imported ${results.imported} contacts${
          results.failed > 0 ? `. ${results.failed} failed.` : ""
        }` });
    },
    onError: (error) => {
      setProgress((prev) => ({ ...prev, status: "error" }));
      toast.error("Import failed", { description: error instanceof Error ? error.message : "Unknown error" });
    },
  });

  const importContacts = useCallback(
    (contacts: ContactImportRow[]) => {
      return importMutation.mutateAsync(contacts);
    },
    [importMutation]
  );

  const resetProgress = useCallback(() => {
    setProgress({ total: 0, imported: 0, failed: 0, status: "idle" });
  }, []);

  return {
    validateCSV,
    importContacts,
    progress,
    resetProgress,
    isImporting: importMutation.isPending,
  };
}

// Export sample CSV template content
export const SAMPLE_CSV_CONTENT = `first_name,last_name,email,phone,contact_type,company,notes,address,city,state,zip_code
John,Smith,john.smith@example.com,(555) 123-4567,lead,ABC Realty,Looking for 3+ bedrooms,123 Main St,Denver,CO,80202
Jane,Doe,jane.doe@example.com,(555) 987-6543,client,XYZ Corp,Budget: $500k,456 Oak Ave,Boulder,CO,80301`;
