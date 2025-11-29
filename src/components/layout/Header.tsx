"use client";

import { useSession } from "@/context/SessionContext";
import Avatar from "@/components/auth/Avatar";
import { Drawer } from "vaul";
import { LogOut, Settings, ChevronDown } from "lucide-react";

export default function Header() {
  const { activeProfile, profiles, switchProfile, exitProfile } = useSession();

  // If no profile is active, we probably shouldn't show this header or show a login version.
  // For now, if no profile, return null.
  if (!activeProfile) return null;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[var(--color-ivory)]/90 backdrop-blur-sm border-b border-[var(--color-stone-200)] flex items-center justify-between px-4 z-40">
       {/* Left side - Logo */}
       <div className="font-display font-bold text-xl text-[var(--color-espresso)]">
          Mise
       </div>

       {/* Right side - Profile Switcher */}
       <Drawer.Root>
          <Drawer.Trigger asChild>
            <button className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-black/5 transition-colors focus:outline-none">
               <Avatar url={activeProfile.avatar_url} name={activeProfile.display_name} size="sm" />
               <ChevronDown className="w-4 h-4 text-[var(--color-stone-500)]" />
            </button>
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
            <Drawer.Content className="bg-[var(--color-ivory)] flex flex-col rounded-t-[10px] h-[400px] mt-24 fixed bottom-0 left-0 right-0 z-50 focus:outline-none shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
               <div className="p-4 bg-[var(--color-ivory)] rounded-t-[10px] flex-1 flex flex-col">
                  <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-stone-300 mb-8" />
                  <div className="max-w-md mx-auto w-full">
                    <Drawer.Title className="font-display font-medium text-lg text-center mb-6 text-[var(--color-espresso)]">
                      Switch Profile
                    </Drawer.Title>

                    <div className="grid grid-cols-3 gap-6 mb-8 justify-items-center">
                       {profiles.map((profile) => (
                         <button
                           key={profile.id}
                           onClick={() => switchProfile(profile.id)}
                           className="flex flex-col items-center gap-2 group focus:outline-none"
                         >
                            <div className={`relative transition-transform duration-200 ${activeProfile.id === profile.id ? 'ring-2 ring-[var(--color-terracotta)] ring-offset-2 rounded-full scale-105' : 'group-hover:scale-105'}`}>
                               <Avatar url={profile.avatar_url} name={profile.display_name} size="md" />
                            </div>
                            <span className={`text-sm ${activeProfile.id === profile.id ? 'font-bold text-[var(--color-terracotta)]' : 'text-[var(--color-stone-500)]'}`}>
                              {profile.display_name}
                            </span>
                         </button>
                       ))}
                    </div>

                    <div className="space-y-2 border-t border-[var(--color-stone-200)] pt-4">
                        <button onClick={exitProfile} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-stone-100 text-[var(--color-espresso)] transition-colors">
                            <Settings className="w-5 h-5 text-[var(--color-stone-500)]" />
                            <span className="font-medium">Manage Profiles</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 text-[var(--color-cayenne)] transition-colors">
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Sign Out</span>
                        </button>
                    </div>
                  </div>
               </div>
            </Drawer.Content>
          </Drawer.Portal>
       </Drawer.Root>
    </header>
  );
}
