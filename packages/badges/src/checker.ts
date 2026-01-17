/**
 * StatsCode Badge Checker
 * Evaluates user stats against badge criteria
 */

import { UserStats, AssistantType } from '@statscode/core';
import { BadgeDefinition, BadgeTier, EarnedBadge, TIER_POINTS } from './types.js';
import { ALL_BADGES, TOOL_BADGES } from './definitions.js';

/** Check all badges for a user and return earned ones */
export function checkAllBadges(stats: UserStats): EarnedBadge[] {
    const earned: EarnedBadge[] = [];

    for (const badge of ALL_BADGES) {
        const result = checkBadge(badge, stats);
        if (result) {
            earned.push(result);
        }
    }

    return earned;
}

/** Check a single badge against user stats */
export function checkBadge(badge: BadgeDefinition, stats: UserStats): EarnedBadge | null {
    const { criteria } = badge;

    switch (criteria.type) {
        case 'threshold':
            return checkThresholdBadge(badge, stats);
        case 'tool':
            return checkToolBadge(badge, stats);
        case 'behavior':
            return checkBehaviorBadge(badge, stats);
        case 'event':
            return checkEventBadge(badge, stats);
        default:
            return null;
    }
}

/** Check threshold-based badges (hours, sessions, etc.) */
function checkThresholdBadge(badge: BadgeDefinition, stats: UserStats): EarnedBadge | null {
    const { criteria } = badge;

    // Get the metric value
    let value = 0;
    switch (criteria.metric) {
        case 'totalHours':
            value = stats.totalHours;
            break;
        case 'totalSessions':
            value = stats.totalSessions;
            break;
        case 'totalInteractions':
            value = stats.totalInteractions;
            break;
        default:
            return null;
    }

    // Check tiers if available
    if (criteria.tiers) {
        const tier = getTierForValue(value, criteria.tiers);
        if (tier) {
            const nextTier = getNextTier(tier);
            const progress = nextTier
                ? Math.min(100, (value / criteria.tiers[nextTier]) * 100)
                : 100;

            return {
                badgeId: badge.id,
                earnedAt: new Date(),
                tier,
                progress
            };
        }
    } else if (criteria.value !== undefined) {
        // Simple threshold check
        const passed = checkOperator(value, criteria.operator ?? '>=', criteria.value);
        if (passed) {
            return {
                badgeId: badge.id,
                earnedAt: new Date()
            };
        }
    }

    return null;
}

/** Check tool-specific badges */
function checkToolBadge(badge: BadgeDefinition, stats: UserStats): EarnedBadge | null {
    const { criteria } = badge;
    const tool = criteria.tool as AssistantType;

    const toolStats = stats.byAssistant[tool];
    if (!toolStats) return null;

    const hours = toolStats.hours;

    if (criteria.tiers) {
        const tier = getTierForValue(hours, criteria.tiers);
        if (tier) {
            const nextTier = getNextTier(tier);
            const progress = nextTier
                ? Math.min(100, (hours / criteria.tiers[nextTier]) * 100)
                : 100;

            return {
                badgeId: badge.id,
                earnedAt: new Date(),
                tier,
                progress,
                metadata: { tool, hours }
            };
        }
    }

    return null;
}

/** Check behavior-based badges */
function checkBehaviorBadge(badge: BadgeDefinition, stats: UserStats): EarnedBadge | null {
    const { criteria } = badge;

    switch (criteria.customChecker) {
        case 'checkNightOwl':
            // Would need hourly session data - placeholder
            return null;

        case 'checkPrecisionCoder': {
            const assistantStats = Object.values(stats.byAssistant);
            if (assistantStats.length === 0) return null;
            const avgEditRate = assistantStats.reduce((sum, a) => sum + a.editRate, 0) / assistantStats.length;
            if (avgEditRate >= 0.7) {
                return { badgeId: badge.id, earnedAt: new Date() };
            }
            return null;
        }

        case 'checkSpeedRunner': {
            const assistantStats = Object.values(stats.byAssistant);
            if (assistantStats.length === 0) return null;
            const avgDuration = assistantStats.reduce((sum, a) => sum + a.avgSessionDuration, 0) / assistantStats.length;
            if (avgDuration > 0 && avgDuration < 5) {
                return { badgeId: badge.id, earnedAt: new Date() };
            }
            return null;
        }

        case 'checkTestDriven':
        case 'checkSecurityMinded':
            // Would need detailed session metadata - placeholder
            return null;

        default:
            return null;
    }
}

/** Check event-based badges */
function checkEventBadge(badge: BadgeDefinition, _stats: UserStats): EarnedBadge | null {
    const { criteria } = badge;

    switch (criteria.eventType) {
        case 'earlyAdopter':
            // Would check against user registration date
            return null;

        case 'holidayCoding':
            // Would check session dates for holidays
            return null;

        default:
            return null;
    }
}

/** Get the highest tier achieved for a value */
function getTierForValue(value: number, tiers: Record<BadgeTier, number>): BadgeTier | null {
    const tierOrder: BadgeTier[] = ['diamond', 'platinum', 'gold', 'silver', 'bronze'];

    for (const tier of tierOrder) {
        if (value >= tiers[tier]) {
            return tier;
        }
    }
    return null;
}

/** Get the next tier after current */
function getNextTier(current: BadgeTier): BadgeTier | null {
    const tierOrder: BadgeTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tierOrder.indexOf(current);
    return currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] ?? null : null;
}

/** Check operator condition */
function checkOperator(value: number, operator: string, target: number): boolean {
    switch (operator) {
        case '>=': return value >= target;
        case '>': return value > target;
        case '<=': return value <= target;
        case '<': return value < target;
        case '==': return value === target;
        default: return false;
    }
}

/** Calculate total badge points */
export function calculateBadgePoints(badges: EarnedBadge[]): number {
    let points = 0;

    for (const badge of badges) {
        const def = ALL_BADGES.find(b => b.id === badge.badgeId);
        if (!def) continue;

        // Base points from rarity
        let badgePoints = def.rarity;

        // Multiply by tier if applicable
        if (badge.tier) {
            badgePoints *= TIER_POINTS[badge.tier] / 10;
        }

        points += badgePoints;
    }

    return Math.round(points);
}

/** Get user's primary tools (tools with most hours) */
export function getPrimaryTools(stats: UserStats): AssistantType[] {
    return (Object.entries(stats.byAssistant) as [AssistantType, { hours: number }][])
        .filter(([_, s]) => s.hours > 0)
        .sort((a, b) => b[1].hours - a[1].hours)
        .map(([tool]) => tool);
}
