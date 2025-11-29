'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { DashboardView } from '@/components/dashboard/DashboardView';

export default function Home() {
  const { activeProfile, isLoading } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'kitchen' | 'assistant'>('kitchen');

  useEffect(() => {
    if (!isLoading && !activeProfile) {
      router.push('/profiles');
    }
  }, [isLoading, activeProfile, router]);

  const handleScan = () => {
    setActiveTab('assistant');
  };

  if (isLoading || !activeProfile) {
    return null; // Or a loading spinner
  }

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className={activeTab === 'kitchen' ? 'block h-full' : 'hidden h-full'}>
        <DashboardView onScan={handleScan} />
      </div>

      <div className={activeTab === 'assistant' ? 'block h-full' : 'hidden h-full'}>
        <ChatContainer />
      </div>
    </MainLayout>
  );
}
