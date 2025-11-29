import { cn } from "@/lib/utils";

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'success' | 'warning';
    className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
    const variants = {
        default: "bg-espresso text-white border-transparent",
        outline: "text-espresso border-espresso/30 bg-transparent",
        secondary: "bg-parchment text-latte border-transparent",
        destructive: "bg-cayenne/12 text-cayenne border-cayenne/20",
        success: "bg-sage/12 text-sage border-sage/20",
        warning: "bg-marigold/12 text-marigold border-marigold/20",
    };

    return (
        <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5",
            "text-[11px] font-semibold uppercase tracking-wide",
            "transition-colors",
            variants[variant],
            className
        )}>
            {children}
        </span>
    );
}
