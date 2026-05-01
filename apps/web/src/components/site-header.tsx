"use client";

import { BellIcon, PlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type SiteHeaderProps = {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
};

export function SiteHeader({
  title = "Workspace",
  description,
  actions,
}: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-(--header-height) shrink-0 border-b bg-background/90 backdrop-blur-lg transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-2 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 h-4 data-vertical:self-auto"
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">{title}</h1>
              {description ? (
                <p className="truncate text-xs text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="hidden max-w-md flex-1 items-center gap-2 rounded-full border border-border/70 bg-black/10 px-3 transition focus-within:border-primary/60 md:flex">
            <SearchIcon className="text-muted-foreground" />
            <Input
              placeholder="ค้นหาเว็บไซต์, ลูกค้า หรือข้อมูลบิล..."
              className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions ? <div className="hidden lg:block">{actions}</div> : null}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground transition hover:scale-105 hover:text-foreground"
            aria-label="Notifications"
          >
            <BellIcon />
            <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
          </Button>
          <Button
            className="bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground shadow-[0_10px_24px_-16px_rgba(255,140,0,0.95)] transition hover:-translate-y-0.5 hover:opacity-95"
            onClick={() => window.location.assign("/sites")}
          >
            <PlusIcon data-icon="inline-start" />
            สร้างเว็บใหม่
          </Button>
        </div>
      </div>
    </header>
  );
}
