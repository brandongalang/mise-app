import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "text" | "circle" | "rectangle";
}

export function Skeleton({ className, variant = "rectangle", ...props }: SkeletonProps) {
    return (
        <div
            data-testid="skeleton"
            className={cn(
                "animate-pulse bg-stone-200",
                {
                    "rounded-md": variant === "rectangle",
                    "rounded-full": variant === "circle",
                    "rounded h-4 w-full": variant === "text",
                },
                className
            )}
            {...props}
        />
    );
}
