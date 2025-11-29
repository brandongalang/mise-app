"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock } from "lucide-react";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profileName: string;
  expectedPinHash: string; // Ideally we verify on server, but for now/mock we verify locally or send to "API".
}

export function PinModal({ isOpen, onClose, onSuccess, profileName, expectedPinHash }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when open
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 4);
    setPin(val);

    if (val.length === 4) {
      // Validate
      // Note: In real app, we send `val` to server to verify against hash.
      // Here we mock check.
      // For the mock data, "hashed_1234" implies PIN is "1234".
      const isValid = (expectedPinHash === "hashed_1234" && val === "1234") || expectedPinHash !== "hashed_1234";

      if (isValid) {
        // Success animation wait
        setTimeout(() => {
           onSuccess();
        }, 300);
      } else {
        // Error shake
        setIsShaking(true);
        if (typeof navigator.vibrate === "function") navigator.vibrate(200);
        setTimeout(() => {
          setIsShaking(false);
          setPin("");
        }, 500);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay - Glass Frosted Ivory */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ivory/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md flex flex-col items-center bg-white border border-parchment shadow-xl rounded-2xl p-10 relative"
            >
              <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-warm-gray hover:text-espresso transition-colors"
              >
                  <X size={20} />
              </button>

              <div className="w-12 h-12 bg-terracotta/10 rounded-full flex items-center justify-center mb-6">
                 <Lock className="text-terracotta w-6 h-6" />
              </div>

              <h2 className="text-espresso text-2xl font-display font-bold mb-2">
                Enter PIN
              </h2>
              <p className="text-mocha mb-8">
                Please enter the 4-digit PIN for <strong>{profileName}</strong>
              </p>

              <motion.div
                className="flex gap-4 mb-8 relative"
                animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                      pin.length > i
                        ? "bg-terracotta border-terracotta scale-110"
                        : "bg-transparent border-warm-gray-light"
                    }`}
                  />
                ))}

                {/* Hidden Input for Mobile Keyboard */}
                <input
                  ref={inputRef}
                  type="number"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  value={pin}
                  onChange={handleInput}
                  autoFocus
                />
              </motion.div>

              <div className="text-center text-xs text-warm-gray uppercase tracking-widest font-semibold">
                Secured Profile
              </div>

            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
