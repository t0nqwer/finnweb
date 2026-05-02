"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_API_BASE_URL } from "@/lib/api-client";
import { normalizeApiBaseUrl, readStoredAuthState } from "@/lib/auth-storage";
import {
  getSitePages,
  getSiteSections,
  reorderSiteSections,
  updateSiteSection,
  type SitePage,
  type SiteSection,
} from "../api/builder.api";
import type { BuilderSection } from "../registry/section-registry";
import { BuilderCanvas } from "./BuilderCanvas";
import { BuilderTopbar } from "./BuilderTopbar";
import type { BuilderPreviewDevice } from "./DevicePreviewToggle";
import type { SaveStatusState } from "./SaveStatus";
import { SectionEditPanel } from "./SectionEditPanel";
import { SectionListPanel } from "./SectionListPanel";

type BuilderShellProps = {
  siteId: string;
};

type PendingSave = {
  sectionId: string;
  pageId: string;
  props: Record<string, unknown>;
  version: number;
};

const AUTOSAVE_DELAY_MS = 800;

export function BuilderShell({ siteId }: BuilderShellProps) {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [device, setDevice] = useState<BuilderPreviewDevice>("desktop");
  const [pages, setPages] = useState<SitePage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatusState>("saved");
  const sectionsRef = useRef<BuilderSection[]>([]);
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const latestEditVersionRef = useRef(0);
  const latestVersionBySectionIdRef = useRef<Record<string, number>>({});
  const lastFailedSaveRef = useRef<PendingSave | null>(null);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  useEffect(() => {
    const saveTimers = saveTimersRef.current;
    return () => {
      Object.values(saveTimers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    const storedAuthState = readStoredAuthState();
    setApiBaseUrl(
      normalizeApiBaseUrl(storedAuthState.apiBaseUrl ?? DEFAULT_API_BASE_URL),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPages() {
      setIsLoadingPages(true);
      setErrorMessage(null);
      setActionMessage(null);

      try {
        const { data, authState } = await getSitePages({ apiBaseUrl, siteId });
        if (authState.apiBaseUrl) {
          setApiBaseUrl(normalizeApiBaseUrl(authState.apiBaseUrl));
        }
        if (cancelled) {
          return;
        }

        const nextPages = [...data].sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        );
        const defaultPage =
          nextPages.find((page) => page.isHomePage) ?? nextPages[0] ?? null;

        setPages(nextPages);
        setSaveStatus("saved");
        lastFailedSaveRef.current = null;
        setSelectedPageId((current) =>
          current && nextPages.some((page) => page.id === current)
            ? current
            : defaultPage?.id ?? "",
        );
      } catch (error) {
        if (!cancelled) {
          setPages([]);
          setSelectedPageId("");
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load pages for this site.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPages(false);
        }
      }
    }

    void loadPages();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, siteId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSections() {
      if (!selectedPageId) {
        setSections([]);
        setSelectedSectionId("");
        return;
      }

      setIsLoadingSections(true);
      setErrorMessage(null);
      setActionMessage(null);

      try {
        const { data, authState } = await getSiteSections({
          apiBaseUrl,
          siteId,
          pageId: selectedPageId,
        });
        if (authState.apiBaseUrl) {
          setApiBaseUrl(normalizeApiBaseUrl(authState.apiBaseUrl));
        }
        if (cancelled) {
          return;
        }

        const nextSections = data
          .map((section) => mapSiteSectionToBuilderSection(section, selectedPageId))
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        setSections(nextSections);
        setSaveStatus("saved");
        lastFailedSaveRef.current = null;
        setSelectedSectionId((current) =>
          current && nextSections.some((section) => section.id === current)
            ? current
            : nextSections[0]?.id ?? "",
        );
      } catch (error) {
        if (!cancelled) {
          setSections([]);
          setSelectedSectionId("");
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load sections for this page.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSections(false);
        }
      }
    }

    void loadSections();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, selectedPageId, siteId]);

  const selectedSection = useMemo(
    () =>
      sections.find((section) => section.id === selectedSectionId) ?? null,
    [sections, selectedSectionId],
  );

  const saveSectionNow = useCallback(
    async (pendingSave: PendingSave) => {
      setSaveStatus("saving");

      try {
        await updateSiteSection({
          apiBaseUrl,
          siteId,
          pageId: pendingSave.pageId,
          sectionId: pendingSave.sectionId,
          input: {
            props: serializeSectionPropsForApi(
              sectionsRef.current.find(
                (section) => section.id === pendingSave.sectionId,
              )?.sourceType,
              pendingSave.props,
            ),
          },
        });

        const latestSectionVersion =
          latestVersionBySectionIdRef.current[pendingSave.sectionId];
        const isLatestGlobalSave =
          pendingSave.version === latestEditVersionRef.current;
        const isLatestSectionSave =
          pendingSave.version === latestSectionVersion;

        if (isLatestGlobalSave && isLatestSectionSave) {
          setSaveStatus("saved");
          lastFailedSaveRef.current = null;
        }
      } catch {
        const latestSectionVersion =
          latestVersionBySectionIdRef.current[pendingSave.sectionId];
        const isLatestGlobalSave =
          pendingSave.version === latestEditVersionRef.current;
        const isLatestSectionSave =
          pendingSave.version === latestSectionVersion;

        if (isLatestGlobalSave && isLatestSectionSave) {
          lastFailedSaveRef.current = pendingSave;
          setSaveStatus("failed");
        }
      }
    },
    [apiBaseUrl, siteId],
  );

  const scheduleSectionSave = useCallback(
    (pendingSave: PendingSave) => {
      const currentTimer = saveTimersRef.current[pendingSave.sectionId];
      if (currentTimer) {
        clearTimeout(currentTimer);
      }

      saveTimersRef.current[pendingSave.sectionId] = setTimeout(() => {
        delete saveTimersRef.current[pendingSave.sectionId];
        void saveSectionNow(pendingSave);
      }, AUTOSAVE_DELAY_MS);
    },
    [saveSectionNow],
  );

  const updateSectionProps = useCallback(
    (sectionId: string, nextProps: Record<string, unknown>) => {
      const currentSection = sectionsRef.current.find(
        (section) => section.id === sectionId,
      );
      if (!currentSection) {
        return;
      }

      const mergedProps = { ...currentSection.props, ...nextProps };
      const nextVersion = latestEditVersionRef.current + 1;
      latestEditVersionRef.current = nextVersion;
      latestVersionBySectionIdRef.current[sectionId] = nextVersion;
      lastFailedSaveRef.current = null;
      setSaveStatus("unsaved");

      setSections((currentSections) =>
        currentSections.map((section) =>
          section.id === sectionId
            ? { ...section, props: { ...section.props, ...nextProps } }
            : section,
        ),
      );

      scheduleSectionSave({
        sectionId,
        pageId: currentSection.pageId ?? selectedPageId,
        props: mergedProps,
        version: nextVersion,
      });
    },
    [scheduleSectionSave, selectedPageId],
  );

  const retryLastFailedSave = useCallback(() => {
    const failedSave = lastFailedSaveRef.current;
    if (!failedSave) {
      return;
    }

    const currentSection = sectionsRef.current.find(
      (section) => section.id === failedSave.sectionId,
    );
    const nextVersion = latestEditVersionRef.current + 1;
    latestEditVersionRef.current = nextVersion;
    latestVersionBySectionIdRef.current[failedSave.sectionId] = nextVersion;

    const retrySave = {
      ...failedSave,
      props: currentSection?.props ?? failedSave.props,
      version: nextVersion,
    };

    lastFailedSaveRef.current = retrySave;
    void saveSectionNow(retrySave);
  }, [saveSectionNow]);

  const toggleSectionVisibility = useCallback(
    async (sectionId: string) => {
      const currentSection = sectionsRef.current.find(
        (section) => section.id === sectionId,
      );
      if (!currentSection) {
        return;
      }

      const nextIsVisible = currentSection.isVisible === false;
      setActionMessage(null);
      setErrorMessage(null);
      setSaveStatus("saving");
      setSections((currentSections) =>
        currentSections.map((section) =>
          section.id === sectionId
            ? { ...section, isVisible: nextIsVisible }
            : section,
        ),
      );

      try {
        await updateSiteSection({
          apiBaseUrl,
          siteId,
          pageId: currentSection.pageId ?? selectedPageId,
          sectionId,
          input: {
            isVisible: nextIsVisible,
          },
        });
        setSaveStatus("saved");
      } catch (error) {
        setSaveStatus("failed");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not update section visibility.",
        );
      }
    },
    [apiBaseUrl, selectedPageId, siteId],
  );

  const moveSection = useCallback(
    async (sectionId: string, direction: "up" | "down") => {
      const currentSections = sectionsRef.current;
      const currentIndex = currentSections.findIndex(
        (section) => section.id === sectionId,
      );
      if (currentIndex < 0) {
        return;
      }

      const nextIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= currentSections.length) {
        return;
      }

      const previousSections = currentSections;
      const nextSections = assignSectionSortOrder(
        moveArrayItem(currentSections, currentIndex, nextIndex),
      );
      const pageId =
        nextSections.find((section) => section.id === sectionId)?.pageId ??
        selectedPageId;

      setActionMessage(null);
      setErrorMessage(null);
      setSaveStatus("saving");
      setSelectedSectionId(sectionId);
      setSections(nextSections);

      try {
        await reorderSiteSections({
          apiBaseUrl,
          siteId,
          pageId,
          sectionIds: nextSections.map((section) => section.id),
        });
        setSaveStatus("saved");
      } catch (error) {
        setSections(previousSections);
        setSaveStatus("failed");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not reorder sections.",
        );
      }
    },
    [apiBaseUrl, selectedPageId, siteId],
  );

  const showDuplicatePlaceholder = useCallback((sectionId: string) => {
    setSelectedSectionId(sectionId);
    setActionMessage("Duplicate section will be connected in a later builder task.");
  }, []);

  const showDeletePlaceholder = useCallback((sectionId: string) => {
    setSelectedSectionId(sectionId);
    setActionMessage("Delete section will be connected in a later builder task.");
  }, []);

  return (
    <main className="min-h-screen bg-[#1A1C23] text-[#F9FAFB]">
      <div className="flex min-h-screen flex-col">
        <BuilderTopbar
          siteId={siteId}
          pages={pages}
          selectedPageId={selectedPageId}
          device={device}
          saveStatus={saveStatus}
          onPageChange={setSelectedPageId}
          onDeviceChange={setDevice}
          onRetrySave={retryLastFailedSave}
        />

        {errorMessage ? (
          <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </div>
        ) : null}
        {actionMessage ? (
          <div className="border-b border-[#FFD700]/20 bg-[#FFD700]/10 px-4 py-3 text-sm text-[#FFD700]">
            {actionMessage}
          </div>
        ) : null}

        {isLoadingPages ? (
          <BuilderLoadingState label="Loading site pages..." />
        ) : pages.length === 0 ? (
          <BuilderEmptyState label="This site does not have pages yet." />
        ) : (
          <section className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
            <SectionListPanel
              sections={sections}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
              onToggleVisibility={toggleSectionVisibility}
              onMoveSection={moveSection}
              onDuplicateSection={showDuplicatePlaceholder}
              onDeleteSection={showDeletePlaceholder}
            />
            <BuilderCanvas
              sections={sections}
              selectedSectionId={selectedSectionId}
              device={device}
              onSelectSection={setSelectedSectionId}
              isLoading={isLoadingSections}
            />
            <SectionEditPanel
              section={selectedSection}
              onChangeProps={updateSectionProps}
            />
          </section>
        )}
      </div>
    </main>
  );
}

