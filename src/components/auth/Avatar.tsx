"use client";

import { motion } from "framer-motion";

interface AvatarProps {
  colorClass: string;
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

export default function Avatar({ colorClass, name, size = "md", className = "" }: AvatarProps) {
  return (
    <div
      className={`relative rounded-full overflow-hidden border-2 border-[var(--color-ivory)] shadow-sm ${sizeClasses[size]} ${colorClass} ${className} flex items-center justify-center`}
    >
      <span className="text-white font-bold font-display" style={{ fontSize: size === 'sm' ? '0.75rem' : size === 'md' ? '1.25rem' : '2rem' }}>
          {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
