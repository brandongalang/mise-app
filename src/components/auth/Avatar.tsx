import React from "react";
import { cn } from "@/lib/utils"; // Assuming cn utility exists, otherwise I'll use simple class concatenation
import { User, Lock } from "lucide-react";

// Color mappings based on AGENTS.md / plan.md
const AVATAR_VARIANTS: Record<string, string> = {
  "classic-red": "bg-gradient-to-br from-red-500 to-red-700",
  "ocean-blue": "bg-gradient-to-br from-blue-400 to-blue-600",
  "jungle-green": "bg-gradient-to-br from-emerald-400 to-emerald-600",
  "royal-purple": "bg-gradient-to-br from-purple-500 to-purple-700",
  "sunny-yellow": "bg-gradient-to-br from-yellow-400 to-orange-500",
};

interface AvatarProps {
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  locked?: boolean; // If true, shows lock icon on hover or always? Plan says lock fades in on hover.
}

const SIZE_CLASSES = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-24 h-24", // For profile selection
  xl: "w-32 h-32",
};

export function Avatar({ color, size = "md", className, locked = false }: AvatarProps) {
  const bgClass = AVATAR_VARIANTS[color] || AVATAR_VARIANTS["classic-red"];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center relative shadow-lg overflow-hidden",
        bgClass,
        sizeClass,
        className
      )}
    >
      {/* Base Icon (User) - Fades out if lock appears? Or lock overlays? */}
      {/* Plan: "centered in the avatar... Lock icon fades in (opacity: 1)" */}

      <User className="text-white/80 w-[50%] h-[50%]" strokeWidth={2.5} />

      {locked && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
           <Lock className="text-white w-[40%] h-[40%]" />
        </div>
      )}
    </div>
  );
}
