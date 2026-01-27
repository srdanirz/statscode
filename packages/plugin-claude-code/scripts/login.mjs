#!/usr/bin/env node
/**
 * StatsCode Login Script
 * Authenticates user with GitHub OAuth via local callback server
 */

import http from 'http';
import { exec } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.statscode');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
const API_URL = 'https://api.statscode.dev';
const CALLBACK_PORT = 54321;

/**
 * Open URL in default browser (cross-platform)
 */
function openBrowser(url) {
    const platform = process.platform;
    let cmd;

    if (platform === 'darwin') {
        cmd = `open "${url}"`;
    } else if (platform === 'win32') {
        cmd = `start "" "${url}"`;
    } else {
        cmd = `xdg-open "${url}"`;
    }

    exec(cmd, (err) => {
        if (err) {
            console.log(`\n⚠️  Could not open browser automatically.`);
            console.log(`   Please open this URL manually:\n`);
            console.log(`   ${url}\n`);
        }
    });
}

/**
 * Save config to disk
 */
function saveConfig(config) {
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
    }

    let existing = {};
    if (existsSync(CONFIG_PATH)) {
        try {
            existing = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
        } catch {
            // Ignore parse errors
        }
    }

    writeFileSync(CONFIG_PATH, JSON.stringify({ ...existing, ...config }, null, 2));
}

/**
 * Decode JWT payload
 */
function decodeToken(token) {
    try {
        const payload = token.split('.')[1];
        const decoded = Buffer.from(payload, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

/**
 * Start local callback server
 */
function startCallbackServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);

            if (url.pathname === '/callback') {
                const token = url.searchParams.get('token');
                const error = url.searchParams.get('error');

                if (error) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>StatsCode - Login Failed</title>
                            <style>
                                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                                       display: flex; justify-content: center; align-items: center; 
                                       min-height: 100vh; margin: 0; background: #0d1117; color: #f0f6fc; }
                                .container { text-align: center; padding: 2rem; }
                                h1 { font-size: 2rem; margin-bottom: 1rem; }
                                p { color: #8b949e; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>❌ Login Failed</h1>
                                <p>Error: ${error}</p>
                                <p>You can close this window.</p>
                            </div>
                        </body>
                        </html>
                    `);
                    server.close();
                    reject(new Error(error));
                    return;
                }

                if (token) {
                    const payload = decodeToken(token);
                    const username = payload?.username || 'user';

                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>StatsCode - Login Successful</title>
                            <style>
                                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                                       display: flex; justify-content: center; align-items: center; 
                                       min-height: 100vh; margin: 0; background: #0d1117; color: #f0f6fc; }
                                .container { text-align: center; padding: 2rem; }
                                h1 { font-size: 2rem; margin-bottom: 1rem; }
                                .username { color: #58a6ff; }
                                p { color: #8b949e; margin: 0.5rem 0; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>🎉 Welcome, <span class="username">@${username}</span>!</h1>
                                <p>You're now connected to StatsCode.</p>
                                <p>You can close this window and return to your terminal.</p>
                            </div>
                        </body>
                        </html>
                    `);

                    server.close();
                    resolve({ token, username });
                    return;
                }
            }

            res.writeHead(404);
            res.end('Not found');
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                reject(new Error(`Port ${CALLBACK_PORT} is already in use. Please try again.`));
            } else {
                reject(err);
            }
        });

        server.listen(CALLBACK_PORT, () => {
            console.log(`🔐 Waiting for authentication...`);
        });

        // Timeout after 5 minutes
        setTimeout(() => {
            server.close();
            reject(new Error('Login timeout. Please try again.'));
        }, 5 * 60 * 1000);
    });
}

/**
 * Main login flow
 */
async function login() {
    console.log('');
    console.log('📊 StatsCode Login');
    console.log('═══════════════════════════════════════');
    console.log('');

    // Check if already logged in
    if (existsSync(CONFIG_PATH)) {
        try {
            const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
            if (config.token) {
                const payload = decodeToken(config.token);
                if (payload?.exp && payload.exp * 1000 > Date.now()) {
                    console.log(`✅ Already logged in as @${payload.username}`);
                    console.log(`   Token expires: ${new Date(payload.exp * 1000).toLocaleDateString()}`);
                    console.log('');
                    console.log('   To logout, run: rm ~/.statscode/config.json');
                    console.log('');
                    return;
                }
            }
        } catch {
            // Continue with login
        }
    }

    console.log('Opening browser for GitHub authentication...');
    console.log('');

    // Start callback server first
    const serverPromise = startCallbackServer();

    // Open browser with CLI flag
    const loginUrl = `${API_URL}/api/auth/github?cli=true&port=${CALLBACK_PORT}`;
    openBrowser(loginUrl);

    try {
        const { token, username } = await serverPromise;

        // Save token to config
        saveConfig({ token, username });

        console.log('');
        console.log(`✅ Successfully logged in as @${username}`);
        console.log('');
        console.log('Your stats will now sync automatically after each session.');
        console.log(`View your profile: https://statscode.dev/profile/${username}`);
        console.log('');
    } catch (error) {
        console.log('');
        console.error(`❌ Login failed: ${error.message}`);
        console.log('');
        process.exit(1);
    }
}

login().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
