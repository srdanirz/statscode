---
description: Get a dynamic badge for your GitHub profile README
---

# Badge Command

Generate a StatsCode badge to add to your GitHub profile or project README.

## Usage

Type `/statscode:badge` to get your personalized badge.

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

1. Run `/statscode:login` to authenticate with GitHub
2. Run `/statscode:sync` to upload your stats
3. Run `/statscode:badge` to get your badge URL

## Customization

Badge styles available:
- `flat` (default)
- `flat-square`
- `plastic`

Add `?style=flat-square` to the URL for different styles.
