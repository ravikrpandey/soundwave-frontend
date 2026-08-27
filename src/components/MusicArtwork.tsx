import React from "react";

type MusicArtworkProps = {
  tone: string;
  accent: string;
  label: string;
  size?: "xs" | "sm" | "md" | "lg" | "hero";
  className?: string;
};

export default function MusicArtwork({ tone, accent, label, size = "md", className = "" }: MusicArtworkProps) {
  const variants = ["constellation", "strata", "pulse", "prism"] as const;
  const hash = Array.from(label).reduce((total, character) => total + character.charCodeAt(0), 0);
  const variant = variants[hash % variants.length];
  return (
    <div
      aria-label={`${label} artwork`}
      className={`music-art music-art--${size} music-art--${variant} ${className}`}
      style={{ "--art-tone": tone, "--art-accent": accent } as React.CSSProperties}
    >
      <span className="music-art__ring" />
      <span className="music-art__orb music-art__orb--one" />
      <span className="music-art__orb music-art__orb--two" />
      <span className="music-art__wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
    </div>
  );
}
