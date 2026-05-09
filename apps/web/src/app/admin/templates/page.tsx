import { AppPageShell } from "@/components/app-page-shell";
import { AdminTemplatesDashboard } from "@/features/admin/AdminTemplatesDashboard";

export default function AdminTemplatesPage() {
  return (
    <AppPageShell
      title="Admin Templates"
      description="Manage website templates, section templates, quality signals, and app control areas."
    >
      <AdminTemplatesDashboard />
    </AppPageShell>
  );
}
