'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LogOut } from 'lucide-react';
import { useSession, Profile, PinValidationResult } from '@/contexts/SessionContext';
import { ProfileCard } from '@/components/profiles/ProfileCard';
import { PinModal } from '@/components/profiles/PinModal';
import { EditProfileModal } from '@/components/profiles/EditProfileModal';

export default function ProfilesPage() {
  const router = useRouter();
  const { household, profiles, isLoading, selectProfile, validatePin, exitProfile } = useSession();

  const [isManaging, setIsManaging] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Handle profile selection
  const handleSelectProfile = (profile: Profile) => {
    if (profile.has_pin) {
      // Has PIN - show modal
      setSelectedProfile(profile);
      setShowPinModal(true);
    } else {
      // No PIN - select directly
      selectProfile(profile);
      router.push('/');
    }
  };

  // Handle PIN success
  const handlePinSuccess = () => {
    if (selectedProfile) {
      selectProfile(selectedProfile);
      setShowPinModal(false);
      setSelectedProfile(null);
      router.push('/');
    }
  };

  // Handle PIN validation
  const handleValidatePin = async (pin: string): Promise<PinValidationResult> => {
    if (!selectedProfile) return { success: false, error: 'unauthorized' };
    return validatePin(selectedProfile.id, pin);
  };

  // Handle edit profile
  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ivory texture-paper flex items-center justify-center">
        <motion.div
          className="w-12 h-12 rounded-full border-3 border-terracotta/30 border-t-terracotta"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory texture-paper">
      {/* Warm gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-parchment/30 pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-screen px-5 py-8 pt-safe-top pb-safe-bottom">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm text-latte font-medium"
            >
              {household?.name || 'My Household'}
            </motion.p>
          </div>

          <button
            onClick={() => setIsManaging(!isManaging)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              isManaging
                ? 'bg-terracotta text-white'
                : 'text-latte hover:text-espresso hover:bg-parchment'
            }`}
          >
            {isManaging ? 'Done' : 'Manage'}
          </button>
        </motion.header>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-espresso mb-2">
            Who&apos;s cooking today?
          </h1>
          <p className="text-latte">
            Select your profile to continue
          </p>
        </motion.div>

        {/* Profile Grid */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.08 }
            }
          }}
          className="flex-1 flex justify-center"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 content-start">
            <AnimatePresence mode="popLayout">
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  isManaging={isManaging}
                  onSelect={() => handleSelectProfile(profile)}
                  onEdit={() => handleEditProfile(profile)}
                />
              ))}

              {/* Add Profile Button (shown in manage mode) */}
              {isManaging && (
                <motion.button
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsCreating(true)}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-clay/20 hover:border-terracotta/50 hover:bg-parchment/30 transition-colors group"
                >
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-clay/20 group-hover:border-terracotta/50 flex items-center justify-center transition-colors">
                    <Plus className="w-10 h-10 text-latte group-hover:text-terracotta transition-colors" />
                  </div>
                  <span className="font-display text-lg font-semibold text-latte group-hover:text-terracotta transition-colors">
                    Add Profile
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer - Sign out */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-auto pt-8 flex justify-center"
        >
          <button
            onClick={exitProfile}
            className="flex items-center gap-2 px-4 py-2 text-sm text-latte hover:text-cayenne transition-colors"
          >
            <LogOut size={16} />
            Sign out of {household?.name || 'Household'}
          </button>
        </motion.footer>
      </div>

      {/* PIN Modal */}
      {selectedProfile && (
        <PinModal
          profile={selectedProfile}
          open={showPinModal}
          onClose={() => {
            setShowPinModal(false);
            setSelectedProfile(null);
          }}
          onSuccess={handlePinSuccess}
          onValidate={handleValidatePin}
        />
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        profile={editingProfile}
        open={editingProfile !== null || isCreating}
        onClose={() => {
          setEditingProfile(null);
          setIsCreating(false);
        }}
        isCreating={isCreating}
      />
    </div>
  );
}
