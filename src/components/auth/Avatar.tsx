"use client";

import { motion } from "framer-motion";

interface AvatarProps {
  url: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-24 h-24",
  xl: "w-32 h-32",
};

export default function Avatar({ url, name, size = "md", className = "" }: AvatarProps) {
  // Simple check to see if url is a gradient string
  const isGradient = url.includes("gradient");

  return (
    <div
      className={`relative rounded-full overflow-hidden border-2 border-[var(--color-ivory)] shadow-sm ${sizeClasses[size]} ${className} flex items-center justify-center`}
      style={{
        background: isGradient ? url : undefined,
      }}
    >
      {!isGradient && (
        <img
          src={url}
          alt={name}
          className="w-full h-full object-cover"
        />
      )}
      {/* Fallback if no URL is provided, though mock data has it */}
      {!url && (
        <span className="text-[var(--color-espresso)] font-bold text-xs">
            {name.charAt(0)}
        </span>
      )}
    </div>
  );
}
