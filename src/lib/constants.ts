export const INGREDIENT_CATEGORIES = [
    "produce",
    "protein",
    "dairy",
    "pantry",
    "frozen",
    "beverage",
    "condiment",
    "grain",
    "spice",
    "unknown"
] as const;

export type IngredientCategory = typeof INGREDIENT_CATEGORIES[number];

import { Camera, ChefHat, Clock, UtensilsCrossed, Zap } from 'lucide-react';

export const QUICK_ACTIONS = [
    {
        id: 'scan',
        label: 'Scan Receipt',
        text: "Here's a receipt, add these items to my inventory",
        icon: Camera,
        color: 'from-terracotta/10 to-marigold/10 hover:from-terracotta/20 hover:to-marigold/20',
        iconColor: 'text-terracotta',
        openCamera: true,
    },
    {
        id: 'cook',
        label: 'What can I cook?',
        text: 'What can I cook with what I have?',
        icon: ChefHat,
        color: 'from-olive/10 to-sage/10 hover:from-olive/20 hover:to-sage/20',
        iconColor: 'text-olive',
    },
    {
        id: 'expiring',
        label: 'Expiring soon',
        text: 'What should I use up before it expires?',
        icon: Clock,
        color: 'from-marigold/10 to-cream hover:from-marigold/20 hover:to-marigold/10',
        iconColor: 'text-marigold',
    },
    {
        id: 'leftovers',
        label: 'Leftovers',
        text: 'What leftovers do I have?',
        icon: UtensilsCrossed,
        color: 'from-sage/10 to-olive/10 hover:from-sage/20 hover:to-olive/20',
        iconColor: 'text-sage',
    },
    {
        id: 'quick',
        label: 'Quick meal',
        text: 'Suggest a quick meal I can make',
        icon: Zap,
        color: 'from-terracotta/10 to-cayenne/10 hover:from-terracotta/20 hover:to-cayenne/20',
        iconColor: 'text-terracotta',
    },
] as const;

