import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Loader2, FileText, Banknote, Clock } from "lucide-react";
import { format } from "date-fns";

interface Quote {
  id: string;
  quote_number: string;
  status: string;
  subtotal: number;
  tax_total: number;
  total: number;
  valid_until: string | null;
  created_at: string;
  customers: { name: string } | null;
}

const QuotesList = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!currentWorkspace) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, quote_number, status, subtotal, tax_total, total, valid_until, created_at, customers(name)")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (!error) setQuotes((data || []) as any);
      setLoading(false);
    };
    load();
  }, [currentWorkspace]);

  const filtered = quotes.filter((q) =>
    q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
    q.customers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = quotes.reduce((s, q) => s + Number(q.total), 0);
  const draftCount = quotes.filter((q) => q.status === "draft").length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Quotes"
        description="Manage proposals and estimates for customers"
        onAdd={() => navigate("/billing/quotes/new")}
        addLabel="New Quote"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Quotes" value={String(quotes.length)} icon={FileText} />
        <StatCard title="Drafts" value={String(draftCount)} icon={Clock} />
        <StatCard title={`Total Value (${currentWorkspace?.currency})`} value={totalValue.toFixed(0)} icon={Banknote} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            {quotes.length === 0
              ? 'No quotes yet. Click "New Quote" to create one.'
              : "No quotes match your search."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total ({currentWorkspace?.currency})</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((q) => (
                <TableRow
                  key={q.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/billing/quotes/${q.id}`)}
                >
                  <TableCell className="font-mono font-medium">{q.quote_number}</TableCell>
                  <TableCell>{q.customers?.name || "—"}</TableCell>
                  <TableCell><StatusBadge status={q.status} /></TableCell>
                  <TableCell className="text-right font-mono font-semibold">{Number(q.total).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {q.valid_until ? format(new Date(q.valid_until), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(q.created_at), "dd MMM yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
};

export default QuotesList;
