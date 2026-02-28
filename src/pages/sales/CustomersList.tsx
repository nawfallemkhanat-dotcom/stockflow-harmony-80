import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/shared/PageHeader";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  ice: string | null;
  address: string | null;
}

const CustomersList = () => {
  const { currentWorkspace } = useWorkspace();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formIce, setFormIce] = useState("");
  const [formAddress, setFormAddress] = useState("");

  const loadCustomers = async () => {
    if (!currentWorkspace) return;
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, contact_name, email, phone, ice, address")
      .eq("workspace_id", currentWorkspace.id)
      .order("name");
    if (!error) setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => { loadCustomers(); }, [currentWorkspace]);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.ice || "").toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormName(""); setFormContact(""); setFormEmail("");
    setFormPhone(""); setFormIce(""); setFormAddress("");
    setEditingId(null);
  };

  const handleAdd = () => { resetForm(); setDialogOpen(true); };

  const handleEdit = (c: Customer) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormContact(c.contact_name || "");
    setFormEmail(c.email || "");
    setFormPhone(c.phone || "");
    setFormIce(c.ice || "");
    setFormAddress(c.address || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentWorkspace || !formName.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    const payload = {
      workspace_id: currentWorkspace.id,
      name: formName.trim(),
      contact_name: formContact || null,
      email: formEmail || null,
      phone: formPhone || null,
      ice: formIce || null,
      address: formAddress || null,
    };

    if (editingId) {
      const { error } = await supabase.from("customers").update(payload).eq("id", editingId);
      if (error) toast.error(error.message);
      else { toast.success("Customer updated"); setDialogOpen(false); await loadCustomers(); }
    } else {
      const { error } = await supabase.from("customers").insert(payload);
      if (error) toast.error(error.message);
      else { toast.success("Customer created"); setDialogOpen(false); await loadCustomers(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Customer deleted"); await loadCustomers(); }
  };

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
        title="Customers"
        description="Manage your customer contacts"
        onAdd={handleAdd}
        addLabel="Add Customer"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            {customers.length === 0
              ? 'No customers yet. Click "Add Customer" to get started.'
              : "No customers match your search."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>ICE</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.contact_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.ice || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(c)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Company name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={formContact} onChange={(e) => setFormContact(e.target.value)} placeholder="Contact name" />
              </div>
              <div className="space-y-2">
                <Label>ICE</Label>
                <Input value={formIce} onChange={(e) => setFormIce(e.target.value)} placeholder="ICE number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+212 ..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Full address" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default CustomersList;
