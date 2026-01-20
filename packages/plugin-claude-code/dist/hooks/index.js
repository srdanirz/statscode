
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// ../core/dist/database.js
import initSqlJs from "sql.js";
import { randomUUID } from "crypto";
import { homedir } from "os";
import { join } from "path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
var DEFAULT_DB_PATH = join(homedir(), ".statscode", "stats.sqlite");
var StatsDatabase = class {
  db = null;
  dbPath;
  initialized;
  constructor(config = {}) {
    this.dbPath = config.dbPath ?? DEFAULT_DB_PATH;
    const dir = this.dbPath.substring(0, this.dbPath.lastIndexOf("/"));
    mkdirSync(dir, { recursive: true });
    this.initialized = this.init();
  }
  async init() {
    const SQL = await initSqlJs();
    if (existsSync(this.dbPath)) {
      const buffer = readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }
    this.initTables();
  }
  initTables() {
    if (!this.db)
      return;
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        assistant TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        project_path TEXT,
        metadata TEXT
      )
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        duration_ms INTEGER,
        tool_name TEXT,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_assistant ON sessions(assistant)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type)`);
    this.save();
  }
  /** Ensure database is ready */
  async ready() {
    await this.initialized;
  }
  /** Save database to disk */
  save() {
    if (!this.db)
      return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    writeFileSync(this.dbPath, buffer);
  }
  /** Create a new session and return its ID */
  createSession(session) {
    if (!this.db)
      throw new Error("Database not initialized");
    const id = randomUUID();
    this.db.run(`INSERT INTO sessions (id, assistant, start_time, end_time, project_path, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`, [
      id,
      session.assistant,
      session.startTime.getTime(),
      session.endTime?.getTime() ?? null,
      session.projectPath ?? null,
      session.metadata ? JSON.stringify(session.metadata) : null
    ]);
    this.save();
    return id;
  }
  /** End a session by setting its end time */
  endSession(sessionId, endTime = /* @__PURE__ */ new Date()) {
    if (!this.db)
      throw new Error("Database not initialized");
    this.db.run(`UPDATE sessions SET end_time = ? WHERE id = ?`, [endTime.getTime(), sessionId]);
    this.save();
  }
  /** Get a session by ID */
  getSession(sessionId) {
    if (!this.db)
      throw new Error("Database not initialized");
    const stmt = this.db.prepare(`SELECT * FROM sessions WHERE id = ?`);
    stmt.bind([sessionId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.rowToSession(row);
    }
    stmt.free();
    return null;
  }
  /** Get all sessions */
  getAllSessions() {
    if (!this.db)
      throw new Error("Database not initialized");
    const results = [];
    const stmt = this.db.prepare(`SELECT * FROM sessions ORDER BY start_time DESC`);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(this.rowToSession(row));
    }
    stmt.free();
    return results;
  }
  /** Record an interaction */
  recordInteraction(interaction) {
    if (!this.db)
      throw new Error("Database not initialized");
    const id = randomUUID();
    this.db.run(`INSERT INTO interactions (id, session_id, type, timestamp, duration_ms, tool_name, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      id,
      interaction.sessionId,
      interaction.type,
      interaction.timestamp.getTime(),
      interaction.durationMs ?? null,
      interaction.toolName ?? null,
      interaction.metadata ? JSON.stringify(interaction.metadata) : null
    ]);
    this.save();
    return id;
  }
  /** Get all interactions for a session */
  getSessionInteractions(sessionId) {
    if (!this.db)
      throw new Error("Database not initialized");
    const results = [];
    const stmt = this.db.prepare(`SELECT * FROM interactions WHERE session_id = ? ORDER BY timestamp`);
    stmt.bind([sessionId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(this.rowToInteraction(row));
    }
    stmt.free();
    return results;
  }
  /** Get all interactions */
  getAllInteractions() {
    if (!this.db)
      throw new Error("Database not initialized");
    const results = [];
    const stmt = this.db.prepare(`SELECT * FROM interactions ORDER BY timestamp DESC`);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(this.rowToInteraction(row));
    }
    stmt.free();
    return results;
  }
  /** Get interaction counts by type */
  getInteractionCounts() {
    if (!this.db)
      throw new Error("Database not initialized");
    const results = {};
    const stmt = this.db.prepare(`SELECT type, COUNT(*) as count FROM interactions GROUP BY type`);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results[row.type] = row.count;
    }
    stmt.free();
    return results;
  }
  /** Get total hours tracked */
  getTotalHours() {
    if (!this.db)
      throw new Error("Database not initialized");
    const stmt = this.db.prepare(`SELECT SUM(COALESCE(end_time, ?) - start_time) as total_ms FROM sessions`);
    stmt.bind([Date.now()]);
    let totalMs = 0;
    if (stmt.step()) {
      const row = stmt.getAsObject();
      totalMs = row.total_ms ?? 0;
    }
    stmt.free();
    return totalMs / (1e3 * 60 * 60);
  }
  /** Close database connection */
  close() {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }
  rowToSession(row) {
    return {
      id: row.id,
      assistant: row.assistant,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : void 0,
      projectPath: row.project_path ?? void 0,
      metadata: row.metadata ? JSON.parse(row.metadata) : void 0
    };
  }
  rowToInteraction(row) {
    return {
      id: row.id,
      sessionId: row.session_id,
      type: row.type,
      timestamp: new Date(row.timestamp),
      durationMs: row.duration_ms ?? void 0,
      toolName: row.tool_name ?? void 0,
      metadata: row.metadata ? JSON.parse(row.metadata) : void 0
    };
  }
};

