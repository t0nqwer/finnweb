"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MotionSignal = {
  name?: string;
  preset?: string;
  trigger?: "load" | "scroll" | "hover" | "loop";
  target?: string;
  intensity?: "subtle" | "medium" | "strong";
  delay?: number;
};

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

function normalizeMotion(value: unknown): MotionSignal[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is MotionSignal =>
      typeof item === "object" && item !== null && !Array.isArray(item),
  );
}

function getMotionPreset(signals: MotionSignal[]): MotionPreset {
  const first = signals[0];
  const requested = first?.preset ?? first?.name;

  if (!requested) {
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

function getIntensity(signals: MotionSignal[]) {
  return signals[0]?.intensity ?? "medium";
}

function getDelay(signals: MotionSignal[]) {
  const delay = signals.find((signal) => typeof signal.delay === "number")?.delay;
  return typeof delay === "number" && Number.isFinite(delay)
    ? Math.max(0, Math.min(delay, 700))
    : 0;
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
  const [isVisible, setIsVisible] = useState(false);
  const signals = useMemo(() => normalizeMotion(motion), [motion]);
  const preset = getMotionPreset(signals);
  const trigger = signals[0]?.trigger ?? "scroll";
  const delay = getDelay(signals);
  const intensity = getIntensity(signals);

  useEffect(() => {
    if (preset === "none") {
      setIsVisible(true);
      return;
    }

    if (trigger === "load") {
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.16,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [preset, trigger]);

  return (
    <div
      ref={ref}
      className={`fw-motion-section fw-motion-${preset} fw-motion-${intensity} ${
        isVisible ? "is-visible" : ""
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function HighDesignScrollProgress({
  color = "#0047FF",
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
