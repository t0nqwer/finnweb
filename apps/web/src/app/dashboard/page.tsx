import { AppPageShell } from "@/components/app-page-shell";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";

import data from "./data.json";

export default function Page() {
  return (
    <AppPageShell
      title="Dashboard"
      description="Track your workspace, sites, and recent activity."
    >
      <div className="flex flex-col gap-4 px-4 md:gap-6 lg:px-6">
        <SectionCards />
        <ChartAreaInteractive />
      </div>
      <div className="px-4 lg:px-6">
        <DataTable data={data} />
      </div>
    </AppPageShell>
  );
}
