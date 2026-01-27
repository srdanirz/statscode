# Project Rules - Interactive Map Platform

## Project Overview

Modern interactive map platform - fork/evolution of Google Maps and Sosafe with enhanced visual experience.

**Core Concept:**
- Interactive map showing restaurants, events, and points of interest
- Each location/quadrant has unique visual design (e.g., Costanera Center has its own visual representation)
- Futuristic style inspired by Pokémon GO aesthetics
- KISS principle (Keep It Simple Stupid) - 2D implementation for optimal performance
- No unnecessary 3D complexity - prioritize fluidity and practicality

**Cloud Resources:**
- GCP credits available (primary cloud for development)
- Microsoft Azure access via CLI (available if needed)
- AWS available but already in use for other projects (avoid unless absolutely necessary)

## Working Guidelines

**IMPORTANT: Follow these guidelines for every interaction:**

**Think First, Read Code** - Before making changes, thoroughly read the codebase for relevant files. Never speculate about code you haven't opened.

**Search Before Create (Anti-Duplication)** - Before creating ANY new helper, component, or type, you MUST search the codebase (`grep_search`) to see if it already exists. Reinterpreting or wrapping existing code is better than duplicating it.

**Check In Before Major Changes** - Before making any significant changes, present the plan for verification.

**High-Level Explanations** - For every step, provide a brief high-level explanation of what changes were made.

**Simplicity First** - Make every task and code change as simple as possible. Avoid massive or complex changes. Every change should impact as little code as possible.

**Maintain Architecture Docs** - Keep architecture documentation up-to-date in `docs/ARCHITECTURE.md`.

**No Speculation** - Never make claims about code before investigating. If a specific file is referenced, ALWAYS read the file before answering. Give grounded, hallucination-free answers.

**No Libraries Before Requirements** - Never suggest or implement libraries/frameworks until requirements are fully defined and evaluated.

## Code Quality Standards

**Modularity & Reusability:**
- Always create reusable components
- Never duplicate code - extract shared logic into modules
- Keep components small and focused (single responsibility)

**Code Organization:**
- Modular architecture - each feature in its own module
- Clear folder structure following domain-driven design
- Separation of concerns (UI, business logic, data layer)

**Scalability & Technical Debt:**
- Plan for scale from day one
- Avoid shortcuts that create technical debt
- Refactor as you go - never "will fix later"
- Document architectural decisions

**Performance:**
- Optimize for fluidity and smooth UX
- Lazy load resources when possible
- Minimize bundle size
- Profile and measure - don't guess

## Visual Design Principles

**Style:**
- Futuristic aesthetic (Pokémon GO inspired)
- Hybrid approach: Custom icons + visual effects
- Each location type has distinctive visual identity
- Animations should be smooth and purposeful

**Implementation:**
- 2D only - no 3D complexity
- Web-first, mobile-responsive
- Accessible and inclusive design
- Fast load times, smooth interactions

## Development Workflow

1. **Requirements First** - Fully document what we're building before choosing tech
2. **Evaluate Options** - Compare technologies objectively with pros/cons
3. **Prototype** - Build small proof of concept before full implementation
4. **Iterate** - Ship small, gather feedback, improve
5. **Document** - Keep docs updated as code evolves

## File Structure (to be maintained)

```
map/
├── .claude/
│   └── claude.md (this file)
├── docs/
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── TECH_EVALUATION.md
│   └── DECISIONS.md
├── src/ (TBD based on tech stack)
└── tests/ (TBD based on tech stack)
```

## Key Features (High Level)

- **Interactive Map** - Main canvas showing locations
- **Custom Quadrants** - Each space visually represents the actual place
- **Restaurants** - Display, filter, search restaurants
- **Events** - Show upcoming events on the map
- **Responsive** - Work seamlessly on mobile and desktop
- **Fast** - Prioritize performance over fancy features

## Anti-Patterns to Avoid

- ❌ Over-engineering solutions
- ❌ Premature optimization
- ❌ Technology-first approach (choose tech for requirements, not vice versa)
- ❌ Monolithic components
- ❌ Tight coupling
- ❌ Magic numbers/strings
- ❌ Skipping documentation
- ❌ Copy-paste code
