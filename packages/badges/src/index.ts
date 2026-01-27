/**
 * StatsCode Badges Package
 * Premium achievement system with custom badges
 */

// Types
export type {
    BadgeTier,
    BadgeCategory,
    AITool,
    BadgeDefinition,
    BadgeCriteria,
    EarnedBadge,
    BadgeCollection,
    BadgeDisplay
} from './types.js';

export { TIER_COLORS, TIER_POINTS } from './types.js';

// Definitions
export {
    TOOL_BADGES,
    TIERED_BADGES,
    STYLE_BADGES,
    EVENT_BADGES,
    ALL_BADGES,
    getBadgeById,
    getBadgesByCategory,
    getToolBadge
} from './definitions.js';

// Checker
export {
    checkAllBadges,
    checkBadge,
    calculateBadgePoints,
    getPrimaryTools
} from './checker.js';
