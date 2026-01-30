import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Invoice {
  id: string;
  number: string | null;
  date: number;
  description: string | null;
  amount: number;
  currency: string;
  status: string | null;
  pdf: string | null;
  hostedUrl: string | null;
}

export function useInvoices() {
  const invoicesQuery = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const response = await supabase.functions.invoke<{ invoices: Invoice[] }>(
        "list-invoices"
      );

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data?.invoices || [];
    },
    // Don't refetch too often
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    invoices: invoicesQuery.data || [],
    isLoading: invoicesQuery.isLoading,
    error: invoicesQuery.error,
    refetch: invoicesQuery.refetch,
  };
}
