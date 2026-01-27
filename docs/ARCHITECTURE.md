# Architecture

## Overview

StatsCode is a monorepo containing multiple packages for tracking AI coding assistant usage.

## Package Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                    Applications                      │
│  ┌─────────┐                                        │
│  │   web   │  Next.js frontend                      │
│  └────┬────┘                                        │
├───────┼─────────────────────────────────────────────┤
│       │              Plugins                         │
│  ┌────┴────────────────────────────────────────┐    │
│  │ plugin-claude-code  plugin-codex            │    │
│  │ plugin-antigravity  plugin-opencode         │    │
│  │ plugin-cursor                               │    │
│  └────────────────┬───────────────────────────┘    │
├───────────────────┼─────────────────────────────────┤
│                   │          Core                    │
│           ┌───────┴───────┐                         │
│           │    badges     │  Badge system            │
│           └───────┬───────┘                         │
│           ┌───────┴───────┐                         │
│           │     core      │  Tracking & storage      │
│           └───────────────┘                         │
└─────────────────────────────────────────────────────┘
```

## Package Dependencies

| Package | Depends On |
|---------|------------|
| `core` | sql.js |
| `badges` | core |
| `plugin-*` | core |
| `web` | (standalone) |

## Data Flow

1. User interacts with AI tool (Claude Code, Cursor, etc.)
2. Plugin hooks capture events (session start, interactions)
3. Core tracker records to local SQLite database
4. Analyzer computes stats from raw data
5. Badge checker evaluates criteria against stats

## File Organization

Each package follows the same structure:

```
packages/{name}/
├── package.json          # Package metadata
├── tsconfig.json         # TypeScript config
└── src/
    ├── index.ts          # Public API exports
    ├── types.ts          # Type definitions
    ├── {module}.ts       # Implementation
    └── __tests__/        # Unit tests
        └── {module}.test.ts
```

## Key Design Decisions

1. **Local-first**: Data never leaves the machine unless user opts in
2. **Plugin architecture**: Each AI tool has its own plugin
3. **Monorepo**: All packages in one repo for easier development
4. **TypeScript**: Full type safety across all packages
5. **SQLite via sql.js**: Pure JavaScript, no native dependencies
