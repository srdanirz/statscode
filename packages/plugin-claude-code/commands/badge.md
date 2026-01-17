---
description: Get a dynamic badge for your GitHub profile README
---

# Badge Command

Generate a StatsCode badge to add to your GitHub profile or project README.

## Usage

Type `/stats:badge` to get your personalized badge.

## Output

You'll get markdown code to copy:

```markdown
[![StatsCode](https://api.statscode.dev/badge/YOUR_USERNAME.svg)](https://statscode.dev/profile/YOUR_USERNAME)
```

## What the Badge Shows

The badge displays:
- Your total tracked hours
- Your score (0-5)

Example: `StatsCode | 127h | 4.2`

## Requirements

You must be logged in and synced to get a working badge:

1. Run `/stats:login` to authenticate with GitHub
2. Run `/stats:sync` to upload your stats
3. Run `/stats:badge` to get your badge URL

## Customization

Badge styles available:
- `flat` (default)
- `flat-square`
- `plastic`

Add `?style=flat-square` to the URL for different styles.
