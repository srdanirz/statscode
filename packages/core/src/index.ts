/**
 * StatsCode Core Library
 * 
 * Track, analyze, and certify your AI coding assistant usage
 */

// Types
export type {
    AssistantType,
    InteractionType,
    Session,
    Interaction,
    UserStats,
    AssistantStats,
    Badge,
    BadgeId,
    BadgeCriteria,
    Certificate,
    TrackerEvent,
    StatsCodeConfig
} from './types.js';

// Classes
export { StatsDatabase } from './database.js';
export { Tracker } from './tracker.js';
export { Analyzer } from './analyzer.js';
export { CertificateGenerator } from './certificate.js';

// Convenience factory function
import { Tracker } from './tracker.js';
import { Analyzer } from './analyzer.js';
import { CertificateGenerator } from './certificate.js';
import { StatsCodeConfig, UserStats, Certificate } from './types.js';

/**
 * Main StatsCode class - convenient wrapper for all functionality
 */
export class StatsCode {
    private tracker: Tracker;
    private analyzer: Analyzer;
    private certificateGenerator: CertificateGenerator;

    constructor(config: StatsCodeConfig = {}) {
        this.tracker = new Tracker(config);
        this.analyzer = new Analyzer(this.tracker.getDatabase());
        this.certificateGenerator = new CertificateGenerator(config.userId);
    }

    /** Initialize the database - must be called before using other methods */
    async ready(): Promise<void> {
        await this.tracker.ready();
    }

    /** Get the tracker instance */
    getTracker(): Tracker {
        return this.tracker;
    }

    /** Get the analyzer instance */
    getAnalyzer(): Analyzer {
        return this.analyzer;
    }

    /** Calculate current stats */
    getStats(): UserStats {
        return this.analyzer.calculateStats();
    }

    /** Generate a certificate */
    getCertificate(): Certificate {
        const stats = this.getStats();
        return this.certificateGenerator.generateCertificate(stats);
    }

    /** Generate SVG badge */
    getBadgeSVG(): string {
        const stats = this.getStats();
        return this.certificateGenerator.generateBadgeSVG(stats);
    }

    /** Generate JSON export */
    getJSON(): string {
        const stats = this.getStats();
        return this.certificateGenerator.generateJSON(stats);
    }

    /** Generate HTML profile */
    getHTML(): string {
        const stats = this.getStats();
        return this.certificateGenerator.generateHTML(stats);
    }

    /** Close all connections */
    close(): void {
        this.tracker.close();
    }
}

// Default export
export default StatsCode;
