#!/usr/bin/env node
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// scripts/insights.mjs
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
var insightsDir = join(homedir(), ".statscode", "insights");
function loadDebriefs() {
  if (!existsSync(insightsDir)) {
    return [];
  }
  const files = readdirSync(insightsDir).filter((f) => f.endsWith(".json")).sort().reverse();
  const debriefs = [];
  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(insightsDir, file), "utf-8"));
      debriefs.push(data);
    } catch {
    }
  }
  return debriefs;
}
function aggregatePatterns(debriefs) {
  const patterns = {
    // Counters
    totalSessions: debriefs.length,
    totalInteractions: 0,
    totalPrompts: 0,
    totalToolUses: 0,
    totalEdits: 0,
    totalErrors: 0,
    // Aggregated strengths/improvements
    strengthsCount: {},
    improvementsCount: {},
    // Tool usage across sessions
    toolUsage: {},
    // Common errors
    errorsCount: {}
  };
  for (const debrief of debriefs) {
    patterns.totalInteractions += debrief.metrics?.totalInteractions || 0;
    patterns.totalPrompts += debrief.metrics?.userPrompts || 0;
    patterns.totalToolUses += debrief.metrics?.toolUses || 0;
    patterns.totalEdits += debrief.metrics?.edits || 0;
    patterns.totalErrors += debrief.metrics?.errors || 0;
    for (const strength of debrief.patterns?.strengths || []) {
      patterns.strengthsCount[strength] = (patterns.strengthsCount[strength] || 0) + 1;
    }
    for (const improvement of debrief.patterns?.improvements || []) {
      const normalized = improvement.replace(/\d+/g, "N");
      patterns.improvementsCount[normalized] = (patterns.improvementsCount[normalized] || 0) + 1;
    }
    for (const [tool, count] of Object.entries(debrief.patterns?.toolUsage || {})) {
      patterns.toolUsage[tool] = (patterns.toolUsage[tool] || 0) + count;
    }
    for (const error of debrief.patterns?.commonErrors || []) {
      const shortError = error.slice(0, 50);
      patterns.errorsCount[shortError] = (patterns.errorsCount[shortError] || 0) + 1;
    }
  }
  return patterns;
}
function calculateTrends(debriefs) {
  if (debriefs.length < 2) return null;
  const recent = debriefs.slice(0, 5);
  const older = debriefs.slice(5, 10);
  if (older.length === 0) return null;
  const recentAvg = {
    prompts: recent.reduce((sum, d) => sum + (d.metrics?.userPrompts || 0), 0) / recent.length,
    errors: recent.reduce((sum, d) => sum + (d.metrics?.errors || 0), 0) / recent.length,
    edits: recent.reduce((sum, d) => sum + (d.metrics?.edits || 0), 0) / recent.length
  };
  const olderAvg = {
    prompts: older.reduce((sum, d) => sum + (d.metrics?.userPrompts || 0), 0) / older.length,
    errors: older.reduce((sum, d) => sum + (d.metrics?.errors || 0), 0) / older.length,
    edits: older.reduce((sum, d) => sum + (d.metrics?.edits || 0), 0) / older.length
  };
  return {
    promptsChange: olderAvg.prompts > 0 ? (recentAvg.prompts - olderAvg.prompts) / olderAvg.prompts * 100 : 0,
    errorsChange: olderAvg.errors > 0 ? (recentAvg.errors - olderAvg.errors) / olderAvg.errors * 100 : 0,
    editsChange: olderAvg.edits > 0 ? (recentAvg.edits - olderAvg.edits) / olderAvg.edits * 100 : 0
  };
}
function displayInsights() {
  const debriefs = loadDebriefs();
  console.log("");
  console.log("\u{1F9E0} StatsCode Session Insights");
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
  if (debriefs.length === 0) {
    console.log("");
    console.log("No session insights yet!");
    console.log("");
    console.log("Insights are captured when your context compacts.");
    console.log("Keep coding - insights will appear after a few sessions.");
    console.log("");
    console.log("Tip: Run /compact to manually trigger insight capture.");
    console.log("");
    return;
  }
  const patterns = aggregatePatterns(debriefs);
  console.log("");
  console.log(`\u{1F4CA} Sessions Analyzed: ${patterns.totalSessions}`);
  console.log(`\u{1F4AC} Total Prompts: ${patterns.totalPrompts}`);
  console.log(`\u{1F527} Tool Uses: ${patterns.totalToolUses}`);
  console.log(`\u270F\uFE0F  Edits Made: ${patterns.totalEdits}`);
  console.log(`\u26A0\uFE0F  Errors: ${patterns.totalErrors}`);
  const errorRate = patterns.totalToolUses > 0 ? (patterns.totalErrors / patterns.totalToolUses * 100).toFixed(1) : 0;
  console.log(`\u{1F4C9} Error Rate: ${errorRate}%`);
  console.log("");
  const topStrengths = Object.entries(patterns.strengthsCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topStrengths.length > 0) {
    console.log("\u{1F4AA} Your Strengths:");
    for (const [strength, count] of topStrengths) {
      const frequency = Math.round(count / patterns.totalSessions * 100);
      console.log(`   \u2713 ${strength} (${frequency}% of sessions)`);
    }
    console.log("");
  }
  const topImprovements = Object.entries(patterns.improvementsCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topImprovements.length > 0) {
    console.log("\u{1F4C8} Areas to Improve:");
    for (const [improvement, count] of topImprovements) {
      const frequency = Math.round(count / patterns.totalSessions * 100);
      const cleanMsg = improvement.replace(/N /g, "multiple ").replace(/N$/g, "some");
      console.log(`   \u2192 ${cleanMsg} (${frequency}% of sessions)`);
    }
    console.log("");
  }
  const topTools = Object.entries(patterns.toolUsage).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topTools.length > 0) {
    console.log("\u{1F527} Most Used Tools:");
    for (const [tool, count] of topTools) {
      console.log(`   \u2022 ${tool}: ${count}`);
    }
    console.log("");
  }
  const trends = calculateTrends(debriefs);
  if (trends) {
    console.log("\u{1F4CA} Trends (Recent vs Previous):");
    const formatTrend = (value, name, inverse = false) => {
      const arrow = value > 0 ? "\u2191" : value < 0 ? "\u2193" : "\u2192";
      const color = inverse ? value > 0 ? "\u26A0\uFE0F" : value < 0 ? "\u2705" : "\u2796" : value > 0 ? "\u2705" : value < 0 ? "\u26A0\uFE0F" : "\u2796";
      return `   ${color} ${name}: ${arrow} ${Math.abs(value).toFixed(0)}%`;
    };
    console.log(formatTrend(trends.editsChange, "Edits"));
    console.log(formatTrend(trends.promptsChange, "Prompts"));
    console.log(formatTrend(trends.errorsChange, "Errors", true));
    console.log("");
  }
  console.log("\u{1F4A1} Tips:");
  if (errorRate > 20) {
    console.log("   \u2022 High error rate - try providing more context in prompts");
  }
  const vagueImprovements = Object.keys(patterns.improvementsCount).filter((i) => i.includes("vague"));
  if (vagueImprovements.length > 0) {
    console.log('   \u2022 Be more specific in prompts - avoid single words like "fix" or "help"');
  }
  const shortPromptImprovements = Object.keys(patterns.improvementsCount).filter((i) => i.includes("short prompts"));
  if (shortPromptImprovements.length > 0) {
    console.log("   \u2022 Try combining multiple small requests into one detailed prompt");
  }
  if (topStrengths.length === 0 && topImprovements.length === 0) {
    console.log("   \u2022 Keep coding! More insights will appear as you use Claude Code");
  }
  console.log("");
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
  console.log("\u{1F517} statscode.dev");
}
displayInsights();
