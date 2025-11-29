import { useState, useEffect, useCallback } from 'react';
import { InventorySummary } from '@/lib/types';

interface UseInventoryReturn {
    summary: InventorySummary | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

export function useInventory(): UseInventoryReturn {
    const [summary, setSummary] = useState<InventorySummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchInventory = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch('/api/v1/inventory/summary');
            if (!response.ok) {
                throw new Error('Failed to fetch inventory summary');
            }
            const data = await response.json();

            // Map API response to match client type expectations
            // We need to ensure 'id' and 'quantity' are present and 'daysUntilExpiry' is a number
            const mapItem = (item: any) => ({
                ...item,
                id: item.containerId,
                quantity: item.remainingQty,
                daysUntilExpiry: item.daysUntilExpiry ?? 0, // Default to 0 if null
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
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    return {
        summary,
        isLoading,
        error,
        refetch: fetchInventory,
    };
}
