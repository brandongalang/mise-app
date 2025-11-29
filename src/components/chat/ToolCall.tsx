'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ToolCall as ToolCallType } from '@/lib/types';
import {
    Search,
    Plus,
    Minus,
    Trash2,
    RefreshCw,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    ChefHat,
    Eye,
    Merge,
    FileText,
} from 'lucide-react';

// Map tool names to icons and labels
const toolConfig: Record<string, { icon: typeof Search; label: string; color: string }> = {
    searchInventory: { icon: Search, label: 'Searching inventory', color: 'text-olive' },
    addInventory: { icon: Plus, label: 'Adding to inventory', color: 'text-sage' },
    deductInventory: { icon: Minus, label: 'Deducting from inventory', color: 'text-marigold' },
    deleteInventory: { icon: Trash2, label: 'Removing item', color: 'text-cayenne' },
    updateInventory: { icon: RefreshCw, label: 'Updating inventory', color: 'text-olive' },
    getExpiringItems: { icon: Clock, label: 'Checking expiring items', color: 'text-marigold' },
    mergeInventory: { icon: Merge, label: 'Merging containers', color: 'text-olive' },
    resolveIngredient: { icon: FileText, label: 'Resolving ingredient', color: 'text-latte' },
    parseImage: { icon: Eye, label: 'Analyzing image', color: 'text-terracotta' },
    generateRecipe: { icon: ChefHat, label: 'Generating recipe', color: 'text-terracotta' },
};

interface ToolCallProps {
    tool: ToolCallType;
    isExpanded?: boolean;
    onToggle?: () => void;
}

export function ToolCall({ tool, isExpanded = false, onToggle }: ToolCallProps) {
    const config = toolConfig[tool.name] || {
        icon: RefreshCw,
        label: tool.name,
        color: 'text-latte',
    };
    const Icon = config.icon;

    const StatusIcon = {
        pending: Loader2,
        running: Loader2,
        completed: CheckCircle2,
        error: XCircle,
    }[tool.status];

    const statusColor = {
        pending: 'text-warm-gray',
        running: 'text-terracotta',
        completed: 'text-sage',
        error: 'text-cayenne',
    }[tool.status];

    const isActive = tool.status === 'pending' || tool.status === 'running';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "rounded-xl border overflow-hidden transition-all",
                isActive
                    ? "bg-parchment/50 border-terracotta/20"
                    : tool.status === 'error'
                    ? "bg-cayenne/5 border-cayenne/20"
                    : "bg-warm-white border-clay/10"
            )}
        >
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
            >
                {/* Tool Icon */}
                <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isActive ? "bg-terracotta/10" : "bg-parchment"
                )}>
                    <Icon size={16} className={config.color} />
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-espresso truncate">
                        {config.label}
                    </p>
                    {tool.args && Object.keys(tool.args).length > 0 && !isExpanded && (
                        <p className="text-xs text-latte truncate">
                            {formatArgs(tool.args)}
                        </p>
                    )}
                </div>

                {/* Status Icon */}
                <StatusIcon
                    size={18}
                    className={cn(
                        statusColor,
                        isActive && "animate-spin"
                    )}
                />
            </button>

            {/* Expanded Details */}
            <AnimatePresence>
                {isExpanded && (tool.args || tool.result !== undefined) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-clay/10"
                    >
                        <div className="px-3 py-2.5 space-y-2">
                            {/* Arguments */}
                            {tool.args && Object.keys(tool.args).length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-latte mb-1">Input</p>
                                    <pre className="text-xs text-espresso bg-parchment/50 p-2 rounded-lg overflow-x-auto">
                                        {JSON.stringify(tool.args, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {/* Result */}
                            {tool.result !== undefined && (
                                <div>
                                    <p className="text-xs font-medium text-latte mb-1">Result</p>
                                    <pre className="text-xs text-espresso bg-parchment/50 p-2 rounded-lg overflow-x-auto max-h-32">
                                        {typeof tool.result === 'string'
                                            ? tool.result
                                            : JSON.stringify(tool.result, null, 2) as string}
                                    </pre>
                                </div>
                            )}

                            {/* Timing */}
                            {tool.endTime && tool.startTime && (
                                <p className="text-xs text-warm-gray">
                                    Completed in {tool.endTime.getTime() - tool.startTime.getTime()}ms
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Format args for display
function formatArgs(args: Record<string, unknown>): string {
    const entries = Object.entries(args);
    if (entries.length === 0) return '';
    if (entries.length === 1) {
        const [key, value] = entries[0];
        return `${key}: ${formatValue(value)}`;
    }
    return entries.slice(0, 2).map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ');
}

function formatValue(value: unknown): string {
    if (typeof value === 'string') return value.length > 20 ? value.slice(0, 20) + '...' : value;
    if (typeof value === 'number') return value.toString();
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object' && value !== null) return '{...}';
    return String(value);
}

// Tool calls container for multiple tools
interface ToolCallsContainerProps {
    tools: ToolCallType[];
    className?: string;
}

export function ToolCallsContainer({ tools, className }: ToolCallsContainerProps) {
    if (tools.length === 0) return null;

    const activeTools = tools.filter(t => t.status === 'pending' || t.status === 'running');
    const completedTools = tools.filter(t => t.status === 'completed' || t.status === 'error');

    return (
        <div className={cn("space-y-2", className)}>
            {/* Active tools */}
            {activeTools.map(tool => (
                <ToolCall key={tool.id} tool={tool} />
            ))}

            {/* Completed tools - collapsed summary */}
            {completedTools.length > 0 && activeTools.length === 0 && (
                <CollapsedToolsSummary tools={completedTools} />
            )}
        </div>
    );
}

// Collapsed summary of completed tools
function CollapsedToolsSummary({ tools }: { tools: ToolCallType[] }) {
    const successCount = tools.filter(t => t.status === 'completed').length;
    const errorCount = tools.filter(t => t.status === 'error').length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-3 py-2 bg-parchment/30 rounded-lg text-xs text-latte"
        >
            <CheckCircle2 size={14} className="text-sage" />
            <span>
                {successCount} tool{successCount !== 1 ? 's' : ''} completed
                {errorCount > 0 && (
                    <span className="text-cayenne ml-1">
                        ({errorCount} failed)
                    </span>
                )}
            </span>
        </motion.div>
    );
}
