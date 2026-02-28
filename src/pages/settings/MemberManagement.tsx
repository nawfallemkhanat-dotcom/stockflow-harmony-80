import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile_name: string | null;
  profile_email: string | null;
}

const ROLES = ["owner", "admin", "staff", "viewer"] as const;

const MemberManagement = () => {
  const { currentWorkspace, currentRole } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("staff");
  const [inviting, setInviting] = useState(false);

  const canManage = currentRole === "owner" || currentRole === "admin";

  const fetchMembers = async () => {
    if (!currentWorkspace) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("memberships")
      .select("id, user_id, role, created_at")
      .eq("workspace_id", currentWorkspace.id);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Fetch profiles for these users
    const userIds = (data || []).map((m: any) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

    const mapped: MemberRow[] = (data || []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      profile_name: profileMap.get(m.user_id) || null,
      profile_email: null,
    }));

    setMembers(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [currentWorkspace]);

  const handleRoleChange = async (membershipId: string, newRole: "owner" | "admin" | "staff" | "viewer") => {
    const { error } = await supabase
      .from("memberships")
      .update({ role: newRole })
      .eq("id", membershipId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Member role updated." });
      fetchMembers();
    }
  };

  const handleRemove = async (membershipId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
      toast({ title: "Error", description: "You cannot remove yourself.", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("memberships")
      .delete()
      .eq("id", membershipId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Removed", description: "Member removed from workspace." });
      fetchMembers();
    }
  };

  const handleInvite = async () => {
    if (!currentWorkspace || !inviteEmail.trim()) return;
    setInviting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await supabase.functions.invoke("invite-member", {
      body: { email: inviteEmail.trim(), workspace_id: currentWorkspace.id, role: inviteRole as "admin" | "staff" | "viewer" },
    });

    if (res.error || res.data?.error) {
      toast({ title: "Error", description: res.data?.error || res.error?.message, variant: "destructive" });
    } else {
      toast({ title: "Invited", description: `Member added with role "${inviteRole}".` });
      setInviteOpen(false);
      setInviteEmail("");
      fetchMembers();
    }
    setInviting(false);
  };

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner": return "default";
      case "admin": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Members</CardTitle>
          <CardDescription>Manage who has access to this workspace</CardDescription>
        </div>
        {canManage && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><UserPlus className="w-4 h-4" />Invite</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input placeholder="user@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleInvite} disabled={inviting} className="w-full">
                  {inviting ? "Inviting..." : "Send Invite"}
                </Button>
                <p className="text-xs text-muted-foreground">The user must have an existing account to be added.</p>
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
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.profile_name || "Unnamed User"}
                    {m.user_id === user?.id && <span className="text-xs text-muted-foreground ml-2">(you)</span>}
                  </TableCell>
                  <TableCell>
                    {canManage && m.user_id !== user?.id ? (
                      <Select value={m.role} onValueChange={(v) => handleRoleChange(m.id, v as "owner" | "admin" | "staff" | "viewer")}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={roleBadgeVariant(m.role) as any}>{m.role}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(m.created_at).toLocaleDateString()}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {m.user_id !== user?.id && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(m.id, m.user_id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberManagement;
