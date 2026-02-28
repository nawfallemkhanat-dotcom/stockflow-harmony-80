import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Workspace {
  id: string;
  name: string;
  country_code: string;
  currency: string;
  tax_label: string;
}

interface Membership {
  workspace_id: string;
  role: "owner" | "admin" | "staff" | "viewer";
  workspace: Workspace;
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  currentRole: string | null;
  memberships: Membership[];
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  currentWorkspace: null,
  currentRole: null,
  memberships: [],
  loading: true,
});

export const useWorkspace = () => useContext(WorkspaceContext);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMemberships([]);
      setCurrentWorkspace(null);
      setCurrentRole(null);
      setLoading(false);
      return;
    }

    const fetchMemberships = async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("workspace_id, role, workspaces(*)")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching memberships:", error);
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((m: any) => ({
        workspace_id: m.workspace_id,
        role: m.role,
        workspace: m.workspaces,
      }));

      setMemberships(mapped);

      if (mapped.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(mapped[0].workspace);
        setCurrentRole(mapped[0].role);
      }
      setLoading(false);
    };

    fetchMemberships();
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{ currentWorkspace, currentRole, memberships, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
