import { Skeleton } from "@/components/ui/Skeleton";

export function SkeletonCard() {
    return (
        <div className="p-4 bg-white rounded-xl border border-stone-100 space-y-4">
            <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                    <Skeleton variant="text" className="w-3/4 h-5" />
                    <Skeleton variant="text" className="w-1/2 h-3" />
                </div>
                <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />
            </div>
            <div className="flex gap-2">
                <Skeleton variant="rectangle" className="w-16 h-6 rounded-full" />
                <Skeleton variant="rectangle" className="w-12 h-6 rounded-full" />
            </div>
        </div>
    );
}
