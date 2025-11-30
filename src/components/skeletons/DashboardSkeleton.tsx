import { Skeleton } from "@/components/ui/Skeleton";
import { SkeletonCard } from "./SkeletonCard";
import { SkeletonList } from "./SkeletonList";

export function DashboardSkeleton() {
    return (
        <div className="h-full overflow-y-auto bg-ivory pb-24">
            {/* Header Skeleton */}
            <div className="px-5 py-4 border-b border-clay/10">
                <Skeleton variant="text" className="w-1/3 h-8 mb-2" />
                <Skeleton variant="text" className="w-1/4 h-4" />
            </div>

            {/* Quick Actions Skeleton */}
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
                <Skeleton variant="rectangle" className="h-24 rounded-2xl" />
                <Skeleton variant="rectangle" className="h-24 rounded-2xl" />
            </div>

            {/* Eat First Section Skeleton */}
            <div className="px-5 mt-2 space-y-3">
                <Skeleton variant="text" className="w-1/4 h-6" />
                <div className="flex gap-3 overflow-x-auto pb-2">
                    <div className="w-[280px] flex-shrink-0">
                        <SkeletonCard />
                    </div>
                    <div className="w-[280px] flex-shrink-0">
                        <SkeletonCard />
                    </div>
                </div>
            </div>

            {/* Inventory List Skeleton */}
            <div className="px-5 mt-6">
                <div className="flex justify-between items-center mb-4">
                    <Skeleton variant="text" className="w-1/4 h-6" />
                    <Skeleton variant="rectangle" className="w-16 h-6 rounded-full" />
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-4 overflow-x-auto">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} variant="rectangle" className="w-20 h-8 rounded-full flex-shrink-0" />
                    ))}
                </div>

                <SkeletonList />
            </div>
        </div>
    );
}
