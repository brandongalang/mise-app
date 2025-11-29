"use client";

import React from "react";
import { motion } from "framer-motion";
import { Profile } from "@/types/auth";
import { Avatar } from "./Avatar";
import { Pencil } from "lucide-react";

interface ProfileCardProps {
  profile: Profile;
  onClick: (profile: Profile) => void;
  isManaging?: boolean;
}

export function ProfileCard({ profile, onClick, isManaging = false }: ProfileCardProps) {
  const hasPin = !!profile.pinHash;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.1, y: -5 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="flex flex-col items-center gap-3 cursor-pointer group"
      onClick={() => onClick(profile)}
    >
      <div className="relative">
        <Avatar
            color={profile.avatarColor}
            size="lg"
            locked={hasPin && !isManaging}
            className="border-2 border-transparent group-hover:border-white/20 transition-colors"
        />

        {/* Manage Overlay */}
        {isManaging && (
            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <Pencil className="text-white w-8 h-8" />
            </div>
        )}
      </div>

      <span className="text-gray-300 font-display text-lg group-hover:text-white transition-colors">
        {profile.displayName}
      </span>
    </motion.div>
  );
}
