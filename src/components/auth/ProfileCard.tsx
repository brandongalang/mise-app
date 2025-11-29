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
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="flex flex-col items-center gap-4 cursor-pointer group"
      onClick={() => onClick(profile)}
    >
      <div className="relative">
        <div className="rounded-full p-1 border-2 border-transparent group-hover:border-terracotta/30 transition-all duration-300">
          <Avatar
              color={profile.avatarColor}
              size="lg"
              locked={hasPin && !isManaging}
              className="shadow-md group-hover:shadow-lg transition-shadow"
          />
        </div>

        {/* Manage Overlay */}
        {isManaging && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-full flex items-center justify-center m-1">
                <Pencil className="text-white w-8 h-8 drop-shadow-md" />
            </div>
        )}
      </div>

      <span className="text-espresso/80 font-display text-xl group-hover:text-terracotta transition-colors font-medium">
        {profile.displayName}
      </span>
    </motion.div>
  );
}
