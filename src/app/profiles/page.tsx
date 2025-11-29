"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "@/context/SessionContext";
import { ProfileCard } from "@/components/auth/ProfileCard";
import { PinModal } from "@/components/auth/PinModal";
import { EditProfileModal } from "@/components/auth/EditProfileModal";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";

export default function ProfileSelectionPage() {
  const { profiles, selectProfile, refreshProfiles } = useSession();
  const router = useRouter();

  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);

  const handleProfileClick = (profile: any) => {
    if (isManageMode) {
      setEditingProfile(profile);
    } else {
      if (profile.pinHash) {
        setSelectedProfile(profile);
        setIsPinOpen(true);
      } else {
        selectProfile(profile.id);
        router.push("/");
      }
    }
  };

  const handlePinSuccess = () => {
    if (selectedProfile) {
      selectProfile(selectedProfile.id);
      setIsPinOpen(false);
      router.push("/");
    }
  };

  const handleSaveProfile = async (updated: any) => {
      // Logic to update profile via API would go here
      console.log("Updating profile", updated);
      setEditingProfile(null);
      refreshProfiles();
  };

  const handleDeleteProfile = async (id: string) => {
      console.log("Deleting profile", id);
      setEditingProfile(null);
      refreshProfiles();
  };

  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center p-8 overflow-hidden relative">
       {/* Background gradient hint */}
       <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/80 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-5xl flex flex-col items-center"
      >
        <h1 className="text-3xl md:text-5xl font-display text-white mb-12 tracking-tight">
          Who's cooking today?
        </h1>

        <motion.div
          className="flex flex-wrap justify-center gap-8 md:gap-12"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          initial="hidden"
          animate="show"
        >
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onClick={handleProfileClick}
              isManaging={isManageMode}
            />
          ))}

          {/* Add Profile Button (Visible only if not too many profiles? For now always) */}
          <motion.div
             variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.95 }}
             className="flex flex-col items-center gap-3 cursor-pointer group"
          >
             <div className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center border-2 border-white/20 hover:bg-white/10 hover:border-white transition-all">
                <PlusCircle className="text-gray-400 group-hover:text-white w-12 h-12" />
             </div>
             <span className="text-gray-400 font-display text-lg group-hover:text-white transition-colors">
                Add Profile
             </span>
          </motion.div>
        </motion.div>

        <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={() => setIsManageMode(!isManageMode)}
            className={`mt-16 px-6 py-2 border border-white/30 text-white/50 hover:text-white hover:border-white uppercase tracking-widest text-sm transition-colors ${isManageMode ? 'bg-white text-black hover:text-black hover:bg-white/90 border-transparent' : ''}`}
        >
            {isManageMode ? "Done" : "Manage Profiles"}
        </motion.button>

      </motion.div>

      {/* Modals */}
      <PinModal
        isOpen={isPinOpen}
        onClose={() => setIsPinOpen(false)}
        onSuccess={handlePinSuccess}
        profileName={selectedProfile?.displayName || ""}
        expectedPinHash={selectedProfile?.pinHash || ""}
      />

      <EditProfileModal
        isOpen={!!editingProfile}
        onClose={() => setEditingProfile(null)}
        profile={editingProfile}
        onSave={handleSaveProfile}
        onDelete={handleDeleteProfile}
      />
    </div>
  );
}
