'use client';

import { useState, useCallback, useMemo } from 'react';
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
    ChevronDown,
    ChevronRight,
} from 'lucide-react';

// Map tool names to icons and labels
const TOOL_CONFIG: Record<string, { icon: typeof Search; label: string; color: string }> = {
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

const DEFAULT_TOOL_CONFIG = {
    icon: RefreshCw,
    label: 'Processing',
    color: 'text-latte',
};

// Helper to safely format tool result for display
function formatResult(result: unknown): string {
    if (result === null) return 'null';
    if (result === undefined) return 'undefined';
    if (typeof result === 'string') return result;
    try {
        return JSON.stringify(result, null, 2);
    } catch {
        return String(result);
    }
}

interface ToolCallProps {
    tool: ToolCallType;
    isExpanded?: boolean;
    onToggle?: () => void;
}

export function ToolCall({ tool, isExpanded = false, onToggle }: ToolCallProps) {
    const config = TOOL_CONFIG[tool.name] || { ...DEFAULT_TOOL_CONFIG, label: tool.name };
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
    const hasDetails = (tool.args && Object.keys(tool.args).length > 0) || tool.result !== undefined;

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
                disabled={!hasDetails}
                className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left",
                    hasDetails && "cursor-pointer hover:bg-parchment/30",
                    !hasDetails && "cursor-default"
                )}
                aria-expanded={isExpanded}
            >
                {/* Expand indicator */}
                {hasDetails && (
                    <div className="w-4 flex-shrink-0">
                        {isExpanded ? (
                            <ChevronDown size={14} className="text-latte" />
                        ) : (
                            <ChevronRight size={14} className="text-latte" />
                        )}
                    </div>
                )}

                {/* Tool Icon */}
                <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
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
                {isExpanded && hasDetails && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-clay/10"
                    >
                        <div className="px-3 py-2.5 space-y-2">
                            {/* Arguments */}
                            {tool.args && Object.keys(tool.args).length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-latte mb-1">Input</p>
                                    <pre className="text-xs text-espresso bg-parchment/50 p-2 rounded-lg overflow-x-auto max-h-24 whitespace-pre-wrap break-words">
                                        {JSON.stringify(tool.args, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {/* Result */}
                            {tool.result !== undefined && (
                                <div>
                                    <p className="text-xs font-medium text-latte mb-1">Result</p>
                                    <pre className="text-xs text-espresso bg-parchment/50 p-2 rounded-lg overflow-x-auto max-h-32 whitespace-pre-wrap break-words">
                                        {formatResult(tool.result)}
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

// Format args for display in collapsed view
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
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return value.length > 20 ? value.slice(0, 20) + '...' : value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return '{...}';
    return String(value);
}

// Tool calls container with expandable state management
interface ToolCallsContainerProps {
    tools: ToolCallType[];
    className?: string;
    defaultExpanded?: boolean;
}

export function ToolCallsContainer({ tools, className, defaultExpanded = false }: ToolCallsContainerProps) {
    // Track which tools are expanded
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = useCallback((toolId: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(toolId)) {
                next.delete(toolId);
            } else {
                next.add(toolId);
            }
            return next;
        });
    }, []);

    // Categorize tools
    const { activeTools, completedTools } = useMemo(() => ({
        activeTools: tools.filter(t => t.status === 'pending' || t.status === 'running'),
        completedTools: tools.filter(t => t.status === 'completed' || t.status === 'error'),
    }), [tools]);

    if (tools.length === 0) return null;

    return (
        <div className={cn("space-y-2", className)}>
            {/* Active tools - always show expanded */}
            {activeTools.map(tool => (
                <ToolCall
                    key={tool.id}
                    tool={tool}
                    isExpanded={expandedIds.has(tool.id) || defaultExpanded}
                    onToggle={() => toggleExpand(tool.id)}
                />
            ))}

            {/* Completed tools */}
            {completedTools.length > 0 && activeTools.length === 0 && (
                completedTools.length === 1 ? (
                    // Single completed tool - show it directly
                    <ToolCall
                        key={completedTools[0].id}
                        tool={completedTools[0]}
                        isExpanded={expandedIds.has(completedTools[0].id)}
                        onToggle={() => toggleExpand(completedTools[0].id)}
                    />
                ) : (
                    // Multiple completed tools - show summary with expand option
                    <CollapsedToolsSummary
                        tools={completedTools}
                        expandedIds={expandedIds}
                        onToggle={toggleExpand}
                    />
                )
            )}
        </div>
    );
}

// Collapsed summary of completed tools with expand functionality
interface CollapsedToolsSummaryProps {
    tools: ToolCallType[];
    expandedIds: Set<string>;
    onToggle: (id: string) => void;
}

function CollapsedToolsSummary({ tools, expandedIds, onToggle }: CollapsedToolsSummaryProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const successCount = tools.filter(t => t.status === 'completed').length;
    const errorCount = tools.filter(t => t.status === 'error').length;

    return (
        <div className="space-y-2">
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-parchment/30 rounded-lg text-xs text-latte hover:bg-parchment/50 transition-colors"
            >
                {isExpanded ? (
                    <ChevronDown size={14} />
                ) : (
                    <ChevronRight size={14} />
                )}
                <CheckCircle2 size={14} className="text-sage" />
                <span className="flex-1 text-left">
                    {successCount} tool{successCount !== 1 ? 's' : ''} completed
                    {errorCount > 0 && (
                        <span className="text-cayenne ml-1">
                            ({errorCount} failed)
                        </span>
                    )}
                </span>
            </motion.button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pl-4"
                    >
                        {tools.map(tool => (
                            <ToolCall
                                key={tool.id}
                                tool={tool}
                                isExpanded={expandedIds.has(tool.id)}
                                onToggle={() => onToggle(tool.id)}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
