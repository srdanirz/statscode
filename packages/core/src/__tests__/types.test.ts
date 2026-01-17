/**
 * Unit tests for StatsCode Core Types
 */

import { describe, it, expect } from 'vitest';
import type {
    AssistantType,
    InteractionType,
    Session,
    Interaction,
    UserStats
} from '../types.js';

describe('Core Types', () => {
    describe('AssistantType', () => {
        it('should support all 5 AI tools', () => {
            const tools: AssistantType[] = [
                'claude-code',
                'opencode',
                'codex',
                'antigravity',
                'cursor'
            ];
            expect(tools).toHaveLength(5);
        });
    });

    describe('InteractionType', () => {
        it('should support all interaction types', () => {
            const types: InteractionType[] = [
                'prompt',
                'response',
                'tool_use',
                'accept',
                'reject',
                'edit',
                'undo'
            ];
            expect(types).toHaveLength(7);
        });
    });

    describe('Session', () => {
        it('should have required fields', () => {
            const session: Session = {
                id: 'test-session-1',
                assistant: 'claude-code',
                startTime: new Date(),
            };

            expect(session.id).toBeDefined();
            expect(session.assistant).toBe('claude-code');
            expect(session.startTime).toBeInstanceOf(Date);
        });

        it('should support optional fields', () => {
            const session: Session = {
                id: 'test-session-2',
                assistant: 'cursor',
                startTime: new Date(),
                endTime: new Date(),
                projectPath: '/path/to/project',
                metadata: { custom: 'data' }
            };

            expect(session.endTime).toBeInstanceOf(Date);
            expect(session.projectPath).toBe('/path/to/project');
            expect(session.metadata).toEqual({ custom: 'data' });
        });
    });

    describe('Interaction', () => {
        it('should have required fields', () => {
            const interaction: Interaction = {
                id: 'int-1',
                sessionId: 'sess-1',
                type: 'prompt',
                timestamp: new Date()
            };

            expect(interaction.id).toBeDefined();
            expect(interaction.sessionId).toBeDefined();
            expect(interaction.type).toBe('prompt');
        });

        it('should support tool_use with toolName', () => {
            const interaction: Interaction = {
                id: 'int-2',
                sessionId: 'sess-1',
                type: 'tool_use',
                timestamp: new Date(),
                toolName: 'write_to_file',
                durationMs: 500
            };

            expect(interaction.toolName).toBe('write_to_file');
            expect(interaction.durationMs).toBe(500);
        });
    });
});
