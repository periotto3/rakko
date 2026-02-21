"use client";

import Image from "next/image";
import { useState } from "react";

interface PlayerAvatarProps {
  src: string;
  name: string;
  size?: number;
  className?: string;
}

const FALLBACK_COLORS: Record<string, string> = {
  "/avatars/human.png": "#6366F1",
  "/avatars/cpu1.png": "#EF4444",
  "/avatars/cpu2.png": "#22C55E",
  "/avatars/cpu3.png": "#F59E0B",
};

function SvgFallback({ color, size }: { color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="12" r="9" fill={color} />
      <path d="M2 40 C2 24 10 20 20 20 C30 20 38 24 38 40 Z" fill={color} />
    </svg>
  );
}

export default function PlayerAvatar({ src, name, size = 40, className }: PlayerAvatarProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <SvgFallback
        color={FALLBACK_COLORS[src] ?? "#888888"}
        size={size}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain" }}
      onError={() => setError(true)}
      unoptimized
    />
  );
}
