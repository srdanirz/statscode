/**
 * StatsCode Analyzer Module
 * Calculates metrics, scores, and badges from tracked data
 */

import { StatsDatabase } from './database.js';
import {
    UserStats,
    AssistantStats,
    AssistantType,
    Badge,
    BadgeId,
    BadgeCriteria
} from './types.js';

/** Badge definitions with criteria */
const BADGE_DEFINITIONS: BadgeCriteria[] = [
    {
        id: 'power-user',
        name: 'Power User',
        icon: '🔥',
        description: '100+ hours with AI assistants',
        check: (stats) => stats.totalHours >= 100
    },
    {
        id: 'thoughtful',
        name: 'Thoughtful',
        icon: '🎯',
        description: '50%+ interactions include edits',
        check: (stats) => {
            const byAssistant = Object.values(stats.byAssistant);
            if (byAssistant.length === 0) return false;
            const avgEditRate = byAssistant.reduce((sum, a) => sum + a.editRate, 0) / byAssistant.length;
            return avgEditRate >= 0.5;
        }
    },
    {
        id: 'careful',
        name: 'Careful',
        icon: '🛡️',
        description: 'Low accept rate without review (<30%)',
        check: (stats) => {
            const byAssistant = Object.values(stats.byAssistant);
            if (byAssistant.length === 0) return false;
            const avgAcceptRate = byAssistant.reduce((sum, a) => sum + a.acceptRate, 0) / byAssistant.length;
            return avgAcceptRate < 0.3;
        }
    },
    {
        id: 'speed-demon',
        name: 'Speed Demon',
        icon: '⚡',
        description: 'Average session under 30 minutes',
        check: (stats) => {
            const byAssistant = Object.values(stats.byAssistant);
            if (byAssistant.length === 0) return false;
            const avgDuration = byAssistant.reduce((sum, a) => sum + a.avgSessionDuration, 0) / byAssistant.length;
            return avgDuration > 0 && avgDuration < 30;
        }
    },
    {
        id: 'tester',
        name: 'Tester',
        icon: '🧪',
        description: 'Frequently works with tests',
        check: (_stats) => {
            // This would need tool_name metadata analysis
            // For now, always false - implement when we have tool tracking
            return false;
        }
    },
    {
        id: 'documenter',
        name: 'Documenter',
        icon: '📚',
        description: 'Frequently works with documentation',
        check: (_stats) => {
            // This would need tool_name metadata analysis
            // For now, always false - implement when we have tool tracking
            return false;
        }
    }
];

export class Analyzer {
    private db: StatsDatabase;

    constructor(db: StatsDatabase) {
        this.db = db;
    }

    /** Calculate complete user stats */
    calculateStats(): UserStats {
        const sessions = this.db.getAllSessions();
        const interactions = this.db.getAllInteractions();
        const interactionCounts = this.db.getInteractionCounts();

        // Group by assistant
        const byAssistant: Record<AssistantType, AssistantStats> = {} as Record<AssistantType, AssistantStats>;

        const assistants: AssistantType[] = ['claude-code', 'opencode', 'codex', 'antigravity', 'cursor'];
        for (const assistant of assistants) {
            const assistantSessions = sessions.filter(s => s.assistant === assistant);
            const sessionIds = new Set(assistantSessions.map(s => s.id));
            const assistantInteractions = interactions.filter(i => sessionIds.has(i.sessionId));

            if (assistantSessions.length === 0) continue;

            const totalMs = assistantSessions.reduce((sum, s) => {
                const end = s.endTime ?? new Date();
                return sum + (end.getTime() - s.startTime.getTime());
            }, 0);

            const accepts = assistantInteractions.filter(i => i.type === 'accept').length;
            const edits = assistantInteractions.filter(i => i.type === 'edit').length;
            const totalActions = accepts + edits + assistantInteractions.filter(i => i.type === 'reject').length;

            byAssistant[assistant] = {
                hours: totalMs / (1000 * 60 * 60),
                sessions: assistantSessions.length,
                interactions: assistantInteractions.length,
                acceptRate: totalActions > 0 ? accepts / totalActions : 0,
                editRate: totalActions > 0 ? edits / totalActions : 0,
                avgSessionDuration: (totalMs / assistantSessions.length) / (1000 * 60) // in minutes
            };
        }

        const totalHours = this.db.getTotalHours();

        const stats: UserStats = {
            totalHours,
            totalSessions: sessions.length,
            totalInteractions: interactions.length,
            byAssistant,
            badges: [],
            score: 0,
            lastUpdated: new Date()
        };

        // Calculate badges
        stats.badges = this.calculateBadges(stats);

        // Calculate score (0-5 scale)
        stats.score = this.calculateScore(stats);

        return stats;
    }

    /** Calculate earned badges */
    private calculateBadges(stats: UserStats): Badge[] {
        const earnedBadges: Badge[] = [];

        for (const criteria of BADGE_DEFINITIONS) {
            if (criteria.check(stats)) {
                earnedBadges.push({
                    id: criteria.id,
                    name: criteria.name,
                    description: criteria.description,
                    icon: criteria.icon,
                    earnedAt: new Date()
                });
            }
        }

        return earnedBadges;
    }

    /** Calculate overall score (0-5 scale) */
    private calculateScore(stats: UserStats): number {
        let score = 0;
        let factors = 0;

        // Factor 1: Usage level (up to 1 point)
        if (stats.totalHours > 0) {
            score += Math.min(stats.totalHours / 100, 1);
            factors++;
        }

        // Factor 2: Edit rate - higher is better (up to 1 point)
        const assistantStats = Object.values(stats.byAssistant);
        if (assistantStats.length > 0) {
            const avgEditRate = assistantStats.reduce((sum, a) => sum + a.editRate, 0) / assistantStats.length;
            score += avgEditRate;
            factors++;
        }

        // Factor 3: Session consistency (up to 1 point)
        if (stats.totalSessions > 10) {
            score += Math.min(stats.totalSessions / 100, 1);
            factors++;
        }

        // Factor 4: Badges (up to 1 point)
        score += Math.min(stats.badges.length / 4, 1);
        factors++;

        // Factor 5: Multi-tool usage (up to 1 point)
        const assistantsUsed = Object.keys(stats.byAssistant).length;
        score += Math.min(assistantsUsed / 3, 1);
        factors++;

        // Normalize to 0-5 scale
        return factors > 0 ? (score / factors) * 5 : 0;
    }

    /** Get badge definition by ID */
    static getBadgeDefinition(id: BadgeId): BadgeCriteria | undefined {
        return BADGE_DEFINITIONS.find(b => b.id === id);
    }

    /** Get all badge definitions */
    static getAllBadgeDefinitions(): BadgeCriteria[] {
        return [...BADGE_DEFINITIONS];
    }
}
