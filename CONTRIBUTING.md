# Contributing to StatsCode

Thank you for your interest in contributing to StatsCode!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/statscode/statscode.git
cd statscode

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Run the website locally
cd packages/web && npm run dev
```

## Project Structure

```
statscode/
├── packages/
│   ├── core/              # Core tracking library
│   ├── badges/            # Badge system
│   ├── plugin-*/          # Tool-specific plugins
│   └── web/               # Next.js website
├── docs/                  # Documentation
└── examples/              # Usage examples
```

## Code Style

- Use TypeScript for all code
- Follow existing patterns in the codebase
- Write tests for new features
- Keep functions small and focused

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit with a descriptive message
6. Push to your fork
7. Open a Pull Request

## Package Guidelines

Each package should have:
- `src/` directory for source code
- `src/index.ts` as the main entry point
- `package.json` with proper metadata
- `tsconfig.json` extending root config
- Unit tests in `__tests__/` directory

## Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring

## Questions?

Open an issue or discussion on GitHub.
