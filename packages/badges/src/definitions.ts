/**
 * StatsCode Badge Definitions
 * All available badges with their criteria and assets
 */

import { BadgeDefinition, BadgeTier, AITool } from './types.js';

/** Tool badges - show which AI assistants you use */
export const TOOL_BADGES: BadgeDefinition[] = [
    {
        id: 'claude-whisperer',
        name: 'Claude Whisperer',
        description: 'Master of Claude Code - Your AI coding companion',
        category: 'tool',
        icon: '🤖',
        imagePath: 'assets/badge_claude_whisperer_v2.png',
        rarity: 30,
        criteria: {
            type: 'tool',
            tool: 'claude-code',
            tiers: { bronze: 10, silver: 50, gold: 200, platinum: 500, diamond: 1000 }
        }
    },
    {
        id: 'codex-commander',
        name: 'Codex Commander',
        description: 'Commander of OpenAI Codex forces',
        category: 'tool',
        icon: '🧠',
        imagePath: 'assets/badge_codex_commander.png',
        rarity: 35,
        criteria: {
            type: 'tool',
            tool: 'codex',
            tiers: { bronze: 10, silver: 50, gold: 200, platinum: 500, diamond: 1000 }
        }
    },
    {
        id: 'antigravity-pilot',
        name: 'Antigravity Pilot',
        description: 'Defying gravity with Antigravity AI',
        category: 'tool',
        icon: '🌌',
        imagePath: 'assets/badge_antigravity_pilot.png',
        rarity: 40,
        criteria: {
            type: 'tool',
            tool: 'antigravity',
            tiers: { bronze: 10, silver: 50, gold: 200, platinum: 500, diamond: 1000 }
        }
    },
    {
        id: 'opencode-expert',
        name: 'OpenCode Expert',
        description: 'Open source AI coding advocate',
        category: 'tool',
        icon: '🌐',
        imagePath: 'assets/badge_opencode_expert.png',
        rarity: 35,
        criteria: {
            type: 'tool',
            tool: 'opencode',
            tiers: { bronze: 10, silver: 50, gold: 200, platinum: 500, diamond: 1000 }
        }
    },
    {
        id: 'cursor-master',
        name: 'Cursor Master',
        description: 'Wielding Cursor IDE with precision',
        category: 'tool',
        icon: '🖱️',
        imagePath: 'assets/badge_cursor_master.png',
        rarity: 25,
        criteria: {
            type: 'tool',
            tool: 'cursor' as AITool,
            tiers: { bronze: 10, silver: 50, gold: 200, platinum: 500, diamond: 1000 }
        }
    }
];

/** Tiered achievement badges */
export const TIERED_BADGES: BadgeDefinition[] = [
    {
        id: 'time-lord',
        name: 'Time Lord',
        description: 'Master of AI coding time',
        category: 'tiered',
        icon: '⏱️',
        imagePath: 'assets/badge_time_lord_diamond.png',
        rarity: 50,
        criteria: {
            type: 'threshold',
            metric: 'totalHours',
            operator: '>=',
            tiers: { bronze: 10, silver: 50, gold: 200, platinum: 500, diamond: 1000 }
        }
    }
];

/** Style/behavior badges */
export const STYLE_BADGES: BadgeDefinition[] = [
    {
        id: 'night-owl',
        name: 'Night Owl',
        description: 'Codes when the world sleeps (midnight-5am)',
        category: 'style',
        icon: '🌙',
        imagePath: 'assets/badge_night_owl.png',
        rarity: 60,
        criteria: {
            type: 'behavior',
            customChecker: 'checkNightOwl',
            tiers: { bronze: 10, silver: 50, gold: 100, platinum: 250, diamond: 500 }
        }
    },
    {
        id: 'precision-coder',
        name: 'Precision Coder',
        description: 'Reviews and edits 70%+ of suggestions',
        category: 'style',
        icon: '🎯',
        imagePath: 'assets/badge_precision_coder.png',
        rarity: 55,
        criteria: {
            type: 'behavior',
            customChecker: 'checkPrecisionCoder'
        }
    },
    {
        id: 'speed-runner',
        name: 'Speed Runner',
        description: 'Average task completion under 5 minutes',
        category: 'style',
        icon: '⚡',
        imagePath: 'assets/badge_speed_runner.png',
        rarity: 45,
        criteria: {
            type: 'behavior',
            customChecker: 'checkSpeedRunner'
        }
    },
    {
        id: 'test-driven',
        name: 'Test Driven',
        description: 'Includes tests in 40%+ of sessions',
        category: 'style',
        icon: '🧪',
        imagePath: 'assets/badge_test_driven.png',
        rarity: 65,
        criteria: {
            type: 'behavior',
            customChecker: 'checkTestDriven'
        }
    },
    {
        id: 'security-minded',
        name: 'Security Minded',
        description: 'Never exposed .env or secrets',
        category: 'style',
        icon: '🛡️',
        imagePath: 'assets/badge_security_minded.png',
        rarity: 70,
        criteria: {
            type: 'behavior',
            customChecker: 'checkSecurityMinded'
        }
    }
];

