"use client";

import * as React from "react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { readStoredAuthState } from "@/lib/auth-storage";
import {
  CircleHelpIcon,
  CircleUserRoundIcon,
  CommandIcon,
  CreditCardIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  FileIcon,
  FolderIcon,
  LayoutDashboardIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react";

const navigation = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Sites",
      url: "/sites",
      icon: <FolderIcon />,
    },
    {
      title: "Billing",
      url: "/billing",
      icon: <CreditCardIcon />,
    },
    {
      title: "Profile",
      url: "/settings/profile",
      icon: <CircleUserRoundIcon />,
    },
    {
      title: "Security",
      url: "/settings/security",
      icon: <ShieldCheckIcon />,
    },
  ],
  navSecondary: [
    {
      title: "Help",
      url: "/help",
      icon: <CircleHelpIcon />,
    },
    {
      title: "Subscription",
      url: "/dashboard/subscription",
      icon: <CreditCardIcon />,
    },
    {
      title: "Pricing",
      url: "/pricing",
      icon: <SearchIcon />,
    },
  ],
  documents: [
    {
      name: "Page Manager",
      url: "/sites",
      icon: <DatabaseIcon />,
    },
    {
      name: "Billing Status",
      url: "/dashboard/billing",
      icon: <FileChartColumnIcon />,
    },
    {
      name: "Leads",
      url: "/dashboard/leads",
      icon: <FileIcon />,
    },
    {
      name: "Pricing Guide",
      url: "/pricing",
      icon: <FileIcon />,
    },
  ],
};

const defaultUser = {
  name: "FinnWeb user",
  email: "customer@finnweb.app",
  avatar: "",
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/dashboard" />}
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">FinnWeb</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigation.navMain} />
        <NavDocuments items={navigation.documents} />
        <NavSecondary items={navigation.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
