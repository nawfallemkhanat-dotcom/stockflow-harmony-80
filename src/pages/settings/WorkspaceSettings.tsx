import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const CURRENCIES = [
  { code: "MAD", label: "MAD – Moroccan Dirham" },
  { code: "EUR", label: "EUR – Euro" },
  { code: "USD", label: "USD – US Dollar" },
  { code: "GBP", label: "GBP – British Pound" },
  { code: "CAD", label: "CAD – Canadian Dollar" },
  { code: "TND", label: "TND – Tunisian Dinar" },
  { code: "DZD", label: "DZD – Algerian Dinar" },
  { code: "EGP", label: "EGP – Egyptian Pound" },
  { code: "SAR", label: "SAR – Saudi Riyal" },
  { code: "AED", label: "AED – UAE Dirham" },
];

const COUNTRIES = [
  { code: "MA", label: "Morocco" },
  { code: "FR", label: "France" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "TN", label: "Tunisia" },
  { code: "DZ", label: "Algeria" },
  { code: "EG", label: "Egypt" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "AE", label: "UAE" },
];

const WorkspaceSettings = () => {
  const { currentWorkspace, currentRole } = useWorkspace();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [taxLabel, setTaxLabel] = useState("");

  const canEdit = currentRole === "owner" || currentRole === "admin";

  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name);
      setCurrency(currentWorkspace.currency);
      setCountryCode(currentWorkspace.country_code);
      setTaxLabel(currentWorkspace.tax_label);
    }
  }, [currentWorkspace]);

  const handleSave = async () => {
    if (!currentWorkspace) return;
    setSaving(true);
    const { error } = await supabase
      .from("workspaces")
      .update({ name, currency, country_code: countryCode, tax_label: taxLabel })
      .eq("id", currentWorkspace.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Workspace settings updated." });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Workspace Configuration</CardTitle>
        <CardDescription>General settings for your workspace</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg">
        <div className="space-y-2">
          <Label>Workspace Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={countryCode} onValueChange={setCountryCode} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Tax Label</Label>
          <Input value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} disabled={!canEdit} placeholder="e.g. TVA, VAT, GST" />
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkspaceSettings;