/** Pattern improvement badges - rewarding good AI coding habits */
export const IMPROVEMENT_BADGES: BadgeDefinition[] = [
    {
        id: 'context-master',
        name: 'Context Master',
        description: 'Uses @file references in 80%+ of sessions',
        category: 'style',
        icon: '📎',
        imagePath: 'assets/badge_context_master.png',
        rarity: 55,
        criteria: {
            type: 'behavior',
            customChecker: 'checkContextMaster'
        }
    },
    {
        id: 'zen-coder',
        name: 'Zen Coder',
        description: 'Takes regular breaks during long sessions',
        category: 'style',
        icon: '🧘',
        imagePath: 'assets/badge_zen_coder.png',
        rarity: 50,
        criteria: {
            type: 'behavior',
            customChecker: 'checkZenCoder'
        }
    },
    {
        id: 'one-shot-wonder',
        name: 'One Shot Wonder',
        description: 'High AI suggestion acceptance rate (70%+)',
        category: 'style',
        icon: '🎯',
        imagePath: 'assets/badge_one_shot_wonder.png',
        rarity: 60,
        criteria: {
            type: 'behavior',
            customChecker: 'checkOneShotWonder'
        }
    },
    {
        id: 'review-champion',
        name: 'Review Champion',
        description: 'Uses /review before 90%+ of commits',
        category: 'style',
        icon: '✅',
        imagePath: 'assets/badge_review_champion.png',
        rarity: 65,
        criteria: {
            type: 'behavior',
            customChecker: 'checkReviewChampion'
        }
    },
    {
        id: 'prompt-engineer',
        name: 'Prompt Engineer',
        description: 'Provides detailed context in prompts consistently',
        category: 'style',
        icon: '📝',
        imagePath: 'assets/badge_prompt_engineer.png',
        rarity: 58,
        criteria: {
            type: 'behavior',
            customChecker: 'checkPromptEngineer'
        }
    },
    {
        id: 'multi-tool-master',
        name: 'Multi-Tool Master',
        description: 'Uses 3+ different AI tools effectively',
        category: 'style',
        icon: '🔧',
        imagePath: 'assets/badge_multi_tool_master.png',
        rarity: 45,
        criteria: {
            type: 'threshold',
            metric: 'uniqueToolsUsed',
            operator: '>=',
            value: 3
        }
    }
];

/** Event/milestone badges */
export const EVENT_BADGES: BadgeDefinition[] = [
    {
        id: 'early-adopter',
        name: 'Early Adopter',
        description: 'Among the first 1000 StatsCode users',
        category: 'event',
        icon: '🌅',
        imagePath: 'assets/badge_early_adopter.png',
        rarity: 95,
        criteria: {
            type: 'event',
            eventType: 'earlyAdopter'
        }
    },
    {
        id: 'holiday-coder',
        name: 'Holiday Coder',
        description: 'Coded on Christmas or New Year',
        category: 'event',
        icon: '🎄',
        rarity: 80,
        criteria: {
            type: 'event',
            eventType: 'holidayCoding'
        }
    },
    {
        id: 'anniversary',
        name: 'Anniversary',
        description: 'One year of AI-assisted coding',
        category: 'milestone',
        icon: '🎂',
        rarity: 75,
        criteria: {
            type: 'threshold',
            metric: 'daysSinceFirstSession',
            operator: '>=',
            value: 365
        }
    }
];

/** All badges combined */
export const ALL_BADGES: BadgeDefinition[] = [
    ...TOOL_BADGES,
    ...TIERED_BADGES,
    ...STYLE_BADGES,
    ...IMPROVEMENT_BADGES,
    ...EVENT_BADGES
];

/** Get badge by ID */
export function getBadgeById(id: string): BadgeDefinition | undefined {
    return ALL_BADGES.find(b => b.id === id);
}

/** Get badges by category */
export function getBadgesByCategory(category: BadgeDefinition['category']): BadgeDefinition[] {
    return ALL_BADGES.filter(b => b.category === category);
}

/** Get tool badge for specific AI tool */
export function getToolBadge(tool: AITool): BadgeDefinition | undefined {
    return TOOL_BADGES.find(b => b.criteria.tool === tool);
}
