# StatsCode

Open source library to track, analyze, and certify how you use AI coding assistants.

## Features

- **Multi-tool tracking**: Claude Code, Codex, Antigravity, OpenCode, Cursor
- **Local-first**: All data stored locally by default
- **Badge system**: Earn achievements based on your coding style
- **Verifiable certificates**: Export stats for your resume or profile

## Quick Start

```bash
# Clone
git clone https://github.com/statscode/statscode.git
cd statscode

# Install & build
npm install
npm run build

# Run tests
npm test

# Run website
cd packages/web && npm run dev
```

## Project Structure

```
statscode/
├── packages/
│   ├── core/                 # Core tracking library
│   │   └── src/
│   │       ├── tracker.ts    # Session & interaction tracking
│   │       ├── database.ts   # SQLite storage
│   │       ├── analyzer.ts   # Stats calculation
│   │       └── __tests__/    # Unit tests
│   │
│   ├── badges/               # Badge system
│   │   └── src/
│   │       ├── types.ts      # Type definitions
│   │       ├── definitions.ts # Badge catalog
│   │       ├── checker.ts    # Criteria evaluation
│   │       └── __tests__/    # Unit tests
│   │
│   ├── plugin-claude-code/   # Claude Code integration
│   ├── plugin-codex/         # Codex CLI integration
│   ├── plugin-antigravity/   # Antigravity integration
│   ├── plugin-opencode/      # OpenCode integration
│   ├── plugin-cursor/        # Cursor IDE integration
│   │
│   └── web/                  # Next.js website
│       └── app/
│           ├── page.tsx      # Homepage
│           ├── leaderboard/  # Rankings
│           ├── badges/       # Badge gallery
│           └── profile/      # User profiles
│
├── docs/                     # Documentation
├── LICENSE                   # MIT License
├── CONTRIBUTING.md           # Contribution guide
└── CHANGELOG.md              # Release notes
```

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| `@statscode/core` | Tracking, database, analyzer | 0.1.0 |
| `@statscode/badges` | Badge definitions & checker | 0.1.0 |
| `@statscode/plugin-claude-code` | Claude Code hooks | 0.1.0 |
| `@statscode/plugin-codex` | Codex CLI hooks | 0.1.0 |
| `@statscode/plugin-antigravity` | Antigravity hooks | 0.1.0 |
| `@statscode/plugin-opencode` | OpenCode hooks | 0.1.0 |
| `@statscode/plugin-cursor` | Cursor IDE hooks | 0.1.0 |

## Development

```bash
# Build all packages
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Clean build artifacts
npm run clean
```

## Privacy

All data is stored locally. Nothing is sent to any server unless you explicitly opt-in.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
