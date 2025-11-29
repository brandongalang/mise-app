'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, Users } from 'lucide-react';
import { useSession, AVATAR_COLORS, Profile } from '@/contexts/SessionContext';

export function ProfileSwitcher() {
  const router = useRouter();
  const { activeProfile, profiles, household, exitProfile, selectProfile } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle quick switch to another profile
  const handleQuickSwitch = (profile: Profile) => {
    if (profile.has_pin) {
      // Has PIN - go to profile selection page
      setIsOpen(false);
      router.push('/profiles');
    } else {
      // No PIN - switch directly
      selectProfile(profile);
      setIsOpen(false);
    }
  };

  // Exit profile (go back to profile selection)
  const handleExitProfile = () => {
    setIsOpen(false);
    router.push('/profiles');
  };

  // Sign out of household
  const handleSignOut = () => {
    exitProfile();
    setIsOpen(false);
    // TODO: Implement actual sign out when auth is added
    router.push('/profiles');
  };

  if (!activeProfile) {
    return null;
  }

  const otherProfiles = profiles.filter(p => p.id !== activeProfile.id);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-parchment/60 hover:bg-parchment transition-colors"
      >
        <div
          className={`w-8 h-8 rounded-full ${AVATAR_COLORS[activeProfile.avatar_color]} flex items-center justify-center shadow-sm`}
        >
          <span className="text-sm font-display font-bold text-white">
            {activeProfile.display_name.charAt(0).toUpperCase()}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-latte" />
        </motion.div>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute right-0 top-full mt-2 w-64 bg-ivory rounded-2xl shadow-xl border border-clay/10 overflow-hidden z-50"
          >
            {/* Current Profile Header */}
            <div className="px-4 py-3 bg-parchment/50 border-b border-clay/10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${AVATAR_COLORS[activeProfile.avatar_color]} flex items-center justify-center shadow-sm`}
                >
                  <span className="text-lg font-display font-bold text-white">
                    {activeProfile.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-espresso">
                    {activeProfile.display_name}
                  </p>
                  <p className="text-xs text-latte">
                    {household?.name || 'My Household'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Switch - Other Profiles */}
            {otherProfiles.length > 0 && (
              <div className="p-2 border-b border-clay/10">
                <p className="px-2 py-1 text-xs text-latte uppercase tracking-wide">
                  Switch Profile
                </p>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {otherProfiles.map((profile) => (
                    <motion.button
                      key={profile.id}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleQuickSwitch(profile)}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-parchment/50 transition-colors"
                      title={profile.display_name}
                    >
                      <div
                        className={`w-10 h-10 rounded-full ${AVATAR_COLORS[profile.avatar_color]} flex items-center justify-center shadow-sm`}
                      >
                        <span className="text-sm font-display font-bold text-white">
                          {profile.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-latte truncate max-w-full">
                        {profile.display_name.split(' ')[0]}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-2">
              <button
                onClick={handleExitProfile}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-espresso hover:bg-parchment transition-colors"
              >
                <Users className="w-5 h-5 text-latte" />
                <span>All Profiles</span>
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-cayenne hover:bg-cayenne/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
