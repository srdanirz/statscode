# Changelog

All notable changes to this project will be documented in this file.

## [0.3.11] - 2026-01-28

### Added
- OpenCode plugin with correct API integration
  - Implements official OpenCode hooks (`session.created`, `tool.execute.before`, etc.)
  - Based on [OpenCode Plugin Documentation](https://opencode.ai/docs/plugins/)
  - Custom tools: `statscode.stats`, `statscode.badge`, `statscode.sync`

### Changed
- Updated `@statscode/plugin-opencode` to use official OpenCode plugin structure
- Added README with installation instructions for OpenCode

## [0.3.10] - 2026-01-28

### Added
- Session insights system (`/statscode:insights`)
- PreCompact hook for automatic session debriefs
- Lines added/removed tracking (separate from net lines)
- Badge display command (`/statscode:badge`) shows earned achievements

### Fixed
- Session tracking across multi-process hooks
- Stop hook no longer clears session prematurely

### Changed
- Cleaned up debug code and unused files
- Updated documentation

## [0.3.0] - 2026-01-20

### Added
- Cloud sync with GitHub authentication
- API client for statscode.dev integration
- Auto-sync on session end
- Token refresh mechanism

## [0.1.0] - 2026-01-17

### Added
- Core tracking library (`@statscode/core`)
- Badge system (`@statscode/badges`)
- Plugin for Claude Code (`@statscode/plugin-claude-code`)

### Planned
- Plugin for Cursor (Pronto)
- Plugin for Codex (Pronto)
- Plugin for Antigravity (Pronto)
- Plugin for OpenCode (Pronto)
