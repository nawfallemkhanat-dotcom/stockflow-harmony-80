import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkspaceSettings from "./WorkspaceSettings";
import MemberManagement from "./MemberManagement";
import TaxRateManagement from "./TaxRateManagement";

const SettingsPage = () => {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your workspace configuration</p>
      </div>

      <Tabs defaultValue="workspace" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="tax-rates">Tax Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace">
          <WorkspaceSettings />
        </TabsContent>
        <TabsContent value="members">
          <MemberManagement />
        </TabsContent>
        <TabsContent value="tax-rates">
          <TaxRateManagement />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default SettingsPage;
