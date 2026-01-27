/**
 * Unit tests for StatsCode Analyzer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Analyzer } from '../analyzer.js';
import { StatsDatabase } from '../database.js';

// Mock the database module
vi.mock('../database.js', () => {
    return {
        StatsDatabase: vi.fn().mockImplementation(() => ({
            getAllSessions: vi.fn().mockReturnValue([
                {
                    id: 'sess-1',
                    assistant: 'claude-code',
                    startTime: new Date('2026-01-01T10:00:00'),
                    endTime: new Date('2026-01-01T12:00:00')
                },
                {
                    id: 'sess-2',
                    assistant: 'cursor',
                    startTime: new Date('2026-01-02T09:00:00'),
                    endTime: new Date('2026-01-02T10:30:00')
                }
            ]),
            getAllInteractions: vi.fn().mockReturnValue([
                { id: 'int-1', sessionId: 'sess-1', type: 'prompt', timestamp: new Date() },
                { id: 'int-2', sessionId: 'sess-1', type: 'accept', timestamp: new Date() },
                { id: 'int-3', sessionId: 'sess-1', type: 'edit', timestamp: new Date() },
                { id: 'int-4', sessionId: 'sess-2', type: 'prompt', timestamp: new Date() },
                { id: 'int-5', sessionId: 'sess-2', type: 'accept', timestamp: new Date() }
            ]),
            getInteractionCounts: vi.fn().mockReturnValue({
                prompt: 2,
                accept: 2,
                edit: 1
            }),
            getTotalHours: vi.fn().mockReturnValue(3.5),
            ready: vi.fn().mockResolvedValue(undefined)
        }))
    };
});

describe('Analyzer', () => {
    let analyzer: Analyzer;
    let mockDb: StatsDatabase;

    beforeEach(() => {
        mockDb = new StatsDatabase();
        analyzer = new Analyzer(mockDb);
    });

    describe('calculateStats', () => {
        it('should calculate total hours', () => {
            const stats = analyzer.calculateStats();
            expect(stats.totalHours).toBe(3.5);
        });

        it('should calculate total sessions', () => {
            const stats = analyzer.calculateStats();
            expect(stats.totalSessions).toBe(2);
        });

        it('should calculate total interactions', () => {
            const stats = analyzer.calculateStats();
            expect(stats.totalInteractions).toBe(5);
        });

        it('should group stats by assistant', () => {
            const stats = analyzer.calculateStats();
            expect(stats.byAssistant['claude-code']).toBeDefined();
            expect(stats.byAssistant['cursor']).toBeDefined();
        });

        it('should calculate score between 0 and 5', () => {
            const stats = analyzer.calculateStats();
            expect(stats.score).toBeGreaterThanOrEqual(0);
            expect(stats.score).toBeLessThanOrEqual(5);
        });

        it('should include lastUpdated timestamp', () => {
            const stats = analyzer.calculateStats();
            expect(stats.lastUpdated).toBeInstanceOf(Date);
        });
    });

    describe('getBadgeDefinition', () => {
        it('should return badge definition by id', () => {
            const badge = Analyzer.getBadgeDefinition('power-user');
            expect(badge).toBeDefined();
            expect(badge?.name).toBe('Power User');
        });

        it('should return undefined for unknown badge', () => {
            const badge = Analyzer.getBadgeDefinition('unknown-badge' as any);
            expect(badge).toBeUndefined();
        });
    });

    describe('getAllBadgeDefinitions', () => {
        it('should return all badge definitions', () => {
            const badges = Analyzer.getAllBadgeDefinitions();
            expect(badges.length).toBeGreaterThan(0);
            expect(badges.every(b => b.id && b.name && b.check)).toBe(true);
        });
    });
});
