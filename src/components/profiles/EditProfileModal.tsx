'use client';

import { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { motion } from 'framer-motion';
import { X, Trash2, Lock, LockOpen, Check } from 'lucide-react';
import { Profile, AVATAR_COLORS, AvatarColor, useSession } from '@/contexts/SessionContext';

interface EditProfileModalProps {
  profile: Profile | null;
  open: boolean;
  onClose: () => void;
  isCreating?: boolean;
}

export function EditProfileModal({ profile, open, onClose, isCreating = false }: EditProfileModalProps) {
  const { updateProfile, deleteProfile, setProfilePin, createProfile, profiles } = useSession();

  const [displayName, setDisplayName] = useState('');
  const [avatarColor, setAvatarColor] = useState<AvatarColor>('terracotta');
  const [showPinInput, setShowPinInput] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset form when profile changes
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setAvatarColor(profile.avatar_color);
    } else if (isCreating) {
      setDisplayName('');
      setAvatarColor('terracotta');
    }
    setShowPinInput(false);
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    setShowDeleteConfirm(false);
  }, [profile, isCreating, open]);

  const handleSave = async () => {
    if (!displayName.trim()) return;

    setIsSaving(true);
    try {
      if (isCreating) {
        await createProfile(displayName.trim(), avatarColor);
      } else if (profile) {
        await updateProfile(profile.id, {
          display_name: displayName.trim(),
          avatar_color: avatarColor,
        });
      }
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetPin = async () => {
    if (!profile) return;

    // Validate PIN
    if (newPin.length !== 4) {
      setPinError('PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }

    setIsSaving(true);
    try {
      await setProfilePin(profile.id, newPin);
      setShowPinInput(false);
      setNewPin('');
      setConfirmPin('');
      setPinError('');
    } catch (error) {
      console.error('Failed to set PIN:', error);
      setPinError('Failed to set PIN');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePin = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      await setProfilePin(profile.id, null);
    } catch (error) {
      console.error('Failed to remove PIN:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!profile) return;

    setIsDeleting(true);
    try {
      await deleteProfile(profile.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete profile:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasPin = profile?.has_pin ?? false;
  const isOnlyAdmin = profile?.is_admin && profiles.filter(p => p.is_admin).length === 1;
  const canDelete = !profile?.is_admin || !isOnlyAdmin;

  const colorOptions: AvatarColor[] = ['terracotta', 'olive', 'marigold', 'sage', 'plum', 'ocean'];

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-espresso/40 backdrop-blur-sm z-50" />
        <Drawer.Content className="bg-ivory flex flex-col rounded-t-3xl h-auto max-h-[85vh] fixed bottom-0 left-0 right-0 outline-none shadow-xl z-50">
          {/* Handle */}
          <div className="pt-3 pb-2">
            <div className="mx-auto w-12 h-1.5 rounded-full bg-warm-gray-light" />
          </div>

          <div className="px-5 pb-8 flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-xl font-bold text-espresso">
                {isCreating ? 'Create Profile' : 'Edit Profile'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-latte hover:text-espresso hover:bg-parchment transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Avatar Preview */}
            <div className="flex justify-center mb-6">
              <div
                className={`w-24 h-24 rounded-full ${AVATAR_COLORS[avatarColor]} flex items-center justify-center shadow-lg`}
              >
                <span className="text-4xl font-display font-bold text-white">
                  {displayName.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            </div>

            {/* Name Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-latte mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter name"
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl bg-parchment border border-clay/10 text-espresso placeholder-warm-gray focus:outline-none focus:ring-2 focus:ring-terracotta font-body"
              />
            </div>

            {/* Color Picker */}
            <div className="mb-6">
              <label id="color-picker-label" className="block text-sm font-medium text-latte mb-3">
                Avatar Color
              </label>
              <div
                className="flex gap-3 justify-center"
                role="radiogroup"
                aria-labelledby="color-picker-label"
              >
                {colorOptions.map((color) => (
                  <motion.button
                    key={color}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setAvatarColor(color)}
                    className={`w-12 h-12 rounded-full ${AVATAR_COLORS[color]} transition-all ${
                      avatarColor === color
                        ? 'ring-4 ring-espresso ring-offset-2 ring-offset-ivory scale-110'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    role="radio"
                    aria-checked={avatarColor === color}
                    aria-label={`Select ${color} color`}
                  />
                ))}
              </div>
            </div>

            {/* PIN Section (only for existing profiles) */}
            {!isCreating && profile && (
              <div className="mb-6 p-4 rounded-xl bg-parchment/50 border border-clay/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {hasPin ? (
                      <Lock className="w-5 h-5 text-terracotta" />
                    ) : (
                      <LockOpen className="w-5 h-5 text-latte" />
                    )}
                    <span className="font-medium text-espresso">PIN Protection</span>
                  </div>
                  {hasPin && !showPinInput && (
                    <button
                      onClick={handleRemovePin}
                      disabled={isSaving}
                      className="text-sm text-cayenne hover:text-cayenne/80 transition-colors"
                    >
                      Remove PIN
                    </button>
                  )}
                </div>

                {!hasPin && !showPinInput && (
                  <button
                    onClick={() => setShowPinInput(true)}
                    className="w-full py-2 text-sm text-terracotta hover:text-terracotta-dark transition-colors"
                  >
                    + Add PIN protection
                  </button>
                )}

                {showPinInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3"
                  >
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => {
                        setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                        setPinError('');
                      }}
                      placeholder="Enter 4-digit PIN"
                      className="w-full px-4 py-3 rounded-xl bg-ivory border border-clay/10 text-espresso placeholder-warm-gray focus:outline-none focus:ring-2 focus:ring-terracotta font-body text-center tracking-widest"
                    />
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => {
                        setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                        setPinError('');
                      }}
                      placeholder="Confirm PIN"
                      className="w-full px-4 py-3 rounded-xl bg-ivory border border-clay/10 text-espresso placeholder-warm-gray focus:outline-none focus:ring-2 focus:ring-terracotta font-body text-center tracking-widest"
                    />
                    {pinError && (
                      <p className="text-sm text-cayenne text-center">{pinError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowPinInput(false);
                          setNewPin('');
                          setConfirmPin('');
                          setPinError('');
                        }}
                        className="flex-1 py-2 rounded-xl text-latte hover:bg-parchment transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSetPin}
                        disabled={isSaving || newPin.length !== 4}
                        className="flex-1 py-2 rounded-xl bg-terracotta text-white hover:bg-terracotta-dark transition-colors disabled:opacity-50"
                      >
                        {hasPin ? 'Update PIN' : 'Set PIN'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {hasPin && !showPinInput && (
                  <button
                    onClick={() => setShowPinInput(true)}
                    className="w-full py-2 text-sm text-terracotta hover:text-terracotta-dark transition-colors"
                  >
                    Change PIN
                  </button>
                )}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || !displayName.trim()}
              className="w-full py-4 rounded-xl bg-terracotta text-white font-semibold hover:bg-terracotta-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <motion.div
                  className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <>
                  <Check size={20} />
                  {isCreating ? 'Create Profile' : 'Save Changes'}
                </>
              )}
            </button>

            {/* Delete Section (only for existing profiles that can be deleted) */}
            {!isCreating && profile && canDelete && (
              <div className="mt-6 pt-6 border-t border-clay/10">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 rounded-xl text-cayenne hover:bg-cayenne/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete Profile
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <p className="text-center text-sm text-latte">
                      Are you sure? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-3 rounded-xl text-latte hover:bg-parchment transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 py-3 rounded-xl bg-cayenne text-white hover:bg-cayenne/90 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Warning for only admin */}
            {!isCreating && profile && !canDelete && (
              <p className="mt-4 text-center text-sm text-latte">
                Cannot delete the only admin profile
              </p>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
