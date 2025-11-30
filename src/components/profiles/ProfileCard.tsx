'use client';

import { motion } from 'framer-motion';
import { Lock, Pencil } from 'lucide-react';
import { Profile, AVATAR_COLORS } from '@/contexts/SessionContext';

interface ProfileCardProps {
  profile: Profile;
  isManaging: boolean;
  onSelect: () => void;
  onEdit?: () => void;
}

export function ProfileCard({ profile, isManaging, onSelect, onEdit }: ProfileCardProps) {
  const hasPin = profile.has_pin;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={isManaging ? onEdit : onSelect}
      className="group flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-cream-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
      aria-label={
        isManaging
          ? `Edit ${profile.display_name}'s profile`
          : `Select ${profile.display_name}${hasPin ? ' (PIN protected)' : ''}${profile.is_admin ? ' (Admin)' : ''}`
      }
    >
      {/* Avatar */}
      <div className="relative" aria-hidden="true">
        <div
          className={`w-24 h-24 rounded-full ${AVATAR_COLORS[profile.avatar_color]} flex items-center justify-center shadow-sm border-2 border-white transition-shadow group-hover:shadow-md`}
        >
          <span className="text-4xl font-display font-bold text-white select-none">
            {profile.display_name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Lock icon (shown on hover when PIN exists) */}
        {hasPin && !isManaging && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-charcoal/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          >
            <Lock className="w-8 h-8 text-white" />
          </motion.div>
        )}

        {/* Edit overlay (shown in manage mode) */}
        {isManaging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-charcoal/60 rounded-full backdrop-blur-sm"
          >
            <Pencil className="w-8 h-8 text-white" />
          </motion.div>
        )}

        {/* Admin badge */}
        {profile.is_admin && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-clay flex items-center justify-center shadow-md border border-white"
          >
            <span className="text-xs font-bold text-white">A</span>
          </motion.div>
        )}
      </div>

      {/* Name */}
      <span className="font-display text-lg font-semibold text-charcoal group-hover:text-clay transition-colors">
        {profile.display_name}
      </span>
    </motion.button>
  );
}
