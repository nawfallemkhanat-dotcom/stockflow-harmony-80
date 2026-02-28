import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  is_default: boolean;
  active: boolean;
  country_code: string;
}

const TaxRateManagement = () => {
  const { currentWorkspace, currentRole } = useWorkspace();
  const { toast } = useToast();
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("");
  const [adding, setAdding] = useState(false);

  const canManage = currentRole === "owner" || currentRole === "admin";

  const fetchRates = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tax_rates")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("rate", { ascending: false });

    if (!error) setRates((data || []) as TaxRate[]);
    setLoading(false);
  };

  useEffect(() => { fetchRates(); }, [currentWorkspace]);

  const handleToggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("tax_rates").update({ active }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchRates();
  };

  const handleSetDefault = async (id: string) => {
    if (!currentWorkspace) return;
    // Unset all defaults first
    await supabase.from("tax_rates").update({ is_default: false }).eq("workspace_id", currentWorkspace.id);
    await supabase.from("tax_rates").update({ is_default: true }).eq("id", id);
    toast({ title: "Updated", description: "Default tax rate changed." });
    fetchRates();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tax_rates").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Deleted" });
      fetchRates();
    }
  };

  const handleAdd = async () => {
    if (!currentWorkspace || !newName.trim() || !newRate) return;
    setAdding(true);
    const { error } = await supabase.from("tax_rates").insert({
      workspace_id: currentWorkspace.id,
      name: newName.trim(),
      rate: parseFloat(newRate),
      country_code: currentWorkspace.country_code,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Added", description: "Tax rate created." });
      setAddOpen(false);
      setNewName("");
      setNewRate("");
      fetchRates();
    }
    setAdding(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Tax Rates</CardTitle>
          <CardDescription>Configure tax rates used across invoices and orders</CardDescription>
        </div>
        {canManage && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Rate</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Tax Rate</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="e.g. TVA 20%" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Rate (%)</Label>
                  <Input type="number" placeholder="20" value={newRate} onChange={(e) => setNewRate(e.target.value)} />
                </div>
                <Button onClick={handleAdd} disabled={adding} className="w-full">
                  {adding ? "Adding..." : "Create Tax Rate"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Active</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.rate}%</TableCell>
                  <TableCell>
                    {r.is_default ? (
                      <Badge>Default</Badge>
                    ) : canManage ? (
                      <Button variant="ghost" size="sm" onClick={() => handleSetDefault(r.id)} className="text-xs text-muted-foreground">
                        Set default
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Switch checked={r.active} onCheckedChange={(v) => handleToggleActive(r.id, v)} disabled={!canManage} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {rates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No tax rates configured</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxRateManagement;
