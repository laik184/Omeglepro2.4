import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/moderation.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS blocked_ips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT UNIQUE NOT NULL,
      reason TEXT,
      report_count INTEGER DEFAULT 1,
      blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reported_ip TEXT NOT NULL,
      reporter_ip TEXT NOT NULL,
      report_reason TEXT,
      reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(reported_ip, reporter_ip)
    );

    CREATE INDEX IF NOT EXISTS idx_reports_reported_ip ON reports(reported_ip);
    CREATE INDEX IF NOT EXISTS idx_reports_reporter_ip ON reports(reporter_ip);

    CREATE TABLE IF NOT EXISTS user_violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      violation_type TEXT NOT NULL,
      violation_reason TEXT,
      severity TEXT,
      violated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_violations_ip ON user_violations(ip_address);
    CREATE INDEX IF NOT EXISTS idx_violations_user ON user_violations(user_id);
  `);

  console.log('Database initialized successfully');
}

function getAllBlockedIPs() {
  const stmt = db.prepare('SELECT ip_address, reason, report_count, blocked_at FROM blocked_ips');
  return stmt.all();
}

function isIPBlocked(ip) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM blocked_ips WHERE ip_address = ?');
  const result = stmt.get(ip);
  return result.count > 0;
}

function blockIP(ip, reason = 'Multiple violations', reportCount = 4) {
  const stmt = db.prepare(`
    INSERT INTO blocked_ips (ip_address, reason, report_count)
    VALUES (?, ?, ?)
    ON CONFLICT(ip_address) 
    DO UPDATE SET 
      report_count = report_count + 1,
      last_updated = CURRENT_TIMESTAMP
  `);
  
  try {
    stmt.run(ip, reason, reportCount);
    console.log(`IP ${ip} blocked in database. Reason: ${reason}`);
    return true;
  } catch (error) {
    console.error('Error blocking IP:', error);
    return false;
  }
}

function addReport(reportedIP, reporterIP, reason) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO reports (reported_ip, reporter_ip, report_reason)
    VALUES (?, ?, ?)
  `);
  
  try {
    const result = stmt.run(reportedIP, reporterIP, reason);
    return result.changes > 0;
  } catch (error) {
    console.error('Error adding report:', error);
    return false;
  }
}

function getReportCount(ip) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM reports WHERE reported_ip = ?');
  const result = stmt.get(ip);
  return result.count;
}

function hasReportedIP(reporterIP, reportedIP) {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM reports 
    WHERE reporter_ip = ? AND reported_ip = ?
  `);
  const result = stmt.get(reporterIP, reportedIP);
  return result.count > 0;
}

function logViolation(userId, ipAddress, violationType, reason, severity) {
  const stmt = db.prepare(`
    INSERT INTO user_violations (user_id, ip_address, violation_type, violation_reason, severity)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  try {
    stmt.run(userId, ipAddress, violationType, reason, severity);
    return true;
  } catch (error) {
    console.error('Error logging violation:', error);
    return false;
  }
}

function getViolationCount(ip, hours = 24) {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM user_violations 
    WHERE ip_address = ? 
    AND violated_at >= datetime('now', '-${hours} hours')
  `);
  const result = stmt.get(ip);
  return result.count;
}

function getIPStats(ip) {
  const blockedStmt = db.prepare('SELECT * FROM blocked_ips WHERE ip_address = ?');
  const reportStmt = db.prepare('SELECT COUNT(*) as count FROM reports WHERE reported_ip = ?');
  const violationStmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM user_violations 
    WHERE ip_address = ? 
    AND violated_at >= datetime('now', '-24 hours')
  `);
  
  const blocked = blockedStmt.get(ip);
  const reports = reportStmt.get(ip);
  const violations = violationStmt.get(ip);
  
  return {
    isBlocked: !!blocked,
    blockInfo: blocked,
    reportCount: reports.count,
    recentViolations: violations.count
  };
}

function cleanOldData(daysToKeep = 30) {
  const reportStmt = db.prepare(`
    DELETE FROM reports 
    WHERE reported_at < datetime('now', '-${daysToKeep} days')
  `);
  
  const violationStmt = db.prepare(`
    DELETE FROM user_violations 
    WHERE violated_at < datetime('now', '-${daysToKeep} days')
  `);
  
  const reportResult = reportStmt.run();
  const violationResult = violationStmt.run();
  
  console.log(`Cleaned ${reportResult.changes} old reports and ${violationResult.changes} old violations`);
}

export default {
  initializeDatabase,
  getAllBlockedIPs,
  isIPBlocked,
  blockIP,
  addReport,
  getReportCount,
  hasReportedIP,
  logViolation,
  getViolationCount,
  getIPStats,
  cleanOldData,
  db
};
