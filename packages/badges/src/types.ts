/**
 * StatsCode Badge Type Definitions
 * Premium achievement system with tiers and unique badges
 */

/** Badge rarity/tier levels */
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

/** Badge categories */
export type BadgeCategory =
    | 'event'      // Unique, time-limited (Early Adopter, Holiday Coder)
    | 'tiered'     // Progressive (Time Lord Bronze→Diamond)
    | 'style'      // Behavior-based (Precision Coder, Speed Runner)
    | 'tool'       // Tool-specific (Claude Whisperer, Codex Commander)
    | 'milestone'; // One-time achievements

/** Supported AI tools */
export type AITool = 'claude-code' | 'codex' | 'antigravity' | 'opencode' | 'cursor';

/** Badge definition */
export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    category: BadgeCategory;
    tier?: BadgeTier;
    icon: string;           // Emoji fallback
    imagePath?: string;     // Path to premium PNG badge
    rarity: number;         // 1-100, higher = rarer
    criteria: BadgeCriteria;
}

/** Criteria for earning a badge */
export interface BadgeCriteria {
    type: 'threshold' | 'event' | 'behavior' | 'tool';

    // For threshold badges (e.g., hours >= 100)
    metric?: string;
    operator?: '>=' | '>' | '<=' | '<' | '==';
    value?: number;

    // For tiered badges
    tiers?: Record<BadgeTier, number>;

    // For event badges
    eventType?: string;
    dateRange?: { start?: Date; end?: Date };

    // For tool badges
    tool?: AITool;

    // Custom checker function name
    customChecker?: string;
}

/** Earned badge instance */
export interface EarnedBadge {
    badgeId: string;
    earnedAt: Date;
    tier?: BadgeTier;
    progress?: number;      // 0-100 for tiered badges
    metadata?: Record<string, unknown>;
}

/** User's badge collection */
export interface BadgeCollection {
    userId: string;
    badges: EarnedBadge[];
    totalPoints: number;
    rareCount: number;
    lastUpdated: Date;
}

/** Badge display info for UI */
export interface BadgeDisplay {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    tier?: BadgeTier;
    tierColor?: string;
    isRare: boolean;
    earnedAt?: Date;
}

/** Tier colors for UI */
export const TIER_COLORS: Record<BadgeTier, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF'
};

/** Tier points multiplier */
export const TIER_POINTS: Record<BadgeTier, number> = {
    bronze: 10,
    silver: 25,
    gold: 50,
    platinum: 100,
    diamond: 250
};
