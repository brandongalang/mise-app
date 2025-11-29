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
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-8 overflow-hidden relative texture-paper">

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-5xl flex flex-col items-center"
      >
        <h1 className="text-4xl md:text-6xl font-display text-terracotta mb-16 tracking-tight text-center">
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

          {/* Add Profile Button */}
          <motion.div
             variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
             whileHover={{ scale: 1.05, y: -5 }}
             whileTap={{ scale: 0.95 }}
             className="flex flex-col items-center gap-4 cursor-pointer group"
          >
             <div className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center border-2 border-warm-gray-light bg-white hover:border-terracotta/50 hover:bg-white shadow-sm hover:shadow-md transition-all">
                <PlusCircle className="text-warm-gray group-hover:text-terracotta w-10 h-10 transition-colors" />
             </div>
             <span className="text-warm-gray font-display text-xl group-hover:text-terracotta transition-colors">
                Add Profile
             </span>
          </motion.div>
        </motion.div>

        <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={() => setIsManageMode(!isManageMode)}
            className={`mt-20 px-8 py-2.5 border border-warm-gray-light text-mocha hover:text-espresso hover:border-espresso uppercase tracking-widest text-sm font-semibold transition-all rounded-full ${isManageMode ? 'bg-espresso text-white hover:text-white hover:bg-espresso/90 border-transparent shadow-lg' : ''}`}
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
