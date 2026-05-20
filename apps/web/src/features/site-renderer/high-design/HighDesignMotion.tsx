"use client";

import { normalizeFinnwebMotionDirectives } from "@finnweb/shared";
import { useEffect, useMemo, useRef, useState } from "react";

type MotionPreset =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "scale-in"
  | "staggered-reveal"
  | "soft-float"
  | "marquee"
  | "none";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
};

export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: RevealProps) {
  return (
    <div
      className={`fw-reveal fw-observe fw-reveal-${direction} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function Stagger({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`fw-stagger ${className}`}>{children}</div>;
}

export function StaggerItem({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`fw-stagger-item ${className}`} style={style}>
      {children}
    </div>
  );
}

function getMotionPreset(
  preset:
    | ReturnType<typeof normalizeFinnwebMotionDirectives>[number]["preset"]
    | undefined,
): MotionPreset {
  const requested = preset ?? "scroll-reveal";

  if (!requested || requested === "scroll-reveal") {
    return "fade-up";
  }

  if (
    requested.includes("stagger") ||
    requested.includes("card") ||
    requested.includes("list")
  ) {
    return "staggered-reveal";
  }

  if (requested.includes("float")) {
    return "soft-float";
  }

  if (requested.includes("marquee")) {
    return "marquee";
  }

  if (requested.includes("scale") || requested.includes("zoom")) {
    return "scale-in";
  }

  if (requested.includes("left")) {
    return "fade-left";
  }

  if (requested.includes("right")) {
    return "fade-right";
  }

  if (requested.includes("down")) {
    return "fade-down";
  }

  if (requested.includes("none")) {
    return "none";
  }

  return "fade-up";
}

function isAtDocumentBottom(threshold = 24) {
  return (
    window.scrollY + window.innerHeight >=
    document.documentElement.scrollHeight - threshold
  );
}

async function applyGsapDirectives(
  node: HTMLElement,
  directives: ReturnType<typeof normalizeFinnwebMotionDirectives>,
) {
  if (directives.length === 0) {
    return () => undefined;
  }

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  const animations: Array<{ kill: () => void }> = [];
  const triggers: Array<{ kill: () => void }> = [];
  const revealSafeties: Array<{ kill: () => void }> = [];

  function registerBottomRevealSafety(
    target: Element | Element[] | NodeListOf<Element>,
  ) {
    const revealAtBottom = () => {
      if (isAtDocumentBottom()) {
        gsap.set(target, {
          autoAlpha: 1,
          y: 0,
          clipPath: "inset(0% 0% 0% 0%)",
        });
        window.removeEventListener("scroll", revealAtBottom);
        window.removeEventListener("resize", revealAtBottom);
      }
    };

    window.addEventListener("scroll", revealAtBottom, { passive: true });
    window.addEventListener("resize", revealAtBottom);
    revealAtBottom();
    revealSafeties.push({
      kill: () => {
        window.removeEventListener("scroll", revealAtBottom);
        window.removeEventListener("resize", revealAtBottom);
      },
    });
  }

  function isReadyForScrollReveal(triggerTarget: Element) {
    const rect = triggerTarget.getBoundingClientRect();
    return rect.top <= window.innerHeight * 0.8 && rect.bottom > 0;
  }

  function createGuardedRevealTrigger(
    triggerTarget: Element,
    reveal: () => void,
  ) {
    let didReveal = false;
    // Block any onEnter that fires during the initial ScrollTrigger refresh
    // (pin sections cause spurious onEnter during layout). Only honor user-scroll-driven enters.
    let ready = false;
    const userScrollMarker = () => {
      ready = true;
      window.removeEventListener("scroll", userScrollMarker);
    };
    window.addEventListener("scroll", userScrollMarker, { passive: true, once: true });

    let triggerInstance: { kill: () => void } | null = null;
    const fire = () => {
      if (didReveal || !isReadyForScrollReveal(triggerTarget)) {
        return;
      }
      didReveal = true;
      reveal();
      triggerInstance?.kill();
      window.removeEventListener("scroll", userScrollMarker);
    };

    triggerInstance = ScrollTrigger.create({
      trigger: triggerTarget,
      start: "top 80%",
      onEnter: () => {
        if (!ready) return;
        fire();
      },
      onRefresh: () => {
        if (didReveal) return;
        // Footer/short-bottom safety: if user has reached page bottom, reveal anyway.
        if (isAtDocumentBottom()) {
          didReveal = true;
          reveal();
          triggerInstance?.kill();
          window.removeEventListener("scroll", userScrollMarker);
        }
      },
    });

    triggers.push({
      kill: () => {
        triggerInstance?.kill();
        window.removeEventListener("scroll", userScrollMarker);
      },
    });
  }

  for (const directive of directives) {
    const distance = directive.distance ?? 64;
    const speed = directive.speed ?? 1;
    const scrub = directive.scrub ?? false;
    const ease = "power4.out";

    if (directive.preset === "parallax-layer") {
      animations.push(
        gsap.fromTo(
          node,
          { y: distance * 0.35 },
          {
            y: -distance * speed,
            ease: "none",
            scrollTrigger: {
              trigger: node,
              start: "top bottom",
              end: "bottom top",
              scrub: scrub || true,
            },
          },
        ),
      );
    }

    if (directive.preset === "parallax-bg") {
      const target = node.querySelector("[data-fw-parallax-bg]") ?? node;
      animations.push(
        gsap.fromTo(
          target,
          { yPercent: -4 * speed, scale: 1.04 },
          {
            yPercent: 4 * speed,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: node,
              start: "top bottom",
              end: "bottom top",
              scrub: scrub || true,
            },
          },
        ),
      );
    }

    if (directive.preset === "scroll-reveal") {
      // In-fold at mount: keep CSS default visibility (no hide → no risk of getting stuck hidden).
      if (isReadyForScrollReveal(node)) {
        // skip: container stays visible
      } else {
        registerBottomRevealSafety(node);
        gsap.set(node, { autoAlpha: 0, y: distance });
        const tween = gsap.to(node, {
          autoAlpha: 1,
          y: 0,
          duration: 0.72 / speed,
          delay: (directive.delay ?? 0) / 1000,
          ease,
          paused: true,
        });
        animations.push(tween);
        createGuardedRevealTrigger(node, () => tween.play(0));
      }
    }

    if (directive.preset === "pin-section" || directive.preset === "sticky-story") {
      triggers.push(
        ScrollTrigger.create({
          trigger: node,
          start: "top top",
          end: `+=${Math.round(420 * speed)}`,
          pin: directive.pin ?? true,
          pinSpacing: true,
        }),
      );
    }

    if (directive.preset === "stagger-children") {
      const children = node.querySelectorAll(
        ":scope :where(.fw-stagger-item, article, li, figure)",
      );
      if (children.length > 0) {
        if (isReadyForScrollReveal(node)) {
          // skip: children stay visible by CSS default
        } else {
          registerBottomRevealSafety(children);
          gsap.set(children, { autoAlpha: 0, y: Math.min(distance, 72) });
          const tween = gsap.to(children, {
            autoAlpha: 1,
            y: 0,
            duration: 0.64 / speed,
            stagger: directive.stagger ?? 0.08,
            ease,
            paused: true,
          });
          animations.push(tween);
          createGuardedRevealTrigger(node, () => tween.play(0));
        }
      }
    }

    if (directive.preset === "clip-reveal") {
      if (isReadyForScrollReveal(node)) {
        // skip: container stays visible
      } else {
        registerBottomRevealSafety(node);
        gsap.set(node, { clipPath: "inset(12% 0% 12% 0%)", autoAlpha: 0 });
        const tween = gsap.to(node, {
          clipPath: "inset(0% 0% 0% 0%)",
          autoAlpha: 1,
          duration: 0.82 / speed,
          ease,
          paused: true,
        });
        animations.push(tween);
        createGuardedRevealTrigger(node, () => tween.play(0));
      }
    }

    if (directive.preset === "tilt-3d") {
      const onMove = (event: MouseEvent) => {
        const rect = node.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        gsap.to(node, {
          rotateX: -y * 5,
          rotateY: x * 5,
          transformPerspective: 900,
          transformOrigin: "center",
          duration: 0.4,
          ease,
        });
      };
      const onLeave = () => {
        gsap.to(node, { rotateX: 0, rotateY: 0, duration: 0.5, ease });
      };
      node.addEventListener("mousemove", onMove);
      node.addEventListener("mouseleave", onLeave);
      triggers.push({
        kill: () => {
          node.removeEventListener("mousemove", onMove);
          node.removeEventListener("mouseleave", onLeave);
        },
      });
    }

    if (directive.preset === "magnetic") {
      const targets = node.querySelectorAll("a, button");
      targets.forEach((target) => {
        const element = target as HTMLElement;
        const onMove = (event: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          gsap.to(element, {
            x: (event.clientX - rect.left - rect.width / 2) * 0.18,
            y: (event.clientY - rect.top - rect.height / 2) * 0.18,
            duration: 0.34,
            ease,
          });
        };
        const onLeave = () => {
          gsap.to(element, { x: 0, y: 0, duration: 0.42, ease });
        };
        element.addEventListener("mousemove", onMove);
        element.addEventListener("mouseleave", onLeave);
        triggers.push({
          kill: () => {
            element.removeEventListener("mousemove", onMove);
            element.removeEventListener("mouseleave", onLeave);
          },
        });
      });
    }
  }

  return () => {
    animations.forEach((animation) => animation.kill());
    triggers.forEach((trigger) => trigger.kill());
    revealSafeties.forEach((safety) => safety.kill());
  };
}

export function MotionSection({
  children,
  motion,
  className = "",
}: {
  children: React.ReactNode;
  motion?: unknown;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isArmed, setIsArmed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const directives = useMemo(
    () => normalizeFinnwebMotionDirectives(motion),
    [motion],
  );
  const firstDirective = directives[0];
  const preset = getMotionPreset(firstDirective?.preset);
  const trigger = firstDirective?.trigger ?? "scroll";
  const delay = firstDirective?.delay ?? 0;
  const intensity = firstDirective?.intensity ?? "medium";

  const hasDirectives = directives.length > 0;

  useEffect(() => {
    // When GSAP directives exist, that engine fully owns inline opacity/visibility.
    // The CSS path (fw-armed + .is-visible) is reserved for sections without directives.
    if (hasDirectives) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    if (preset === "none") {
      setIsVisible(true);
      return;
    }

    if (trigger === "load") {
      setIsArmed(true);
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const node = ref.current;
    if (!node) {
      return;
    }

    let didReveal = false;
    let observer: IntersectionObserver | null = null;

    const reveal = () => {
      if (didReveal) {
        return;
      }
      didReveal = true;
      setIsVisible(true);
      observer?.disconnect();
      window.removeEventListener("scroll", revealIfAtBottom);
      window.removeEventListener("resize", revealIfAtBottom);
    };

    const revealIfAtBottom = () => {
      if (isAtDocumentBottom()) {
        reveal();
      }
    };

    const rect = node.getBoundingClientRect();
    const isAlreadyInViewport =
      rect.top < window.innerHeight * 0.92 && rect.bottom > 0;

    if (isAlreadyInViewport) {
      setIsArmed(true);
      reveal();
      return;
    }

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reveal();
        }
      },
      {
        rootMargin: "0px 0px 16% 0px",
        threshold: 0.01,
      },
    );

    observer.observe(node);
    window.addEventListener("scroll", revealIfAtBottom, { passive: true });
    window.addEventListener("resize", revealIfAtBottom);
    revealIfAtBottom();
    setIsArmed(true);

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", revealIfAtBottom);
      window.removeEventListener("resize", revealIfAtBottom);
    };
  }, [preset, trigger, hasDirectives]);

  useEffect(() => {
    const node = ref.current;
    if (!node || directives.length === 0) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    applyGsapDirectives(node, directives)
      .then((destroy) => {
        if (cancelled) {
          destroy();
          return;
        }
        cleanup = destroy;
      })
      .catch(() => {
        setIsVisible(true);
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [directives]);

  // GSAP-directed sections: omit CSS armed/visible classes (GSAP owns inline opacity/visibility).
  const armedClass = !hasDirectives && isArmed ? "fw-armed" : "";
  const visibleClass = !hasDirectives && isVisible ? "is-visible" : "";

  // For CSS-engine sections, React directly controls inline opacity + visibility
  // (deterministic, independent of @layer utilities cascade quirks).
  const sectionStyle: React.CSSProperties = { transitionDelay: `${delay}ms` };
  if (!hasDirectives && isArmed && !isVisible) {
    sectionStyle.opacity = 0;
    sectionStyle.visibility = "hidden";
  }

  return (
    <div
      ref={ref}
      data-fw-motion-engine={hasDirectives ? "gsap" : "css"}
      className={`fw-motion-section ${armedClass} fw-motion-${preset} fw-motion-${intensity} ${visibleClass} ${className}`}
      style={sectionStyle}
    >
      {children}
    </div>
  );
}

export function HighDesignScrollProgress({
  color = "var(--fw-color-primary, #FF8C00)",
}: {
  color?: string;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? window.scrollY / scrollable : 0);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed left-0 right-0 top-0 z-[100] h-1.5 origin-left rounded-r-full"
      style={{
        backgroundColor: color,
        transform: `scaleX(${progress})`,
      }}
    />
  );
}