// ../core/dist/tracker.js
var Tracker = class {
  db;
  currentSessionId = null;
  config;
  eventListeners = [];
  constructor(config = {}) {
    this.config = config;
    this.db = new StatsDatabase(config);
  }
  /** Ensure database is ready before operations */
  async ready() {
    await this.db.ready();
  }
  /** Start a new session */
  startSession(assistant, projectPath) {
    if (this.currentSessionId) {
      this.endSession();
    }
    const session = {
      assistant,
      startTime: /* @__PURE__ */ new Date(),
      projectPath
    };
    this.currentSessionId = this.db.createSession(session);
    this.emit({
      type: "session_start",
      timestamp: /* @__PURE__ */ new Date(),
      data: { ...session, id: this.currentSessionId }
    });
    if (this.config.debug) {
      console.log(`[StatsCode] Session started: ${this.currentSessionId}`);
    }
    return this.currentSessionId;
  }
  /** End the current session */
  async endSession() {
    if (!this.currentSessionId)
      return;
    const endTime = /* @__PURE__ */ new Date();
    this.db.endSession(this.currentSessionId, endTime);
    const session = this.db.getSession(this.currentSessionId);
    if (session) {
      this.emit({
        type: "session_end",
        timestamp: endTime,
        data: session
      });
      if (this.config.enableTips) {
        const tips = await this.fetchTips(session);
        if (tips.length > 0) {
          this.emit({
            type: "tips_received",
            timestamp: /* @__PURE__ */ new Date(),
            data: tips
          });
        }
      }
    }
    if (this.config.debug) {
      console.log(`[StatsCode] Session ended: ${this.currentSessionId}`);
    }
    this.currentSessionId = null;
  }
  /** Fetch tips from AI Coach API */
  async fetchTips(session) {
    const apiUrl = this.config.apiUrl || "https://api.statscode.dev";
    try {
      const durationMs = session.endTime ? session.endTime.getTime() - session.startTime.getTime() : 0;
      const durationMinutes = Math.round(durationMs / 6e4);
      const interactions = this.db.getSessionInteractions(session.id);
      const promptCount = interactions.filter((i) => i.type === "prompt").length;
      const fileRefs = interactions.filter((i) => i.toolName?.includes("file")).length;
      const params = new URLSearchParams({
        tool: session.assistant,
        duration: String(durationMinutes),
        promptCount: String(promptCount),
        filesReferenced: String(fileRefs),
        compactUsed: "false",
        clearUsed: "false"
      });
      const response = await fetch(`${apiUrl}/api/tips?${params}`);
      if (!response.ok)
        return [];
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      if (this.config.debug) {
        console.error("[StatsCode] Failed to fetch tips:", error);
      }
      return [];
    }
  }
  /** Record an interaction in the current session */
  recordInteraction(type, options = {}) {
    if (!this.currentSessionId) {
      if (this.config.debug) {
        console.warn("[StatsCode] No active session, interaction not recorded");
      }
      return null;
    }
    const interaction = {
      sessionId: this.currentSessionId,
      type,
      timestamp: /* @__PURE__ */ new Date(),
      ...options
    };
    const id = this.db.recordInteraction(interaction);
    this.emit({
      type: "interaction",
      timestamp: /* @__PURE__ */ new Date(),
      data: { ...interaction, id }
    });
    if (this.config.debug) {
      console.log(`[StatsCode] Interaction recorded: ${type}${options.toolName ? ` (${options.toolName})` : ""}`);
    }
    return id;
  }
  /** Get the current session ID */
  getCurrentSessionId() {
    return this.currentSessionId;
  }
  /** Check if there's an active session */
  hasActiveSession() {
    return this.currentSessionId !== null;
  }
  /** Subscribe to tracker events */
  on(listener) {
    this.eventListeners.push(listener);
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }
  /** Get the database instance for advanced queries */
  getDatabase() {
    return this.db;
  }
  /** Close the tracker and database connection */
  close() {
    if (this.currentSessionId) {
      this.endSession();
    }
    this.db.close();
  }
  emit(event) {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("[StatsCode] Event listener error:", error);
      }
    }
  }
};