function BuilderLoadingState({ label }: { label: string }) {
  return (
    <div className="grid flex-1 place-items-center bg-[#151820] p-6">
      <div className="rounded-lg border border-white/10 bg-[#20232C] px-4 py-3 text-sm text-slate-300">
        {label}
      </div>
    </div>
  );
}

function BuilderEmptyState({ label }: { label: string }) {
  return (
    <div className="grid flex-1 place-items-center bg-[#151820] p-6">
      <div className="rounded-lg border border-white/10 bg-[#20232C] p-5 text-center">
        <p className="font-kanit text-lg font-semibold text-white">
          Nothing to edit yet
        </p>
        <p className="mt-2 text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function mapSiteSectionToBuilderSection(
  section: SiteSection,
  pageId: string,
): BuilderSection {
  const registryType = mapSectionTypeToRegistryType(section);

  return {
    id: section.id,
    type: registryType,
    sourceType: section.type,
    pageId,
    label: section.name?.trim() || formatSectionLabel(section.type),
    summary: section.sectionTemplate?.name ?? formatSectionLabel(section.type),
    props: mapSectionPropsToRegistryProps(registryType, section.props),
    isVisible: section.isVisible,
    sortOrder: section.sortOrder,
  };
}

function mapSectionTypeToRegistryType(section: SiteSection) {
  const templateCode = section.sectionTemplate?.code?.toLowerCase() ?? "";

  if (templateCode.includes("hero")) {
    return "hero.splitImage";
  }
  if (templateCode.includes("feature")) {
    return "features.grid";
  }
  if (templateCode.includes("contact") || templateCode.includes("cta")) {
    return "contact.lineCta";
  }
  if (templateCode.includes("footer")) {
    return "footer.simple";
  }

  switch (section.type) {
    case "HERO":
    case "HEADER":
      return "hero.splitImage";
    case "FEATURE":
    case "CONTENT":
    case "ABOUT":
      return "features.grid";
    case "CONTACT":
    case "CTA":
    case "FORM":
      return "contact.lineCta";
    case "FOOTER":
      return "footer.simple";
    default:
      return section.type;
  }
}

function mapSectionPropsToRegistryProps(
  registryType: string,
  props: SiteSection["props"],
) {
  const normalizedProps = normalizeSectionProps(props);

  switch (registryType) {
    case "hero.splitImage":
      return compactProps({
        ...normalizedProps,
        headline:
          readStringProp(normalizedProps, "headline") ||
          readStringProp(normalizedProps, "title") ||
          undefined,
        subheadline:
          readStringProp(normalizedProps, "subheadline") ||
          readStringProp(normalizedProps, "subtitle") ||
          undefined,
        primaryButtonText:
          readStringProp(normalizedProps, "primaryButtonText") ||
          readStringProp(normalizedProps, "buttonText") ||
          undefined,
        imageUrl:
          readStringProp(normalizedProps, "imageUrl") ||
          readStringProp(normalizedProps, "url") ||
          undefined,
      });
    case "features.grid": {
      const items = normalizedProps.items;
      const itemTitles = Array.isArray(items)
        ? items
            .map((item) =>
              typeof item === "string"
                ? item
                : item && typeof item === "object" && "title" in item
                  ? (item as { title?: unknown }).title
                  : null,
            )
            .filter((item): item is string => typeof item === "string")
        : [];

      return compactProps({
        ...normalizedProps,
        featureOne:
          readStringProp(normalizedProps, "featureOne") ||
          itemTitles[0] ||
          undefined,
        featureTwo:
          readStringProp(normalizedProps, "featureTwo") ||
          itemTitles[1] ||
          undefined,
        featureThree:
          readStringProp(normalizedProps, "featureThree") ||
          itemTitles[2] ||
          undefined,
      });
    }
    case "contact.lineCta":
      return compactProps({
        ...normalizedProps,
        description:
          readStringProp(normalizedProps, "description") ||
          readStringProp(normalizedProps, "subtitle") ||
          undefined,
        buttonText:
          readStringProp(normalizedProps, "buttonText") ||
          readStringProp(normalizedProps, "submitLabel") ||
          undefined,
      });
    default:
      return normalizedProps;
  }
}

function compactProps(props: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined),
  );
}

