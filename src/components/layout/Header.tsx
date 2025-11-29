'use client';

import { Drawer } from 'vaul';
import { useSession } from '@/context/SessionContext';
import { Avatar } from '@/components/auth/Avatar';
import { LogOut, Users } from 'lucide-react';

export function Header() {
  const { activeProfile, profiles, selectProfile, exitProfile, signOut } = useSession();

  if (!activeProfile) return null;

  return (
    <header className="px-6 py-4 flex justify-between items-center sticky top-0 z-40 bg-ivory/80 backdrop-blur-sm border-b border-parchment/50">
        <h1 className="text-xl font-display font-bold text-espresso">Mise</h1>

        <Drawer.Root>
            <Drawer.Trigger asChild>
                <button className="rounded-full focus:outline-none ring-offset-2 focus:ring-2 ring-terracotta/50 transition-transform active:scale-95">
                    <Avatar color={activeProfile.avatarColor} size="sm" />
                </button>
            </Drawer.Trigger>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-[2px]" />
                <Drawer.Content className="bg-ivory flex flex-col rounded-t-[20px] h-auto max-h-[80vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-parchment shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] focus:outline-none">
                    <div className="p-4 rounded-t-[20px] flex-1">
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-stone-300 mb-8" />

                        <div className="max-w-md mx-auto pb-8">
                            <h3 className="text-lg font-display font-semibold text-espresso mb-6 text-center">Switch Profile</h3>

                            <div className="grid grid-cols-4 gap-4 mb-8">
                                {profiles.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            if (p.id !== activeProfile.id) {
                                                selectProfile(p.id);
                                            }
                                        }}
                                        className={`flex flex-col items-center gap-2 group transition-opacity ${p.id === activeProfile.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                                        disabled={p.id === activeProfile.id}
                                    >
                                        <div className={`rounded-full p-0.5 transition-all ${p.id === activeProfile.id ? 'border-2 border-terracotta scale-110' : 'border-2 border-transparent'}`}>
                                            <Avatar color={p.avatarColor} size="md" />
                                        </div>
                                        <span className={`text-xs font-medium truncate w-full text-center ${p.id === activeProfile.id ? 'text-terracotta' : 'text-espresso/80'}`}>
                                            {p.displayName}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2 border-t border-parchment pt-6">
                                <button
                                    onClick={() => exitProfile()}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-stone-200/50 text-espresso transition-colors"
                                >
                                    <Users size={20} className="text-terracotta" />
                                    <span className="font-medium">Exit Profile</span>
                                </button>

                                <button
                                    onClick={() => signOut()}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 text-red-700 transition-colors"
                                >
                                    <LogOut size={20} />
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
