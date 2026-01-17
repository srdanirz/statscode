/**
 * Unit tests for Badge Checker
 */

import { describe, it, expect } from 'vitest';
import { checkAllBadges, checkBadge, calculateBadgePoints, getPrimaryTools } from '../checker.js';
import { ALL_BADGES, TOOL_BADGES } from '../definitions.js';
import type { UserStats, AssistantStats } from '@statscode/core';

// Helper to create mock stats
function createMockStats(overrides: Partial<UserStats> = {}): UserStats {
    const defaultAssistantStats: AssistantStats = {
        hours: 0,
        sessions: 0,
        interactions: 0,
        acceptRate: 0.5,
        editRate: 0.3,
        avgSessionDuration: 30
    };

    return {
        totalHours: 100,
        totalSessions: 50,
        totalInteractions: 500,
        byAssistant: {
            'claude-code': { ...defaultAssistantStats, hours: 50, sessions: 25 },
            'cursor': { ...defaultAssistantStats, hours: 30, sessions: 15 },
            'opencode': { ...defaultAssistantStats, hours: 20, sessions: 10 },
            'codex': { ...defaultAssistantStats },
            'antigravity': { ...defaultAssistantStats }
        },
        badges: [],
        score: 4.0,
        lastUpdated: new Date(),
        ...overrides
    };
}

describe('Badge Checker', () => {
    describe('checkAllBadges', () => {
        it('should return an array of earned badges', () => {
            const stats = createMockStats({ totalHours: 500 });
            const earned = checkAllBadges(stats);
            expect(Array.isArray(earned)).toBe(true);
        });

        it('should earn tool badges when hours threshold met', () => {
            const stats = createMockStats();
            stats.byAssistant['claude-code'].hours = 100;

            const earned = checkAllBadges(stats);
            const claudeBadge = earned.find(b => b.badgeId === 'claude-whisperer');

            expect(claudeBadge).toBeDefined();
            expect(claudeBadge?.tier).toBeDefined();
        });
    });

    describe('checkBadge', () => {
        it('should return null when criteria not met', () => {
            const stats = createMockStats({ totalHours: 5 });
            const timeLordBadge = ALL_BADGES.find(b => b.id === 'time-lord');

            if (timeLordBadge) {
                const result = checkBadge(timeLordBadge, stats);
                expect(result).toBeNull();
            }
        });

        it('should return earned badge with tier when criteria met', () => {
            const stats = createMockStats();
            stats.byAssistant['claude-code'].hours = 50;

            const claudeBadge = TOOL_BADGES.find(b => b.id === 'claude-whisperer');
            if (claudeBadge) {
                const result = checkBadge(claudeBadge, stats);
                expect(result).not.toBeNull();
                expect(result?.tier).toBe('silver');
            }
        });
    });

    describe('calculateBadgePoints', () => {
        it('should return 0 for empty badges array', () => {
            const points = calculateBadgePoints([]);
            expect(points).toBe(0);
        });

        it('should calculate points based on rarity and tier', () => {
            const earnedBadges = [
                { badgeId: 'claude-whisperer', earnedAt: new Date(), tier: 'bronze' as const }
            ];

            const points = calculateBadgePoints(earnedBadges);
            expect(points).toBeGreaterThan(0);
        });

        it('should give more points for higher tiers', () => {
            const bronzeBadges = [
                { badgeId: 'claude-whisperer', earnedAt: new Date(), tier: 'bronze' as const }
            ];
            const diamondBadges = [
                { badgeId: 'claude-whisperer', earnedAt: new Date(), tier: 'diamond' as const }
            ];

            const bronzePoints = calculateBadgePoints(bronzeBadges);
            const diamondPoints = calculateBadgePoints(diamondBadges);

            expect(diamondPoints).toBeGreaterThan(bronzePoints);
        });
    });

    describe('getPrimaryTools', () => {
        it('should return tools sorted by hours', () => {
            const stats = createMockStats();
            stats.byAssistant['claude-code'].hours = 100;
            stats.byAssistant['cursor'].hours = 50;
            stats.byAssistant['opencode'].hours = 25;

            const tools = getPrimaryTools(stats);

            expect(tools[0]).toBe('claude-code');
            expect(tools[1]).toBe('cursor');
            expect(tools[2]).toBe('opencode');
        });

        it('should exclude tools with 0 hours', () => {
            const stats = createMockStats();
            stats.byAssistant['claude-code'].hours = 100;
            stats.byAssistant['cursor'].hours = 0;
            stats.byAssistant['opencode'].hours = 0;
            stats.byAssistant['codex'].hours = 0;
            stats.byAssistant['antigravity'].hours = 0;

            const tools = getPrimaryTools(stats);

            expect(tools).toHaveLength(1);
            expect(tools[0]).toBe('claude-code');
        });
    });
});

describe('Badge Definitions', () => {
    it('should have unique IDs', () => {
        const ids = ALL_BADGES.map(b => b.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid criteria types', () => {
        const validTypes = ['threshold', 'event', 'behavior', 'tool'];
        for (const badge of ALL_BADGES) {
            expect(validTypes).toContain(badge.criteria.type);
        }
    });

    it('should have rarity between 1 and 100', () => {
        for (const badge of ALL_BADGES) {
            expect(badge.rarity).toBeGreaterThanOrEqual(1);
            expect(badge.rarity).toBeLessThanOrEqual(100);
        }
    });
});
