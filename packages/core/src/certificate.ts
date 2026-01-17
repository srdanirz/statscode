/**
 * StatsCode Certificate Module
 * Generates verifiable certificates and badges
 */

import { createHash } from 'crypto';
import { UserStats, Certificate } from './types.js';

export class CertificateGenerator {
    private userId: string;

    constructor(userId: string = 'anonymous') {
        this.userId = userId;
    }

    /** Generate a complete certificate */
    generateCertificate(stats: UserStats): Certificate {
        const certificate: Certificate = {
            userId: this.userId,
            generatedAt: new Date(),
            stats,
            verificationHash: ''
        };

        certificate.verificationHash = this.generateHash(certificate);
        return certificate;
    }

    /** Generate verification hash for a certificate */
    private generateHash(certificate: Omit<Certificate, 'verificationHash'>): string {
        const data = JSON.stringify({
            userId: certificate.userId,
            generatedAt: certificate.generatedAt.toISOString(),
            totalHours: certificate.stats.totalHours,
            totalSessions: certificate.stats.totalSessions,
            badges: certificate.stats.badges.map(b => b.id)
        });

        return `sha256:${createHash('sha256').update(data).digest('hex').substring(0, 16)}`;
    }

    /** Generate SVG badge for GitHub README */
    generateBadgeSVG(stats: UserStats): string {
        const hours = Math.round(stats.totalHours);
        const score = stats.score.toFixed(1);
        const badgeIcons = stats.badges.map(b => b.icon).join(' ');

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
    📊 StatsCode
  </text>
  
  <!-- Stats -->
  <text x="15" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#a0a0a0">
    ${hours}h tracked • ⭐ ${score}/5
  </text>
  
  <!-- Badges -->
  <text x="15" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#ffffff">
    ${badgeIcons || '🎯 Start earning badges!'}
  </text>
  
  <!-- Verified indicator -->
  <text x="${width - 55}" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="9" fill="#4ade80">
    ✓ Verified
  </text>
</svg>`;
    }

    /** Generate JSON export */
    generateJSON(stats: UserStats): string {
        const certificate = this.generateCertificate(stats);
        return JSON.stringify(certificate, null, 2);
    }

    /** Generate HTML profile card */
    generateHTML(stats: UserStats): string {
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
      <span class="logo">📊</span>
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
        <div class="stat-value">⭐ ${score}</div>
        <div class="stat-label">Score</div>
      </div>
    </div>
    
    <div class="badges">
      ${stats.badges.map(b => `<span class="badge">${b.icon} ${b.name}</span>`).join('')}
      ${stats.badges.length === 0 ? '<span style="color: #666">No badges yet - keep coding!</span>' : ''}
    </div>
    
    <div class="footer">
      ✓ Verified Certificate
      <div class="hash">${certificate.verificationHash}</div>
    </div>
  </div>
</body>
</html>`;
    }

    /** Verify a certificate hash */
    static verify(certificate: Certificate): boolean {
        const generator = new CertificateGenerator(certificate.userId);
        const expectedHash = generator.generateHash({
            userId: certificate.userId,
            generatedAt: certificate.generatedAt,
            stats: certificate.stats
        });
        return expectedHash === certificate.verificationHash;
    }
}