function serializeSectionPropsForApi(
  sourceType: string | undefined,
  props: Record<string, unknown>,
) {
  const nextProps = { ...props };

  if (sourceType === "HERO" || sourceType === "HEADER") {
    copyStringProp(nextProps, "headline", "title");
    copyStringProp(nextProps, "subheadline", "subtitle");
    copyStringProp(nextProps, "primaryButtonText", "buttonText");
  }

  if (sourceType === "CONTACT" || sourceType === "CTA" || sourceType === "FORM") {
    copyStringProp(nextProps, "description", "subtitle");
  }

  return nextProps;
}

function copyStringProp(
  props: Record<string, unknown>,
  fromKey: string,
  toKey: string,
) {
  const value = props[fromKey];
  if (typeof value === "string") {
    props[toKey] = value;
  }
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

function assignSectionSortOrder(sections: BuilderSection[]) {
  return sections.map((section, index) => ({
    ...section,
    sortOrder: index,
  }));
}

function normalizeSectionProps(props: SiteSection["props"]) {
  if (props && typeof props === "object" && !Array.isArray(props)) {
    return props;
  }

  return {};
}

function readStringProp(props: Record<string, unknown>, key: string) {
  const value = props[key];
  return typeof value === "string" && value.trim() ? value : "";
}

function formatSectionLabel(type: string) {
  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
