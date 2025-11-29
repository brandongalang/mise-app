'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Clock } from 'lucide-react';
import { Profile, AVATAR_COLORS, PinValidationResult } from '@/contexts/SessionContext';

interface PinModalProps {
  profile: Profile;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onValidate: (pin: string) => Promise<PinValidationResult>;
}

export function PinModal({ profile, open, onClose, onSuccess, onValidate }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());

  // Helper to set timeout and track it for cleanup
  const safeSetTimeout = useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutRefs.current.delete(id);
      callback();
    }, delay);
    timeoutRefs.current.add(id);
    return id;
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current && !lockedUntil) {
      safeSetTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, safeSetTimeout, lockedUntil]);

  // Reset state and cleanup timeouts when closed
  useEffect(() => {
    if (!open) {
      setPin('');
      setIsShaking(false);
      setIsValidating(false);
      setErrorMessage(null);
      setAttemptsRemaining(null);
      setLockedUntil(null);
      setLockCountdown(0);
      timeoutRefs.current.forEach(id => clearTimeout(id));
      timeoutRefs.current.clear();
    }
  }, [open]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(id => clearTimeout(id));
      timeoutRefs.current.clear();
    };
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) return;

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
      setLockCountdown(remaining);

      if (remaining <= 0) {
        setLockedUntil(null);
        setErrorMessage(null);
        inputRef.current?.focus();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handlePinChange = useCallback(async (value: string) => {
    // Don't allow input if locked
    if (lockedUntil) return;

    // Only allow digits and max 4 characters
    const sanitized = value.replace(/\D/g, '').slice(0, 4);
    setPin(sanitized);
    setErrorMessage(null);

    // Auto-submit when 4 digits entered
    if (sanitized.length === 4) {
      setIsValidating(true);

      try {
        const result = await onValidate(sanitized);

        if (result.success) {
          // Brief pause then success
          safeSetTimeout(() => {
            onSuccess();
          }, 300);
        } else if (result.error === 'locked') {
          // Account is locked
          setErrorMessage(result.message || 'Too many attempts. Please wait.');
          if (result.locked_until) {
            setLockedUntil(new Date(result.locked_until));
          }
          setPin('');
          setIsValidating(false);
        } else {
          // Invalid PIN - shake and show remaining attempts
          setIsShaking(true);
          setAttemptsRemaining(result.attempts_remaining ?? null);

          if (result.attempts_remaining !== undefined && result.attempts_remaining <= 2) {
            setErrorMessage(
              result.attempts_remaining === 0
                ? 'Last attempt before lockout'
                : `${result.attempts_remaining} attempt${result.attempts_remaining === 1 ? '' : 's'} remaining`
            );
          }

          // Haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate([50, 30, 50]);
          }

          safeSetTimeout(() => {
            setIsShaking(false);
            setPin('');
            setIsValidating(false);
            inputRef.current?.focus();
          }, 500);
        }
      } catch (error) {
        console.error('PIN validation error:', error);
        setErrorMessage('Something went wrong. Please try again.');
        setIsShaking(true);
        safeSetTimeout(() => {
          setIsShaking(false);
          setPin('');
          setIsValidating(false);
          inputRef.current?.focus();
        }, 500);
      }
    }
  }, [onValidate, onSuccess, safeSetTimeout, lockedUntil]);

  const shakeAnimation = {
    x: [0, -12, 12, -12, 12, -6, 6, 0],
    transition: { duration: 0.5 }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  const isLocked = lockedUntil !== null && lockCountdown > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/80 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pin-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative bg-ivory rounded-2xl shadow-xl p-8 mx-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-latte hover:text-espresso hover:bg-parchment transition-colors"
              aria-label="Close PIN entry"
            >
              <X size={20} />
            </button>

            {/* Profile avatar */}
            <div className="flex flex-col items-center mb-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className={`w-20 h-20 rounded-full ${AVATAR_COLORS[profile.avatar_color]} flex items-center justify-center shadow-lg`}
                aria-hidden="true"
              >
                <span className="text-3xl font-display font-bold text-white">
                  {profile.display_name.charAt(0).toUpperCase()}
                </span>
              </motion.div>

              <motion.h2
                id="pin-modal-title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-4 font-display text-xl font-bold text-espresso"
              >
                Enter PIN for {profile.display_name}
              </motion.h2>
            </div>

            {/* Locked state */}
            {isLocked && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl bg-cayenne/10 border border-cayenne/20 text-center"
              >
                <div className="flex items-center justify-center gap-2 text-cayenne mb-2">
                  <Clock size={18} />
                  <span className="font-semibold">Temporarily Locked</span>
                </div>
                <p className="text-sm text-cayenne/80">
                  Try again in <span className="font-mono font-bold">{formatCountdown(lockCountdown)}</span>
                </p>
              </motion.div>
            )}

            {/* PIN dots */}
            {!isLocked && (
              <motion.div
                animate={isShaking ? shakeAnimation : {}}
                className="flex justify-center gap-4 mb-4"
                role="group"
                aria-label="PIN entry dots"
              >
                {[0, 1, 2, 3].map((index) => (
                  <motion.div
                    key={index}
                    initial={false}
                    animate={{
                      scale: pin.length > index ? 1.1 : 1,
                      backgroundColor: pin.length > index
                        ? 'var(--color-terracotta)'
                        : 'transparent',
                      borderColor: pin.length > index
                        ? 'var(--color-terracotta)'
                        : 'var(--color-latte)',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="w-4 h-4 rounded-full border-2"
                    aria-hidden="true"
                  />
                ))}
              </motion.div>
            )}

            {/* Error message */}
            <AnimatePresence mode="wait">
              {errorMessage && !isLocked && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 flex items-center justify-center gap-2 text-cayenne text-sm"
                  role="alert"
                >
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hidden input for keyboard */}
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              disabled={isValidating || isLocked}
              className="absolute opacity-0 w-0 h-0"
              autoComplete="off"
              aria-label="Enter 4-digit PIN"
            />

            {/* Tap to enter hint */}
            {!isLocked && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center text-sm text-latte"
              >
                {isValidating ? 'Verifying...' : 'Tap anywhere to enter PIN'}
              </motion.p>
            )}

            {/* Clickable area to focus input */}
            {!isLocked && (
              <button
                onClick={() => inputRef.current?.focus()}
                className="absolute inset-0 w-full h-full opacity-0 cursor-text"
                aria-label="Focus PIN input"
                disabled={isLocked}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
