import { ScriptItem } from '../types';

export const DEFAULT_SCRIPTS: ScriptItem[] = [
  {
    id: 'script-pg-backup',
    name: 'PostgreSQL Automated S3 Backup',
    description: 'Dumps database with pg_dump, compresses with gzip, encrypts archive, and uploads to AWS S3 bucket with retention policy.',
    runtime: 'bash',
    executablePath: './scripts/backup_postgres_s3.sh',
    category: 'Database',
    order: 0,
    status: 'idle',
    timeoutMs: 60000,
    workingDir: '/opt/database/backups',
    autoRetry: true,
    maxRetries: 2,
    args: [
      { id: 'arg-db-1', key: 'BUCKET_NAME', defaultValue: 'prod-database-cold-storage', description: 'Target AWS S3 bucket name', required: true },
      { id: 'arg-db-2', key: 'RETENTION_DAYS', defaultValue: '14', description: 'Days to retain before auto-pruning', required: false },
      { id: 'arg-db-3', key: 'COMPRESSION_LEVEL', defaultValue: '9', description: 'Gzip compression factor (1-9)', required: false },
    ],
    envVars: {
      PG_MAX_CONNECTIONS: '15',
      EXPORT_SCHEMA_ONLY: 'false',
    },
    requiredCredentials: ['cred-pg-url', 'cred-aws-prod'],
    content: `#!/usr/bin/env bash
# Automated PostgreSQL Backup Script
set -euo pipefail

echo "==> [INIT] ExecPulse Database Backup Worker v2.4.1"
echo "==> Target Database: \${DATABASE_URL%@*}@***"
echo "==> S3 Bucket: \${BUCKET_NAME}"
echo "==> Retention Policy: \${RETENTION_DAYS} days"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="/tmp/execpulse_db_\${TIMESTAMP}.sql.gz"

echo "==> [1/4] Initiating pg_dump stream with compression level \${COMPRESSION_LEVEL}..."
pg_dump --format=custom --compress=\${COMPRESSION_LEVEL} --verbose "\${DATABASE_URL}" > "\${DUMP_FILE}"
SIZE=$(ls -lh "\${DUMP_FILE}" | awk '{print $5}')
echo "==> Archive created successfully: \${DUMP_FILE} (Size: \${SIZE})"

echo "==> [2/4] Verifying SHA256 checksum integrity..."
sha256sum "\${DUMP_FILE}"

echo "==> [3/4] Uploading to AWS S3 via encrypted transport..."
aws s3 cp "\${DUMP_FILE}" "s3://\${BUCKET_NAME}/daily/\${TIMESTAMP}.sql.gz" --sse AES256

echo "==> [4/4] Pruning snapshots older than \${RETENTION_DAYS} days..."
echo "==> Pruned 2 expired snapshots from remote storage."
rm -f "\${DUMP_FILE}"
echo "==> [SUCCESS] Database backup cycle completed cleanly in 4.8s."
exit 0
`,
  },
  {
    id: 'script-cve-scan',
    name: 'CVE Vulnerability & Secrets Scanner',
    description: 'Executes binary security auditor for dependency CVEs, secret leak detection, container permissions, and OWASP Top 10 SAST audit.',
    runtime: 'binary',
    executablePath: './bin/cve-scanner-x86_64 --strict',
    category: 'Security',
    order: 1,
    status: 'idle',
    timeoutMs: 45000,
    workingDir: '/workspace/security',
    autoRetry: false,
    args: [
      { id: 'arg-sec-1', key: 'SEVERITY_THRESHOLD', defaultValue: 'HIGH,CRITICAL', description: 'Fail on severities matching', required: true },
      { id: 'arg-sec-2', key: 'SCAN_GIT_HISTORY', defaultValue: 'true', description: 'Deep scan git commits for leaked API tokens', required: false },
      { id: 'arg-sec-3', key: 'OUTPUT_FORMAT', defaultValue: 'json_summary', description: 'Report formatting (json_summary, sarif, table)', required: false },
    ],
    envVars: {
      SAST_RULES_DIR: '/etc/cve-scanner/rules.d',
      IGNORE_UNFIXED: 'false',
    },
    requiredCredentials: ['cred-github-token'],
    content: `# Executable CLI Command Spec:
# ./bin/cve-scanner-x86_64
# Flags: --audit --severity=\${SEVERITY_THRESHOLD} --deep-secrets=\${SCAN_GIT_HISTORY}

[EXEC] Loading signature database v2026.09.24 (284,912 known CVEs)...
[EXEC] Scanning node_modules, Python wheels, and native shared objects...
[INFO] Analyzed 1,482 packages across 3 dependency manifests.
[PASS] 0 Critical vulnerabilities detected.
[PASS] 0 Leaked private keys found in git history.
[WARN] 1 Moderate advisory: lodash prototype pollution vulnerability patched in >=4.17.21.
[EXEC] Generating compliance report artifact...
[EXIT] Exit code: 0 (Passed security threshold)`,
  },
  {
    id: 'script-docker-audit',
    name: 'Docker Swarm & Container Cluster Health',
    description: 'Python engine monitoring container CPU/RAM throttle, restart counts, zombie workers, and dangling volume reclamation.',
    runtime: 'python',
    executablePath: 'python3 scripts/cluster_health.py',
    category: 'DevOps',
    order: 2,
    status: 'idle',
    timeoutMs: 30000,
    workingDir: '/var/run/docker',
    autoRetry: true,
    maxRetries: 3,
    args: [
      { id: 'arg-doc-1', key: 'AUTO_PRUNE_DANGLING', defaultValue: 'true', description: 'Prune unused docker layers and volumes', required: false },
      { id: 'arg-doc-2', key: 'MAX_MEMORY_THRESHOLD_PCT', defaultValue: '88', description: 'Alert if container exceeds memory pct', required: true },
    ],
    envVars: {
      DOCKER_HOST: 'unix:///var/run/docker.sock',
      ALERT_WEBHOOK_ENABLED: 'true',
    },
    requiredCredentials: ['cred-docker-pwd'],
    content: `#!/usr/bin/env python3
import sys
import time
import os

print("[PYTHON ENGINE] Connecting to Docker Daemon socket...")
time.sleep(0.3)
print("[OK] Connected. Inspecting 18 active containers across 3 worker nodes.")

containers = [
    {"name": "nginx-ingress-edge", "status": "UP 42d", "mem": "124MB / 1024MB", "cpu": "2.4%"},
    {"name": "api-gateway-v2", "status": "UP 12d", "mem": "380MB / 2048MB", "cpu": "8.1%"},
    {"name": "postgres-replica-01", "status": "UP 24d", "mem": "1.2GB / 8192MB", "cpu": "14.2%"},
    {"name": "redis-session-cluster", "status": "UP 19d", "mem": "410MB / 4096MB", "cpu": "1.8%"},
    {"name": "worker-queue-consumer", "status": "UP 4h", "mem": "290MB / 1024MB", "cpu": "5.3%"},
]

for c in containers:
    print(f" -> Checking {c['name']:<24} [{c['status']}] Mem: {c['mem']:<18} CPU: {c['cpu']}")
    time.sleep(0.15)

if os.environ.get("AUTO_PRUNE_DANGLING") == "true":
    print("[CLEANUP] Reclaiming dangling build caches and orphaned anonymous volumes...")
    time.sleep(0.4)
    print("[RECLAIMED] Freed 3.42 GB of disk space from stale intermediate layers.")

print("[STATUS] All cluster service health checks passed with 100% SLA.")
sys.exit(0)
`,
  },
  {
    id: 'script-nextjs-build',
    name: 'Frontend Asset Optimizer & Edge Sync',
    description: 'Compiles frontend bundle, runs terser minification, generates Brotli/Gzip artifacts, and syncs assets to CloudFront edge distribution.',
    runtime: 'node',
    executablePath: 'node scripts/bundle_edge_sync.js',
    category: 'Build & Deploy',
    order: 3,
    status: 'idle',
    timeoutMs: 90000,
    workingDir: '/workspace/frontend',
    autoRetry: false,
    args: [
      { id: 'arg-build-1', key: 'DEPLOY_ENV', defaultValue: 'production', description: 'Deployment target (staging, production)', required: true },
      { id: 'arg-build-2', key: 'PURGE_CACHE', defaultValue: 'true', description: 'Purge CDN edge cache on deploy', required: false },
    ],
    envVars: {
      NODE_ENV: 'production',
      GENERATE_SOURCEMAP: 'false',
    },
    requiredCredentials: ['cred-aws-prod', 'cred-github-token'],
    content: `// Next.js & Edge Asset Distribution Runner
const fs = require('fs');

console.log('⚡ [BUILD] Starting production compilation in NODE_ENV=production...');
console.log('⚡ [1/3] Parsing modules and executing tree-shaking...');
// Simulating build progress
setTimeout(() => {
  console.log('✔ [2/3] Compiled 2,419 modules in 3.12s. Bundle size: 142 KB (gzip).');
  console.log('✔ [3/3] Uploading 48 static chunks to S3 bucket with immutable cache headers...');
  console.log('🚀 [EDGE] Invalidating CloudFront distribution E298XKA91819...');
  console.log('🎉 [DONE] Edge deployment synchronized across 32 global edge points.');
}, 500);
`,
  },
  {
    id: 'script-certbot-renew',
    name: 'Certbot SSL Certificate Auto-Renew',
    description: 'Checks expiry on wildcard SSL/TLS domains, requests Let\'s Encrypt DNS-01 certificate challenges, tests nginx configs, and executes reload.',
    runtime: 'bash',
    executablePath: './scripts/renew_ssl_certs.sh',
    category: 'Maintenance',
    order: 4,
    status: 'idle',
    timeoutMs: 40000,
    workingDir: '/etc/letsencrypt',
    autoRetry: true,
    maxRetries: 2,
    args: [
      { id: 'arg-ssl-1', key: 'DOMAINS', defaultValue: '*.execpulse.internal, execpulse.internal', description: 'Domain list to renew', required: true },
      { id: 'arg-ssl-2', key: 'DRY_RUN', defaultValue: 'false', description: 'Test renewal without touching live certificates', required: false },
    ],
    envVars: {
      CERTBOT_MODE: 'dns-cloudflare',
      NOTIFY_ON_RENEW: 'true',
    },
    requiredCredentials: ['cred-ssh-bastion'],
    content: `#!/usr/bin/env bash
set -e
echo "==> [SSL] Inspecting local certificate expiration ledger..."
echo "==> Target domains: \${DOMAINS}"
echo "==> Current certificate valid until: 2026-11-20 (57 days remaining)."
echo "==> Performing dry-run renewal test..."
echo "==> Authenticating DNS challenge tokens via Cloudflare API..."
echo "==> Challenge verification succeeded: token 91823901 verified."
echo "==> Testing web server configuration syntax: nginx -t"
echo "nginx: the configuration file /etc/nginx/nginx.conf syntax is ok"
echo "nginx: configuration file /etc/nginx/nginx.conf test is successful"
echo "==> Nginx gracefully reloaded (PID 8820). No downtime detected."
exit 0
`,
  },
  {
    id: 'script-db-migrate',
    name: 'Transactional Database Migration Runner',
    description: 'Verifies database connectivity, checks pending migration files, executes transactional DDL within savepoints, and verifies schema diff.',
    runtime: 'sql',
    executablePath: 'psql $DATABASE_URL -f migrations/20260924_add_indexes.sql',
    category: 'Database',
    order: 5,
    status: 'idle',
    timeoutMs: 40000,
    workingDir: '/workspace/db',
    autoRetry: false,
    args: [
      { id: 'arg-sql-1', key: 'SCHEMA_TARGET', defaultValue: 'public', description: 'Target Postgres schema', required: true },
      { id: 'arg-sql-2', key: 'AUTO_ROLLBACK_ON_ERROR', defaultValue: 'true', description: 'Rollback on any step error', required: false },
    ],
    envVars: {
      STATEMENT_TIMEOUT: '30000',
    },
    requiredCredentials: ['cred-pg-url'],
    content: `-- PostgreSQL Transactional Migration
BEGIN;

-- 1. Create audit table if not exists
CREATE TABLE IF NOT EXISTS script_run_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id VARCHAR(64) NOT NULL,
    executed_by VARCHAR(128) NOT NULL,
    exit_code INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add high performance indexes for query acceleration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_script_run_audits_script_id
ON script_run_audits (script_id, created_at DESC);

-- 3. Verify schema integrity
SELECT count(*) FROM script_run_audits;

COMMIT;
`,
  }
];

export const DEFAULT_PIPELINE = {
  id: 'pipeline-production-release',
  name: 'Standard Production Release Pipeline',
  description: 'Automated 4-stage deployment: Security Audit -> Database Migration -> Asset Build & Edge Sync -> Docker Verification',
  status: 'idle' as const,
  currentStepIndex: -1,
  steps: [
    {
      stepId: 'step-1',
      scriptId: 'script-cve-scan',
      order: 0,
      continueOnError: false,
      status: 'idle' as const,
    },
    {
      stepId: 'step-2',
      scriptId: 'script-db-migrate',
      order: 1,
      continueOnError: false,
      status: 'idle' as const,
    },
    {
      stepId: 'step-3',
      scriptId: 'script-nextjs-build',
      order: 2,
      continueOnError: false,
      status: 'idle' as const,
    },
    {
      stepId: 'step-4',
      scriptId: 'script-docker-audit',
      order: 3,
      continueOnError: true,
      status: 'idle' as const,
    },
  ],
};
