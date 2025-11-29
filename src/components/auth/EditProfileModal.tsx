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
    <div className="fixed inset-0 bg-ivory/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-parchment w-full max-w-lg p-8 rounded-2xl shadow-xl relative card-elevated">
        <button
            onClick={onClose}
            className="absolute top-4 right-4 text-warm-gray hover:text-espresso transition-colors"
        >
            <X size={20} />
        </button>

        <h2 className="text-2xl font-display text-espresso mb-8 border-b border-parchment pb-4">
            Edit Profile
        </h2>

        <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar Preview */}
            <div className="flex flex-col items-center gap-4">
                <Avatar color={color} size="xl" className="shadow-lg" />
            </div>

            {/* Form */}
            <div className="flex-1 space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-mocha mb-2">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-warm-white border border-warm-gray-light rounded-lg px-4 py-3 text-espresso focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-mocha mb-2">Color</label>
                    <div className="flex gap-3">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full transition-all ${c === color ? 'ring-2 ring-terracotta ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
                            >
                                <div className={`w-full h-full rounded-full ${getColorClass(c)} shadow-sm`}></div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-6 flex justify-between items-center border-t border-parchment mt-6">
                    <button
                        onClick={() => {
                            if (confirm("Are you sure you want to delete this profile?")) {
                                onDelete(profile.id);
                                onClose();
                            }
                        }}
                        className="text-cayenne hover:text-red-700 text-sm font-semibold flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                       <Trash2 size={16} /> Delete
                    </button>

                    <button
                        onClick={handleSave}
                        className="bg-espresso text-white px-6 py-2 rounded-full font-bold hover:bg-terracotta transition-colors shadow-md hover:shadow-lg transform active:scale-95 duration-200"
                    >
                        Save Changes
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