// ../core/dist/analyzer.js
var BADGE_DEFINITIONS = [
  {
    id: "power-user",
    name: "Power User",
    icon: "\u{1F525}",
    description: "100+ hours with AI assistants",
    check: (stats) => stats.totalHours >= 100
  },
  {
    id: "thoughtful",
    name: "Thoughtful",
    icon: "\u{1F3AF}",
    description: "50%+ interactions include edits",
    check: (stats) => {
      const byAssistant = Object.values(stats.byAssistant);
      if (byAssistant.length === 0)
        return false;
      const avgEditRate = byAssistant.reduce((sum, a) => sum + a.editRate, 0) / byAssistant.length;
      return avgEditRate >= 0.5;
    }
  },
  {
    id: "careful",
    name: "Careful",
    icon: "\u{1F6E1}\uFE0F",
    description: "Low accept rate without review (<30%)",
    check: (stats) => {
      const byAssistant = Object.values(stats.byAssistant);
      if (byAssistant.length === 0)
        return false;
      const avgAcceptRate = byAssistant.reduce((sum, a) => sum + a.acceptRate, 0) / byAssistant.length;
      return avgAcceptRate < 0.3;
    }
  },
  {
    id: "speed-demon",
    name: "Speed Demon",
    icon: "\u26A1",
    description: "Average session under 30 minutes",
    check: (stats) => {
      const byAssistant = Object.values(stats.byAssistant);
      if (byAssistant.length === 0)
        return false;
      const avgDuration = byAssistant.reduce((sum, a) => sum + a.avgSessionDuration, 0) / byAssistant.length;
      return avgDuration > 0 && avgDuration < 30;
    }
  },
  {
    id: "tester",
    name: "Tester",
    icon: "\u{1F9EA}",
    description: "Frequently works with tests",
    check: (_stats) => {
      return false;
    }
  },
  {
    id: "documenter",
    name: "Documenter",
    icon: "\u{1F4DA}",
    description: "Frequently works with documentation",
    check: (_stats) => {
      return false;
    }
  }
];
var Analyzer = class {
  db;
  constructor(db) {
    this.db = db;
  }
  /** Calculate complete user stats */
  calculateStats() {
    const sessions = this.db.getAllSessions();
    const interactions = this.db.getAllInteractions();
    const interactionCounts = this.db.getInteractionCounts();
    const byAssistant = {};
    const assistants = ["claude-code", "opencode", "codex", "antigravity", "cursor"];
    for (const assistant of assistants) {
      const assistantSessions = sessions.filter((s) => s.assistant === assistant);
      const sessionIds = new Set(assistantSessions.map((s) => s.id));
      const assistantInteractions = interactions.filter((i) => sessionIds.has(i.sessionId));
      if (assistantSessions.length === 0)
        continue;
      const totalMs = assistantSessions.reduce((sum, s) => {
        const end = s.endTime ?? /* @__PURE__ */ new Date();
        return sum + (end.getTime() - s.startTime.getTime());
      }, 0);
      const accepts = assistantInteractions.filter((i) => i.type === "accept").length;
      const edits = assistantInteractions.filter((i) => i.type === "edit").length;
      const totalActions = accepts + edits + assistantInteractions.filter((i) => i.type === "reject").length;
      byAssistant[assistant] = {
        hours: totalMs / (1e3 * 60 * 60),
        sessions: assistantSessions.length,
        interactions: assistantInteractions.length,
        acceptRate: totalActions > 0 ? accepts / totalActions : 0,
        editRate: totalActions > 0 ? edits / totalActions : 0,
        avgSessionDuration: totalMs / assistantSessions.length / (1e3 * 60)
        // in minutes
      };
    }
    const totalHours = this.db.getTotalHours();
    const stats = {
      totalHours,
      totalSessions: sessions.length,
      totalInteractions: interactions.length,
      byAssistant,
      badges: [],
      score: 0,
      lastUpdated: /* @__PURE__ */ new Date()
    };
    stats.badges = this.calculateBadges(stats);
    stats.score = this.calculateScore(stats);
    return stats;
  }
  /** Calculate earned badges */
  calculateBadges(stats) {
    const earnedBadges = [];
    for (const criteria of BADGE_DEFINITIONS) {
      if (criteria.check(stats)) {
        earnedBadges.push({
          id: criteria.id,
          name: criteria.name,
          description: criteria.description,
          icon: criteria.icon,
          earnedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return earnedBadges;
  }
  /** Calculate overall score (0-5 scale) */
  calculateScore(stats) {
    let score = 0;
    let factors = 0;
    if (stats.totalHours > 0) {
      score += Math.min(stats.totalHours / 100, 1);
      factors++;
    }
    const assistantStats = Object.values(stats.byAssistant);
    if (assistantStats.length > 0) {
      const avgEditRate = assistantStats.reduce((sum, a) => sum + a.editRate, 0) / assistantStats.length;
      score += avgEditRate;
      factors++;
    }
    if (stats.totalSessions > 10) {
      score += Math.min(stats.totalSessions / 100, 1);
      factors++;
    }
    score += Math.min(stats.badges.length / 4, 1);
    factors++;
    const assistantsUsed = Object.keys(stats.byAssistant).length;
    score += Math.min(assistantsUsed / 3, 1);
    factors++;
    return factors > 0 ? score / factors * 5 : 0;
  }
  /** Get badge definition by ID */
  static getBadgeDefinition(id) {
    return BADGE_DEFINITIONS.find((b) => b.id === id);
  }
  /** Get all badge definitions */
  static getAllBadgeDefinitions() {
    return [...BADGE_DEFINITIONS];
  }
};

// ../core/dist/certificate.js
import { createHash } from "crypto";
var CertificateGenerator = class _CertificateGenerator {
  userId;
  constructor(userId = "anonymous") {
    this.userId = userId;
  }
  /** Generate a complete certificate */
  generateCertificate(stats) {
    const certificate = {
      userId: this.userId,
      generatedAt: /* @__PURE__ */ new Date(),
      stats,
      verificationHash: ""
    };
    certificate.verificationHash = this.generateHash(certificate);
    return certificate;
  }
  /** Generate verification hash for a certificate */
  generateHash(certificate) {
    const data = JSON.stringify({
      userId: certificate.userId,
      generatedAt: certificate.generatedAt.toISOString(),
      totalHours: certificate.stats.totalHours,
      totalSessions: certificate.stats.totalSessions,
      badges: certificate.stats.badges.map((b) => b.id)
    });
    return `sha256:${createHash("sha256").update(data).digest("hex").substring(0, 16)}`;
  }
  /** Generate SVG badge for GitHub README */
  generateBadgeSVG(stats) {
    const hours = Math.round(stats.totalHours);
    const score = stats.score.toFixed(1);
    const badgeIcons = stats.badges.map((b) => b.icon).join(" ");
    const width = 280;
    const height = 80;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#e94560"/>
      <stop offset="100%" style="stop-color:#0f3460"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" rx="8" fill="url(#bg)"/>
  
  <!-- Accent line -->
  <rect x="0" y="0" width="${width}" height="4" rx="2" fill="url(#accent)"/>
  
  <!-- Logo/Title -->
  <text x="15" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="#ffffff">
    \u{1F4CA} StatsCode
  </text>
  
  <!-- Stats -->
  <text x="15" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#a0a0a0">
    ${hours}h tracked \u2022 \u2B50 ${score}/5
  </text>
  
  <!-- Badges -->
  <text x="15" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#ffffff">
    ${badgeIcons || "\u{1F3AF} Start earning badges!"}
  </text>
  
  <!-- Verified indicator -->
  <text x="${width - 55}" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="9" fill="#4ade80">
    \u2713 Verified
  </text>
</svg>`;
  }
  /** Generate JSON export */
  generateJSON(stats) {
    const certificate = this.generateCertificate(stats);
    return JSON.stringify(certificate, null, 2);
  }
  /** Generate HTML profile card */
  generateHTML(stats) {
    const certificate = this.generateCertificate(stats);
    const hours = Math.round(stats.totalHours);
    const score = stats.score.toFixed(1);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StatsCode Profile - ${this.userId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 32px;
      max-width: 400px;
      width: 100%;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .logo { font-size: 32px; }
    .title { color: #fff; font-size: 24px; font-weight: bold; }
    .user { color: #a0a0a0; font-size: 14px; }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat {
      text-align: center;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
    }
    .stat-value { color: #fff; font-size: 24px; font-weight: bold; }
    .stat-label { color: #a0a0a0; font-size: 12px; margin-top: 4px; }
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 24px;
    }
    .badge {
      background: linear-gradient(135deg, #e94560, #0f3460);
      padding: 8px 16px;
      border-radius: 20px;
      color: #fff;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      color: #4ade80;
      font-size: 12px;
    }
    .hash { color: #666; font-size: 10px; word-break: break-all; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="logo">\u{1F4CA}</span>
      <div>
        <div class="title">StatsCode</div>
        <div class="user">${this.userId}</div>
      </div>
    </div>
    
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${hours}h</div>
        <div class="stat-label">Total Hours</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.totalSessions}</div>
        <div class="stat-label">Sessions</div>
      </div>
      <div class="stat">
        <div class="stat-value">\u2B50 ${score}</div>
        <div class="stat-label">Score</div>
      </div>
    </div>
    
    <div class="badges">
      ${stats.badges.map((b) => `<span class="badge">${b.icon} ${b.name}</span>`).join("")}
      ${stats.badges.length === 0 ? '<span style="color: #666">No badges yet - keep coding!</span>' : ""}
    </div>
    
    <div class="footer">
      \u2713 Verified Certificate
      <div class="hash">${certificate.verificationHash}</div>
    </div>
  </div>
</body>
</html>`;
  }
  /** Verify a certificate hash */
  static verify(certificate) {
    const generator = new _CertificateGenerator(certificate.userId);
    const expectedHash = generator.generateHash({
      userId: certificate.userId,
      generatedAt: certificate.generatedAt,
      stats: certificate.stats
    });
    return expectedHash === certificate.verificationHash;
  }
};

// ../core/dist/index.js
var StatsCode = class {
  tracker;
  analyzer;
  certificateGenerator;
  constructor(config = {}) {
    this.tracker = new Tracker(config);
    this.analyzer = new Analyzer(this.tracker.getDatabase());
    this.certificateGenerator = new CertificateGenerator(config.userId);
  }
  /** Initialize the database - must be called before using other methods */
  async ready() {
    await this.tracker.ready();
  }
  /** Get the tracker instance */
  getTracker() {
    return this.tracker;
  }
  /** Get the analyzer instance */
  getAnalyzer() {
    return this.analyzer;
  }
  /** Calculate current stats */
  getStats() {
    return this.analyzer.calculateStats();
  }
  /** Generate a certificate */
  getCertificate() {
    const stats = this.getStats();
    return this.certificateGenerator.generateCertificate(stats);
  }
  /** Generate SVG badge */
  getBadgeSVG() {
    const stats = this.getStats();
    return this.certificateGenerator.generateBadgeSVG(stats);
  }
  /** Generate JSON export */
  getJSON() {
    const stats = this.getStats();
    return this.certificateGenerator.generateJSON(stats);
  }
  /** Generate HTML profile */
  getHTML() {
    const stats = this.getStats();
    return this.certificateGenerator.generateHTML(stats);
  }
  /** Close all connections */
  close() {
    this.tracker.close();
  }
};

// hooks/index.ts
import { homedir as homedir2 } from "os";
import { join as join2 } from "path";
var statsCode = null;
var initPromise = null;
async function getStatsCode() {
  if (!statsCode) {
    statsCode = new StatsCode({
      dbPath: join2(homedir2(), ".statscode", "stats.sqlite"),
      debug: process.env.STATSCODE_DEBUG === "true",
      enableTips: true
    });
    statsCode.getTracker().on((event) => {
      if (event.type === "tips_received" && Array.isArray(event.data)) {
        console.log("\n\x1B[36m\u{1F916} AI Coach Tips:\x1B[0m");
        event.data.forEach((tip) => {
          console.log(`\x1B[33m\u2022 ${tip.text}\x1B[0m`);
        });
        console.log("");
      }
    });
    initPromise = statsCode.ready();
  }
  await initPromise;
  return statsCode;
}
async function PreToolUse(params) {
  const sc = await getStatsCode();
  const tracker = sc.getTracker();
  if (!tracker.hasActiveSession()) {
    tracker.startSession("claude-code", process.cwd());
  }
  tracker.recordInteraction("tool_use", {
    toolName: params.tool_name,
    metadata: {
      inputKeys: Object.keys(params.tool_input)
    }
  });
  return void 0;
}
async function PostToolUse(params) {
  const sc = await getStatsCode();
  const tracker = sc.getTracker();
  let interactionType = "response";
  if (params.tool_name.includes("edit") || params.tool_name.includes("write")) {
    interactionType = params.tool_result.success ? "accept" : "reject";
  }
  tracker.recordInteraction(interactionType, {
    toolName: params.tool_name,
    metadata: { success: params.tool_result.success }
  });
}
async function OnPrompt(_params) {
  const sc = await getStatsCode();
  const tracker = sc.getTracker();
  if (!tracker.hasActiveSession()) {
    tracker.startSession("claude-code", process.cwd());
  }
  tracker.recordInteraction("prompt", {
    metadata: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  });
}
async function Stop() {
  if (!statsCode) return;
  const tracker = statsCode.getTracker();
  tracker.endSession();
  statsCode.close();
  statsCode = null;
  initPromise = null;
}
async function main() {
  const hookName = process.argv[2];
  if (!hookName) {
    console.error("Usage: node hooks/index.js <HookName>");
    process.exit(1);
  }
  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const rawInput = Buffer.concat(chunks).toString("utf8");
    if (rawInput.trim()) {
      input = JSON.parse(rawInput);
    }
  } catch (e) {
  }
  try {
    switch (hookName) {
      case "PreToolUse":
        await PreToolUse({
          tool_name: input.tool_name || "",
          tool_input: input.tool_input || {}
        });
        break;
      case "PostToolUse":
        await PostToolUse({
          tool_name: input.tool_name || "",
          tool_input: input.tool_input || {},
          tool_result: input.tool_result || { success: true }
        });
        break;
      case "OnPrompt":
        await OnPrompt({ prompt: input.prompt || "" });
        break;
      case "Stop":
      case "SessionEnd":
        await Stop();
        break;
      case "SessionStart":
        const sc = await getStatsCode();
        const tracker = sc.getTracker();
        if (!tracker.hasActiveSession()) {
          tracker.startSession("claude-code", input.cwd || process.cwd());
        }
        break;
      default:
        console.error(`Unknown hook: ${hookName}`);
        process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    console.error(`Hook ${hookName} failed:`, error);
    process.exit(1);
  }
}
main();
export {
  OnPrompt,
  PostToolUse,
  PreToolUse,
  Stop,
  getStatsCode
};
