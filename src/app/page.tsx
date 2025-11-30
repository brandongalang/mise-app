'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { DashboardView } from '@/components/dashboard/DashboardView';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'kitchen' | 'assistant'>('kitchen');
  const [scanTriggered, setScanTriggered] = useState(false);

  const handleScan = () => {
    // Switch to assistant and trigger scan mode
    setActiveTab('assistant');
    setScanTriggered(true);
  };

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {/* 
        We keep both views mounted but toggle visibility.
        This preserves the Chat state (messages) and Dashboard state (scroll position, etc.)
      */}

      <div className={activeTab === 'kitchen' ? 'block h-full' : 'hidden h-full'}>
        <DashboardView onScan={handleScan} onTabChange={setActiveTab} />
      </div>

      <div className={activeTab === 'assistant' ? 'block h-full' : 'hidden h-full'}>
        <ChatContainer
          intent={scanTriggered ? 'scan' : undefined}
          onIntentHandled={() => setScanTriggered(false)}
        />
      </div>
    </MainLayout>
  );
}
