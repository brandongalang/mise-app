'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { DashboardView } from '@/components/dashboard/DashboardView';
import RecipeLibrary from '@/components/recipes/RecipeLibrary';
import WeeklyPlanView from '@/components/meal-plan/WeeklyPlanView';
import GroceryListView from '@/components/grocery/GroceryListView';
import type { TabId } from '@/components/layout/BottomNav';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('kitchen');
  const [scanTriggered, setScanTriggered] = useState(false);

  const handleScan = () => {
    // Switch to assistant and trigger scan mode
    setActiveTab('assistant');
    setScanTriggered(true);
  };

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {/* 
        We keep all views mounted but toggle visibility.
        This preserves state (messages, scroll position, etc.)
      */}

      <div className={activeTab === 'kitchen' ? 'block h-full' : 'hidden h-full'}>
        <DashboardView onScan={handleScan} onTabChange={setActiveTab} />
      </div>

      <div className={activeTab === 'plan' ? 'block h-full' : 'hidden h-full'}>
        <WeeklyPlanView />
      </div>

      <div className={activeTab === 'recipes' ? 'block h-full' : 'hidden h-full'}>
        <RecipeLibrary />
      </div>

      <div className={activeTab === 'shop' ? 'block h-full' : 'hidden h-full'}>
        <GroceryListView />
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
