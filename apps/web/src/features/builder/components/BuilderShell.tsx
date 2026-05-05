"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_API_BASE_URL } from "@/lib/api-client";
import { normalizeApiBaseUrl, readStoredAuthState } from "@/lib/auth-storage";
import {
  createSiteSection,
  deleteSiteSection,
  getSitePages,
  getSiteSections,
  publishSite,
  reorderSiteSections,
  updateSiteSection,
  type SitePage,
  type SiteSection,
} from "../api/builder.api";
import {
  getSectionRegistryEntry,
  type BuilderSection,
} from "../registry/section-registry";
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
  const [isMutatingSection, setIsMutatingSection] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
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

  const createSection = useCallback(
    async ({
      type,
      name,
      props,
      selectAfterCreate = true,
    }: {
      type: string;
      name?: string;
      props?: Record<string, unknown>;
      selectAfterCreate?: boolean;
    }) => {
      if (!selectedPageId || isMutatingSection) {
        return null;
      }

      const sourceType = normalizeSourceSectionType(type);
      const registryType = mapSourceTypeToRegistryType(sourceType);
      const registryEntry = getSectionRegistryEntry(registryType);
      const nextProps = props ?? registryEntry?.defaultProps ?? {};
      const sortOrder = sectionsRef.current.length;

      setIsMutatingSection(true);
      setActionMessage(null);
      setErrorMessage(null);
      setSaveStatus("saving");

      try {
        const { data, authState } = await createSiteSection({
          apiBaseUrl,
          siteId,
          pageId: selectedPageId,
          input: {
            type: sourceType,
            name: name ?? registryEntry?.label ?? formatSectionLabel(sourceType),
            sortOrder,
            props: serializeSectionPropsForApi(sourceType, nextProps),
          },
        });
        if (authState.apiBaseUrl) {
          setApiBaseUrl(normalizeApiBaseUrl(authState.apiBaseUrl));
        }

        const nextSection = mapSiteSectionToBuilderSection(data, selectedPageId);
        setSections((currentSections) =>
          assignSectionSortOrder([...currentSections, nextSection]),
        );
        if (selectAfterCreate) {
          setSelectedSectionId(nextSection.id);
        }
        setSaveStatus("saved");
        return nextSection;
      } catch (error) {
        setSaveStatus("failed");
        setErrorMessage(
          error instanceof Error ? error.message : "Could not add section.",
        );
        return null;
      } finally {
        setIsMutatingSection(false);
      }
    },
    [apiBaseUrl, isMutatingSection, selectedPageId, siteId],
  );

  const duplicateSection = useCallback(
    async (sectionId: string) => {
      const currentSection = sectionsRef.current.find(
        (section) => section.id === sectionId,
      );
      if (!currentSection) {
        return;
      }

      setSelectedSectionId(sectionId);
      await createSection({
        type: currentSection.sourceType ?? currentSection.type,
        name: `${currentSection.label} copy`,
        props: currentSection.props,
      });
    },
    [createSection],
  );

  const deleteSection = useCallback(
    async (sectionId: string) => {
      const currentSections = sectionsRef.current;
      const targetSection = currentSections.find(
        (section) => section.id === sectionId,
      );
      if (!targetSection || isMutatingSection) {
        return;
      }

      const nextSections = assignSectionSortOrder(
        currentSections.filter((section) => section.id !== sectionId),
      );
      const nextSelectedId =
        selectedSectionId === sectionId
          ? nextSections[0]?.id ?? ""
          : selectedSectionId;

      setIsMutatingSection(true);
      setActionMessage(null);
      setErrorMessage(null);
      setSaveStatus("saving");
      setSections(nextSections);
      setSelectedSectionId(nextSelectedId);

      try {
        await deleteSiteSection({
          apiBaseUrl,
          siteId,
          pageId: targetSection.pageId ?? selectedPageId,
          sectionId,
        });
        setSaveStatus("saved");
      } catch (error) {
        setSections(currentSections);
        setSelectedSectionId(sectionId);
        setSaveStatus("failed");
        setErrorMessage(
          error instanceof Error ? error.message : "Could not delete section.",
        );
      } finally {
        setIsMutatingSection(false);
      }
    },
    [apiBaseUrl, isMutatingSection, selectedPageId, selectedSectionId, siteId],
  );

  const publishCurrentSite = useCallback(async () => {
    if (isPublishing) {
      return;
    }

    setIsPublishing(true);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const { data, authState } = await publishSite({ apiBaseUrl, siteId });
      if (authState.apiBaseUrl) {
        setApiBaseUrl(normalizeApiBaseUrl(authState.apiBaseUrl));
      }
      setPublicUrl(data.publicUrl ?? null);
      setActionMessage(`Published version ${data.version}.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not publish site.",
      );
    } finally {
      setIsPublishing(false);
    }
  }, [apiBaseUrl, isPublishing, siteId]);

  return (
    <main className="min-h-screen bg-[#1A1C23] text-[#F9FAFB]">
      <div className="flex min-h-screen flex-col">
        <BuilderTopbar
          siteId={siteId}
          pages={pages}
          selectedPageId={selectedPageId}
          device={device}
          saveStatus={saveStatus}
          isPublishing={isPublishing}
          publicUrl={publicUrl}
          onPageChange={setSelectedPageId}
          onDeviceChange={setDevice}
          onRetrySave={retryLastFailedSave}
          onPublish={() => {
            void publishCurrentSite();
          }}
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
              isMutatingSection={isMutatingSection}
              onSelectSection={setSelectedSectionId}
              onAddSection={(sectionType) => {
                void createSection({ type: sectionType });
              }}
              onToggleVisibility={toggleSectionVisibility}
              onMoveSection={moveSection}
              onDuplicateSection={(sectionId) => {
                void duplicateSection(sectionId);
              }}
              onDeleteSection={(sectionId) => {
                void deleteSection(sectionId);
              }}
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

  if (templateCode.includes("navbar") || templateCode.includes("menu")) {
    return "navbar.simple";
  }
  if (templateCode.includes("hero")) {
    return "hero.splitImage";
  }
  if (templateCode.includes("feature")) {
    return "features.grid";
  }
  if (templateCode.includes("rich") || templateCode.includes("content")) {
    return "richText.basic";
  }
  if (templateCode.includes("image") || templateCode.includes("gallery")) {
    return "image.single";
  }
  if (templateCode.includes("form")) {
    return "form.contact";
  }
  if (templateCode.includes("pricing")) {
    return "pricing.cards";
  }
  if (templateCode.includes("faq")) {
    return "faq.accordion";
  }
  if (
    templateCode.includes("testimonial") ||
    templateCode.includes("review")
  ) {
    return "testimonials.grid";
  }
  if (templateCode.includes("contact") || templateCode.includes("cta")) {
    return "contact.lineCta";
  }
  if (templateCode.includes("footer")) {
    return "footer.simple";
  }

  switch (section.type) {
    case "NAVBAR":
      return "navbar.simple";
    case "HERO":
    case "HEADER":
      return "hero.splitImage";
    case "FEATURE":
      return "features.grid";
    case "CONTENT":
    case "ABOUT":
    case "RICH_TEXT":
      return "richText.basic";
    case "IMAGE":
    case "GALLERY":
      return "image.single";
    case "FORM":
      return "form.contact";
    case "PRICING":
      return "pricing.cards";
    case "FAQ":
      return "faq.accordion";
    case "TESTIMONIAL":
      return "testimonials.grid";
    case "CONTACT":
    case "CTA":
      return "contact.lineCta";
    case "FOOTER":
      return "footer.simple";
    default:
      return section.type;
  }
}

function mapSourceTypeToRegistryType(sourceType: string) {
  switch (sourceType) {
    case "NAVBAR":
      return "navbar.simple";
    case "HERO":
    case "HEADER":
      return "hero.splitImage";
    case "FEATURE":
      return "features.grid";
    case "CONTENT":
    case "ABOUT":
    case "RICH_TEXT":
      return "richText.basic";
    case "IMAGE":
    case "GALLERY":
      return "image.single";
    case "FORM":
      return "form.contact";
    case "PRICING":
      return "pricing.cards";
    case "FAQ":
      return "faq.accordion";
    case "TESTIMONIAL":
      return "testimonials.grid";
    case "CONTACT":
    case "CTA":
      return "contact.lineCta";
    case "FOOTER":
      return "footer.simple";
    default:
      return sourceType;
  }
}

function normalizeSourceSectionType(type: string) {
  switch (type) {
    case "navbar.simple":
      return "NAVBAR";
    case "hero.splitImage":
      return "HERO";
    case "features.grid":
      return "FEATURE";
    case "contact.lineCta":
      return "CTA";
    case "form.contact":
      return "FORM";
    case "richText.basic":
      return "RICH_TEXT";
    case "image.single":
      return "IMAGE";
    case "pricing.cards":
      return "PRICING";
    case "faq.accordion":
      return "FAQ";
    case "testimonials.grid":
      return "TESTIMONIAL";
    case "footer.simple":
      return "FOOTER";
    default:
      return type.toUpperCase().replaceAll(".", "_");
  }
}

function mapSectionPropsToRegistryProps(
  registryType: string,
  props: SiteSection["props"],
) {
  const normalizedProps = normalizeSectionProps(props);

  switch (registryType) {
    case "navbar.simple":
      return compactProps({
        ...normalizedProps,
        brandName:
          readStringProp(normalizedProps, "brandName") ||
          readStringProp(normalizedProps, "logoText") ||
          readStringProp(normalizedProps, "title") ||
          undefined,
        buttonText:
          readStringProp(normalizedProps, "buttonText") ||
          readStringProp(normalizedProps, "ctaLabel") ||
          undefined,
      });
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
      const itemTitles = readListTitles(normalizedProps.items);

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
    case "form.contact":
      return compactProps({
        ...normalizedProps,
        subtitle:
          readStringProp(normalizedProps, "subtitle") ||
          readStringProp(normalizedProps, "description") ||
          undefined,
        buttonText:
          readStringProp(normalizedProps, "buttonText") ||
          readStringProp(normalizedProps, "submitLabel") ||
          undefined,
      });
    case "richText.basic":
      return compactProps({
        ...normalizedProps,
        body:
          readStringProp(normalizedProps, "body") ||
          readStringProp(normalizedProps, "content") ||
          readStringProp(normalizedProps, "description") ||
          undefined,
      });
    case "image.single":
      return compactProps({
        ...normalizedProps,
        imageUrl:
          readStringProp(normalizedProps, "imageUrl") ||
          readStringProp(normalizedProps, "url") ||
          readStringProp(normalizedProps, "src") ||
          undefined,
      });
    case "pricing.cards":
      return compactProps({
        ...normalizedProps,
        plans:
          readStringProp(normalizedProps, "plans") ||
          readListTitles(normalizedProps.items).join("\n") ||
          undefined,
      });
    case "faq.accordion":
      return compactProps({
        ...normalizedProps,
        questions:
          readStringProp(normalizedProps, "questions") ||
          readListTitles(normalizedProps.items).join("\n") ||
          undefined,
      });
    case "testimonials.grid":
      return compactProps({
        ...normalizedProps,
        quotes:
          readStringProp(normalizedProps, "quotes") ||
          readListTitles(normalizedProps.items).join("\n") ||
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
    copyStringProp(nextProps, "subtitle", "description");
    copyStringProp(nextProps, "buttonText", "submitLabel");
  }

  if (sourceType === "RICH_TEXT" || sourceType === "CONTENT") {
    copyStringProp(nextProps, "body", "description");
  }

  if (sourceType === "IMAGE" || sourceType === "GALLERY") {
    copyStringProp(nextProps, "imageUrl", "url");
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

function readListTitles(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object" && "title" in item) {
        const title = (item as { title?: unknown }).title;
        return typeof title === "string" ? title : null;
      }
      if (item && typeof item === "object" && "question" in item) {
        const question = (item as { question?: unknown }).question;
        return typeof question === "string" ? question : null;
      }
      if (item && typeof item === "object" && "quote" in item) {
        const quote = (item as { quote?: unknown }).quote;
        return typeof quote === "string" ? quote : null;
      }
      return null;
    })
    .filter((item): item is string => Boolean(item?.trim()));
}

function formatSectionLabel(type: string) {
  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
