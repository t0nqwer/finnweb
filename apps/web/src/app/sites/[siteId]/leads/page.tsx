"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  InboxIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  MessageSquareIcon,
} from "lucide-react";
import { AppPageShell } from "@/components/app-page-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
} from "@/lib/api-client";
import { readStoredAuthState } from "@/lib/auth-storage";

type LeadContact = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  message?: string | null;
};

type LeadRecord = {
  id: string;
  createdAt: string;
  contact: LeadContact;
  page: {
    id: string;
    title: string;
    slug: string;
  } | null;
  form: {
    id: string;
    name: string;
  };
};

type LeadsData = {
  site: { id: string; name: string; slug: string };
  items: LeadRecord[];
  total: number;
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function SiteLeadsPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [siteName, setSiteName] = useState<string>("");

  const apiBaseUrl = useMemo(() => {
    const stored = readStoredAuthState();
    return stored.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  }, []);

  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { response, payload } = await fetchApiWithTokenRefresh<{
        success?: boolean;
        data?: LeadsData;
      }>({
        apiBaseUrl,
        path: `/sites/${siteId}/leads?limit=100`,
        init: { cache: "no-store" },
      });

      if (!response.ok) {
        throw new Error("โหลดข้อมูล leads ไม่สำเร็จ");
      }

      if (
        typeof payload === "object" &&
        payload &&
        "data" in payload &&
        payload.data
      ) {
        const data = payload.data;
        setSiteName(data.site.name);
        setLeads(data.items);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
      );
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, siteId]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  return (
    <AppPageShell
      title="Leads"
      description={
        siteName
          ? `ข้อมูลผู้ติดต่อของ ${siteName}`
          : "ข้อมูลผู้ติดต่อที่ส่งเข้ามา"
      }
    >
      <div className="px-4 md:px-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : errorMessage ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-6 text-sm text-red-600">
              {errorMessage}
            </CardContent>
          </Card>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <InboxIcon className="mb-4 size-12 text-slate-300" />
            <p className="font-kanit text-lg font-semibold text-slate-500">
              ยังไม่มี leads
            </p>
            <p className="mt-1 text-sm text-slate-400">
              เมื่อผู้เยี่ยมชมกรอกฟอร์มติดต่อ จะปรากฏที่นี่
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              ทั้งหมด {leads.length} รายการ
            </p>
            {leads.map((lead) => (
              <Card key={lead.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserIcon className="size-4 shrink-0 text-slate-400" />
                      <CardTitle className="font-kanit text-base">
                        {lead.contact.name ?? "—"}
                      </CardTitle>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs text-slate-400">
                        {formatDate(lead.createdAt)}
                      </span>
                      {lead.page ? (
                        <Badge variant="outline" className="text-xs">
                          {lead.page.title}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <CardDescription className="mt-1 space-y-1 pl-6">
                    {lead.contact.phone ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <PhoneIcon className="size-3 text-slate-400" />
                        {lead.contact.phone}
                      </span>
                    ) : null}
                    {lead.contact.email ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <MailIcon className="size-3 text-slate-400" />
                        {lead.contact.email}
                      </span>
                    ) : null}
                  </CardDescription>
                </CardHeader>
                {lead.contact.message ? (
                  <CardContent className="pb-4">
                    <div className="flex gap-2 rounded-lg bg-slate-50 p-3">
                      <MessageSquareIcon className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      <p className="text-sm leading-6 text-slate-600">
                        {lead.contact.message}
                      </p>
                    </div>
                  </CardContent>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppPageShell>
  );
}
