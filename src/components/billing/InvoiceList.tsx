import { FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoices, type Invoice } from "@/hooks/useInvoices";

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          Paid
        </Badge>
      );
    case "open":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
          Open
        </Badge>
      );
    case "void":
      return (
        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
          Void
        </Badge>
      );
    case "uncollectible":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
          Uncollectible
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">{status || "Unknown"}</Badge>
      );
  }
}

export function InvoiceList() {
  const { invoices, isLoading, error } = useInvoices();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Failed to load invoices. Please try again later.</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>No invoices yet</p>
        <p className="text-sm">Your invoices will appear here after your first payment.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice: Invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">
              {formatDate(invoice.date)}
            </TableCell>
            <TableCell>
              {invoice.number && (
                <span className="text-muted-foreground mr-2">
                  #{invoice.number}
                </span>
              )}
              {invoice.description || "Subscription"}
            </TableCell>
            <TableCell>
              {formatAmount(invoice.amount, invoice.currency)}
            </TableCell>
            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {invoice.pdf && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a
                      href={invoice.pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download PDF"
                      aria-label="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {invoice.hostedUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a
                      href={invoice.hostedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View Invoice"
                      aria-label="View invoice"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
