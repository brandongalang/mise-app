import { Skeleton } from "@/components/ui/Skeleton";

export function SkeletonList() {
    return (
        <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-100">
                    <Skeleton variant="circle" className="w-10 h-10 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton variant="text" className="w-3/4 h-5" />
                        <Skeleton variant="text" className="w-1/2 h-3" />
                    </div>
                    <Skeleton variant="rectangle" className="w-16 h-6 rounded-full" />
                </div>
            ))}
        </div>
    );
}
