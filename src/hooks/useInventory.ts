import { useState, useEffect, useCallback } from 'react';
import { InventorySummary, InventoryItem } from '@/lib/types';
import { api } from '@/db/supabase';
import { addInventory } from '@/agent/tools/inventory';
import { toast } from 'sonner';
import { withRetry, isRetryableError } from '@/lib/retry';

interface UseInventoryReturn {
    summary: InventorySummary | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
    fetchExpiringItems: () => Promise<InventoryItem[]>;
    fetchLeftovers: () => Promise<InventoryItem[]>;
    addItemsOptimistically: (items: any[]) => Promise<void>;
}

export function useInventory(): UseInventoryReturn {
    const [summary, setSummary] = useState<InventorySummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchInventory = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            await withRetry(async () => {
                const response = await fetch('/api/v1/inventory/summary');
                if (!response.ok) {
                    // Attach status to error for isRetryableError check
                    const error = new Error('Failed to fetch inventory summary');
                    (error as any).status = response.status;
                    throw error;
                }
                const data = await response.json();

                // Map API response to match client type expectations
                const mapItem = (item: any) => ({
                    ...item,
                    id: item.containerId,
                    quantity: item.remainingQty,
                    daysUntilExpiry: item.daysUntilExpiry ?? 0,
                    expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
                    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
                });

                const mappedSummary: InventorySummary = {
                    ...data,
                    expiringSoon: data.expiringSoon.map(mapItem),
                    leftovers: data.leftovers.map(mapItem),
                    categories: Object.entries(data.categories).reduce((acc, [key, val]: [string, any]) => ({
                        ...acc,
                        [key]: {
                            ...val,
                            items: val.items.map(mapItem)
                        }
                    }), {})
                };

                setSummary(mappedSummary);
            }, {
                shouldRetry: isRetryableError,
                onRetry: (attempt) => console.log(`Retrying inventory fetch (attempt ${attempt})...`)
            });

        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Helper to map raw DB response to InventoryItem
    const mapDbItemToInventoryItem = (raw: any): InventoryItem => {
        const content = raw.contents?.[0];
        const master = raw.master_ingredients;

        const now = new Date();
        const expiry = raw.expires_at ? new Date(raw.expires_at) : null;
        const diffTime = expiry ? expiry.getTime() - now.getTime() : 0;
        const daysUntilExpiry = expiry ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

        return {
            id: raw.id,
            containerId: raw.id,
            masterId: master?.id || raw.master_id,
            name: raw.dish_name || master?.canonical_name || "Unknown",
            category: master?.category || null,
            quantity: content?.remaining_qty || 0,
            remainingQty: content?.remaining_qty || 0,
            unit: content?.unit || "",
            status: raw.status,
            purchaseUnit: raw.purchase_unit,
            expiresAt: expiry,
            daysUntilExpiry: daysUntilExpiry,
            isLeftover: !!raw.dish_name,
            dishName: raw.dish_name,
            confidence: raw.confidence,
            source: raw.source,
            createdAt: new Date(raw.created_at),
        };
    };

    const fetchExpiringItems = useCallback(async (): Promise<InventoryItem[]> => {
        const expiringDate = new Date();
        expiringDate.setDate(expiringDate.getDate() + 3);

        const data = await api.containers.findActive({
            statuses: ['SEALED', 'OPEN', 'LOW'],
            expiringBefore: expiringDate
        });

        return data.map(mapDbItemToInventoryItem);
    }, []);

    const fetchLeftovers = useCallback(async (): Promise<InventoryItem[]> => {
        // We want ONLY items that have a dish_name (isDishOnly = true is not directly supported by findActive logic as written in db/supabase.ts which handles false, but we can filter)
        // Actually findActive handles isDishOnly: false to EXCLUDE dishes. To INCLUDE ONLY dishes we might need to filter or adjust findActive.
        // Let's just fetch all active and filter for now to be safe with current API
        const data = await api.containers.findActive({
            statuses: ['SEALED', 'OPEN', 'LOW'],
        });

        return data
            .filter((item: any) => !!item.dish_name) // Filter for leftovers
            .map(mapDbItemToInventoryItem);
    }, []);

    const addItemsOptimistically = useCallback(async (items: any[]) => {
        // 1. Optimistic Update
        const tempItems: InventoryItem[] = items.map(item => ({
            id: `temp-${Date.now()}-${Math.random()}`,
            containerId: `temp-${Date.now()}-${Math.random()}`,
            masterId: 'temp',
            name: item.name,
            quantity: item.contents.quantity,
            remainingQty: item.contents.quantity,
            unit: item.contents.unit,
            category: item.category || 'unknown',
            status: item.container.status || 'SEALED',
            purchaseUnit: item.container.unit,
            expiresAt: item.expiresAt || null,
            daysUntilExpiry: item.expiresAt ? Math.ceil((item.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
            isLeftover: false,
            dishName: null,
            createdAt: new Date(),
            source: item.source,
            confidence: item.confidence
        }));

        // Update local state immediately
        setSummary(prev => {
            if (!prev) return null;
            const newCategories = { ...prev.categories } as Record<string, { items: InventoryItem[], count: number }>;

            tempItems.forEach(item => {
                const cat = item.category || 'unknown';
                if (!newCategories[cat]) {
                    newCategories[cat] = { items: [], count: 0 };
                }
                newCategories[cat] = {
                    ...newCategories[cat],
                    items: [...newCategories[cat].items, item],
                    count: newCategories[cat].count + 1
                };
            });

            return {
                ...prev,
                categories: newCategories
            };
        });

        toast.success(`Saved ${items.length} items to inventory`);

        try {
            // 2. API Call
            await addInventory(items);

            // 3. Refetch to get real IDs and data
            await fetchInventory();
        } catch (err) {
            console.error("Failed to save inventory:", err);
            toast.error("Failed to save items. Rolling back changes.");

            // 4. Rollback
            await fetchInventory();
            throw err;
        }
    }, [fetchInventory]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    return {
        summary,
        isLoading,
        error,
        refetch: fetchInventory,
        fetchExpiringItems,
        fetchLeftovers,
        addItemsOptimistically
    };
}
