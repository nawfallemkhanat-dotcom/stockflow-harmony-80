import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Loader2, FileText, Banknote } from "lucide-react";
import { format } from "date-fns";

interface CreditNote {
  id: string;
  credit_note_number: string;
  reason: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  created_at: string;
  invoice_id: string | null;
  customers: { name: string } | null;
}

const CreditNotesList = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!currentWorkspace) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("credit_notes")
        .select("id, credit_note_number, reason, subtotal, tax_total, total, created_at, invoice_id, customers(name)")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (!error) setNotes((data || []) as any);
      setLoading(false);
    };
    load();
  }, [currentWorkspace]);

  const filtered = notes.filter((cn) =>
    cn.credit_note_number.toLowerCase().includes(search.toLowerCase()) ||
    cn.customers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = notes.reduce((s, n) => s + Number(n.total), 0);

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
        title="Credit Notes"
        description="Manage refunds and credit adjustments"
        onAdd={() => navigate("/billing/credit-notes/new")}
        addLabel="New Credit Note"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Credit Notes" value={String(notes.length)} icon={FileText} />
        <StatCard title={`Total Value (${currentWorkspace?.currency})`} value={totalValue.toFixed(0)} icon={Banknote} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            {notes.length === 0
              ? 'No credit notes yet. Click "New Credit Note" to create one.'
              : "No credit notes match the search."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CN #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">{currentWorkspace?.tax_label}</TableHead>
                <TableHead className="text-right">Total ({currentWorkspace?.currency})</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((cn) => (
                <TableRow
                  key={cn.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/billing/credit-notes/${cn.id}`)}
                >
                  <TableCell className="font-mono font-medium">{cn.credit_note_number}</TableCell>
                  <TableCell>{cn.customers?.name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{cn.reason || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{Number(cn.subtotal).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(cn.tax_total).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{Number(cn.total).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(cn.created_at), "dd MMM yyyy")}
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

export default CreditNotesList;
