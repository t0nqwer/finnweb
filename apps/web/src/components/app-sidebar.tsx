"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { clearAuthState, readStoredAuthState } from "@/lib/auth-storage";
import {
  FlameIcon,
  CreditCardIcon,
  GlobeIcon,
  LogOutIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

type SidebarNavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

const mainNavigation: SidebarNavItem[] = [
  {
    title: "ภาพรวม",
    url: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    title: "เว็บไซต์ของคุณ",
    url: "/sites",
    icon: GlobeIcon,
  },
  {
    title: "รายชื่อลูกค้า",
    url: "/dashboard/leads",
    icon: UsersIcon,
  },
  {
    title: "การสมัครสมาชิก",
    url: "/dashboard/subscription",
    icon: CreditCardIcon,
  },
];

const utilityNavigation: SidebarNavItem[] = [
  {
    title: "บัญชีผู้ใช้",
    url: "/settings/profile",
    icon: SettingsIcon,
  },
  {
    title: "ความปลอดภัย",
    url: "/settings/security",
    icon: ShieldCheckIcon,
  },
];

const defaultUser = {
  name: "FinnWeb user",
  email: "customer@finnweb.app",
  avatar: "",
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState(defaultUser);

  React.useEffect(() => {
    const stored = readStoredAuthState();

    if (stored.user) {
      setUser({
        name: stored.user.name ?? "FinnWeb user",
        email: stored.user.email,
        avatar: stored.user.avatarUrl ?? "",
      });
    }
  }, []);

  const initials = React.useMemo(() => {
    return user.name
      .split(" ")
      .map((value) => value.trim()[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user.name]);

  const adminNavigation = React.useMemo<SidebarNavItem[]>(() => {
    if (user.email === defaultUser.email) {
      return [];
    }

    const stored = readStoredAuthState();
    if (stored.user?.role !== "ADMIN") {
      return [];
    }

    return [
      {
        title: "Admin Templates",
        url: "/admin/templates",
        icon: SparklesIcon,
      },
    ];
  }, [user.email]);

  function handleLogout() {
    clearAuthState();
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-sidebar-border/70"
      {...props}
    >
      <SidebarHeader className="px-4 py-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-12 rounded-xl px-3"
              render={<a href="/dashboard" />}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-[#ff4500] text-primary-foreground">
                <FlameIcon className="size-4" />
              </span>
              <span className="text-lg font-bold tracking-tight">FinnWeb</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 pb-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] tracking-wide text-sidebar-foreground/50 uppercase">
            Workspace
          </SidebarGroupLabel>
          <SidebarMenu>
            {mainNavigation.map((item) => {
              const isActive =
                pathname === item.url ||
                (item.url !== "/dashboard" && pathname.startsWith(item.url));
              const Icon = item.icon;

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive}
                    render={<a href={item.url} />}
                    className="h-11 rounded-xl px-3 transition data-active:bg-linear-to-r data-active:from-primary data-active:to-[#ff6a00] data-active:text-primary-foreground data-active:shadow-[0_10px_26px_-18px_rgba(255,140,0,0.95)] hover:translate-x-0.5"
                  >
                    <Icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {adminNavigation.length > 0 ? (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="px-3 text-[11px] tracking-wide text-sidebar-foreground/50 uppercase">
              Admin
            </SidebarGroupLabel>
            <SidebarMenu>
              {adminNavigation.map((item) => {
                const isActive =
                  pathname === item.url || pathname.startsWith(item.url);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<a href={item.url} />}
                      className="h-10 rounded-xl px-3 transition data-active:bg-sidebar-accent hover:translate-x-0.5"
                    >
                      <Icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ) : null}

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-3 text-[11px] tracking-wide text-sidebar-foreground/50 uppercase">
            จัดการบัญชี
          </SidebarGroupLabel>
          <SidebarMenu>
            {utilityNavigation.map((item) => {
              const isActive =
                pathname === item.url ||
                (item.url !== "/settings/profile" &&
                  pathname.startsWith(item.url));
              const Icon = item.icon;

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive}
                    render={<a href={item.url} />}
                    className="h-10 rounded-xl px-3 transition data-active:bg-sidebar-accent hover:translate-x-0.5"
                  >
                    <Icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/70 px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl bg-black/15 px-3 py-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-[#ff8c00] to-[#ff4500] text-xs font-semibold text-white">
            {initials || "FW"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-destructive"
            aria-label="Log out"
          >
            <LogOutIcon className="size-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
