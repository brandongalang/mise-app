"use client";

import React, { useState } from "react";
// Using custom modal for now to match PinModal style
import { Profile } from "@/types/auth";
import { X, Trash2, Check } from "lucide-react";
import { Avatar } from "./Avatar";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSave: (updatedProfile: Profile) => void;
  onDelete: (profileId: string) => void;
}

const COLORS = ["classic-red", "ocean-blue", "jungle-green", "royal-purple", "sunny-yellow"];

export function EditProfileModal({ isOpen, onClose, profile, onSave, onDelete }: EditProfileModalProps) {
  const [name, setName] = useState(profile?.displayName || "");
  const [color, setColor] = useState(profile?.avatarColor || "classic-red");

  // Update state when profile changes
  React.useEffect(() => {
    if (profile) {
        setName(profile.displayName);
        setColor(profile.avatarColor);
    }
  }, [profile]);

  if (!isOpen || !profile) return null;

  const handleSave = () => {
    onSave({ ...profile, displayName: name, avatarColor: color });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-lg p-8 rounded-2xl shadow-2xl relative">
        <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white"
        >
            <X />
        </button>

        <h2 className="text-2xl font-display text-white mb-8 border-b border-white/10 pb-4">
            Edit Profile
        </h2>

        <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar Preview */}
            <div className="flex flex-col items-center gap-4">
                <Avatar color={color} size="xl" />
            </div>

            {/* Form */}
            <div className="flex-1 space-y-6">
                <div>
                    <label className="block text-sm text-gray-400 mb-2">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#333] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/50"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-2">Color</label>
                    <div className="flex gap-3">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full ${c === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                                style={{ backgroundColor: getComputedStyle(document.documentElement).getPropertyValue(`--color-${c}`) }} // Fallback or use class
                            >
                                <div className={`w-full h-full rounded-full ${getColorClass(c)}`}></div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-6 flex justify-between items-center border-t border-white/10 mt-6">
                    <button
                        onClick={() => {
                            if (confirm("Are you sure you want to delete this profile?")) {
                                onDelete(profile.id);
                                onClose();
                            }
                        }}
                        className="text-red-400 hover:text-red-300 text-sm font-semibold flex items-center gap-2"
                    >
                       <Trash2 size={16} /> Delete
                    </button>

                    <button
                        onClick={handleSave}
                        className="bg-white text-black px-6 py-2 rounded-full font-bold hover:scale-105 transition-transform"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function getColorClass(colorName: string) {
     const AVATAR_VARIANTS: Record<string, string> = {
        "classic-red": "bg-red-600",
        "ocean-blue": "bg-blue-500",
        "jungle-green": "bg-emerald-500",
        "royal-purple": "bg-purple-600",
        "sunny-yellow": "bg-yellow-500",
    };
    return AVATAR_VARIANTS[colorName] || "bg-gray-500";
}
