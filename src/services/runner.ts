import { LogEntry, LogLevel, ScriptItem, ScriptStatus } from '../types';
import { VaultService } from './vault';

export type LogListener = (log: LogEntry) => void;
export type ScriptUpdateListener = (scriptId: string, updates: Partial<ScriptItem>) => void;

interface ActiveProcess {
  scriptId: string;
  pid: number;
  abortController: AbortController;
  startTime: number;
}

export class ExecutionEngine {
  private static logListeners: Set<LogListener> = new Set();
  private static scriptUpdateListeners: Set<ScriptUpdateListener> = new Set();
  private static activeProcesses: Map<string, ActiveProcess> = new Map();
  private static allLogs: LogEntry[] = [];
  private static maxLogHistory = 3000;

  public static subscribeLogs(listener: LogListener): () => void {
    this.logListeners.add(listener);
    return () => {
      this.logListeners.delete(listener);
    };
  }

  public static subscribeScriptUpdates(listener: ScriptUpdateListener): () => void {
    this.scriptUpdateListeners.add(listener);
    return () => {
      this.scriptUpdateListeners.delete(listener);
    };
  }

  public static getLogs(scriptId?: string): LogEntry[] {
    if (!scriptId) return [...this.allLogs];
    return this.allLogs.filter(l => l.scriptId === scriptId);
  }

  public static clearLogs(scriptId?: string): void {
    if (!scriptId) {
      this.allLogs = [];
    } else {
      this.allLogs = this.allLogs.filter(l => l.scriptId !== scriptId);
    }
  }

  public static isScriptRunning(scriptId: string): boolean {
    return this.activeProcesses.has(scriptId);
  }

  public static getActiveProcessCount(): number {
    return this.activeProcesses.size;
  }

  public static abort(scriptId: string): void {
    const proc = this.activeProcesses.get(scriptId);
    if (proc) {
      this.appendLog(scriptId, 'Process Runner', 'warn', `[SIGINT] Termination signal sent to PID ${proc.pid}...`);
      proc.abortController.abort();
      this.activeProcesses.delete(scriptId);
      this.notifyScriptUpdate(scriptId, {
        status: 'cancelled',
        lastExitCode: 130,
        lastDurationMs: Date.now() - proc.startTime,
      });
      this.appendLog(scriptId, 'Process Runner', 'error', `[ABORTED] Process terminated by user with exit code 130.`);
    }
  }

  public static abortAll(): void {
    for (const [scriptId] of this.activeProcesses) {
      this.abort(scriptId);
    }
  }

  private static appendLog(
    scriptId: string,
    scriptName: string,
    level: LogLevel,
    rawText: string,
    exitCode?: number
  ): void {
    const sanitized = VaultService.sanitizeLogs(rawText);
    const now = new Date();
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toTimeString().split(' ')[0] + '.' + now.getMilliseconds().toString().padStart(3, '0'),
      timestampMs: now.getTime(),
      scriptId,
      scriptName,
      level,
      text: sanitized,
      exitCode,
    };

    this.allLogs.push(entry);
    if (this.allLogs.length > this.maxLogHistory) {
      this.allLogs.shift();
    }

    // Broadcast to UI listeners
    for (const listener of this.logListeners) {
      try {
        listener(entry);
      } catch (err) {
        console.error('Error dispatching log listener:', err);
      }
    }
  }

  private static notifyScriptUpdate(scriptId: string, updates: Partial<ScriptItem>): void {
    for (const listener of this.scriptUpdateListeners) {
      try {
        listener(scriptId, updates);
      } catch (err) {
        console.error('Error dispatching script update listener:', err);
      }
    }
  }

  /**
   * Execute an individual script with real-time log streaming and secret injection
   */
  public static async executeScript(
    script: ScriptItem,
    customArgs?: Record<string, string>,
    options?: { dryRun?: boolean; forceFail?: boolean }
  ): Promise<{ success: boolean; exitCode: number; durationMs: number }> {
    if (this.isScriptRunning(script.id)) {
      this.appendLog(script.id, script.name, 'warn', `[SKIPPED] Script "${script.name}" is already executing.`);
      return { success: false, exitCode: 1, durationMs: 0 };
    }

    const pid = Math.floor(1000 + Math.random() * 90000);
    const abortController = new AbortController();
    const startTime = Date.now();

    this.activeProcesses.set(script.id, {
      scriptId: script.id,
      pid,
      abortController,
      startTime,
    });

    this.notifyScriptUpdate(script.id, {
      status: 'running',
      pid,
      lastRunTime: startTime,
    });

    // Record credential access in the vault
    if (script.requiredCredentials && script.requiredCredentials.length > 0) {
      VaultService.recordAccess(script.requiredCredentials);
    }

    const mergedArgs: Record<string, string> = {};
    script.args.forEach(a => {
      mergedArgs[a.key] = customArgs?.[a.key] ?? a.value ?? a.defaultValue;
    });

    // Log initialization banner
    this.appendLog(
      script.id,
      script.name,
      'system',
      `⚡ [SPAWN] Initialized PID ${pid} | Runtime: ${script.runtime.toUpperCase()} | Timeout: ${script.timeoutMs / 1000}s`
    );
    this.appendLog(
      script.id,
      script.name,
      'info',
      `$ cd ${script.workingDir} && ${script.executablePath} ${Object.entries(mergedArgs).map(([k, v]) => `--${k}=${v}`).join(' ')}`
    );

    if (script.requiredCredentials.length > 0) {
      this.appendLog(
        script.id,
        script.name,
        'info',
        `🔒 [VAULT] Injected ${script.requiredCredentials.length} encrypted credentials into runtime environment.`
      );
    }

    if (options?.dryRun) {
      this.appendLog(script.id, script.name, 'warn', `🧪 [DRY RUN] Executing in simulation test mode without state mutations.`);
    }

    const checkAborted = (): boolean => {
      if (abortController.signal.aborted) {
        return true;
      }
      return false;
    };

    // Realistic streaming generation tailored to script
    try {
      const lines = this.generateScriptExecutionLines(script, mergedArgs, options);

      for (let i = 0; i < lines.length; i++) {
        if (checkAborted()) {
          return { success: false, exitCode: 130, durationMs: Date.now() - startTime };
        }

        const line = lines[i];
        const delay = Math.max(120, Math.floor(Math.random() * 320) + (line.heavy ? 400 : 0));
        await new Promise(resolve => setTimeout(resolve, delay));

        if (checkAborted()) {
          return { success: false, exitCode: 130, durationMs: Date.now() - startTime };
        }

        this.appendLog(script.id, script.name, line.level, line.text);
      }

      const durationMs = Date.now() - startTime;
      const isFailure = options?.forceFail === true;
      const exitCode = isFailure ? 1 : 0;

      if (isFailure) {
        this.appendLog(script.id, script.name, 'error', `❌ [ERROR] Script terminated with non-zero exit code: ${exitCode}`);
        this.notifyScriptUpdate(script.id, {
          status: 'failed',
          lastExitCode: exitCode,
          lastDurationMs: durationMs,
          pid: undefined,
        });
      } else {
        this.appendLog(
          script.id,
          script.name,
          'success',
          `✔ [DONE] Process ${pid} completed successfully in ${(durationMs / 1000).toFixed(2)}s (exit code 0)`
        );
        this.notifyScriptUpdate(script.id, {
          status: 'success',
          lastExitCode: 0,
          lastDurationMs: durationMs,
          pid: undefined,
        });
      }

      this.activeProcesses.delete(script.id);
      return { success: !isFailure, exitCode, durationMs };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      this.appendLog(script.id, script.name, 'error', `💥 [CRASH] Unhandled runtime error: ${String(err)}`);
      this.notifyScriptUpdate(script.id, {
        status: 'failed',
        lastExitCode: 1,
        lastDurationMs: durationMs,
        pid: undefined,
      });
      this.activeProcesses.delete(script.id);
      return { success: false, exitCode: 1, durationMs };
    }
  }

  private static generateScriptExecutionLines(
    script: ScriptItem,
    args: Record<string, string>,
    options?: { dryRun?: boolean; forceFail?: boolean }
  ): Array<{ text: string; level: LogLevel; heavy?: boolean }> {
    const list: Array<{ text: string; level: LogLevel; heavy?: boolean }> = [];

    if (script.id === 'script-pg-backup') {
      list.push(
        { text: `[1/5] Validating connection to cluster at port 5432...`, level: 'stdout' },
        { text: `[OK] TLSv1.3 handshake established. Server Postgres v16.4.`, level: 'info' },
        { text: `[2/5] Spawning pg_dump worker (Target schema: ${args.EXPORT_SCHEMA_ONLY === 'true' ? 'schema-only' : 'full database'})...`, level: 'stdout', heavy: true },
        { text: `pg_dump: saving database definition...`, level: 'stdout' },
        { text: `pg_dump: dumping contents of table "users" (28,490 rows)...`, level: 'stdout' },
        { text: `pg_dump: dumping contents of table "transactions" (194,320 rows)...`, level: 'stdout' },
        { text: `[3/5] Gzip stream compression factor ${args.COMPRESSION_LEVEL || '9'} completed. Raw: 412 MB -> Compressed: 48.2 MB.`, level: 'stdout' },
        { text: `[4/5] Checksum computed: sha256:7b92f02ca8b47ef1a29302bf1c9...`, level: 'info' },
        { text: `[5/5] Streaming chunked payload to s3://${args.BUCKET_NAME || 'prod-backup'}/daily/...`, level: 'stdout', heavy: true },
        { text: `Upload status: 100% [48.2MB / 48.2MB] ETA: 0s (Avg throughput 42 MB/s).`, level: 'success' },
        { text: `Audit retention: Retained last ${args.RETENTION_DAYS || '14'} days. 0 stale snapshots required deletion.`, level: 'stdout' }
      );
    } else if (script.id === 'script-cve-scan') {
      list.push(
        { text: `[1/4] Loading CVE vulnerability heuristics & NIST NVD database...`, level: 'stdout' },
        { text: `[INFO] Parsing AST for 183 source files and 1,482 third-party dependencies...`, level: 'info' },
        { text: `[2/4] Scanning for hardcoded credentials, JWTs, and private keys...`, level: 'stdout', heavy: true },
        { text: `✔ No unencrypted private keys or high-entropy secrets found in source tree.`, level: 'success' },
        { text: `[3/4] Checking dependency lockfiles against OWASP advisory index...`, level: 'stdout' },
        { text: `[AUDIT] Threshold set to: ${args.SEVERITY_THRESHOLD || 'HIGH,CRITICAL'}`, level: 'info' },
        { text: `[4/4] Generating SAST compliance artifact (/tmp/security-report.json)...`, level: 'stdout' },
        { text: `Audit verdict: PASSED (0 Critical, 0 High, 1 Low advisory ignored).`, level: 'success' }
      );
    } else if (script.id === 'script-docker-audit') {
      list.push(
        { text: `[PYTHON] Querying Docker API socket (/var/run/docker.sock)...`, level: 'stdout' },
        { text: `Found 5 running microservices across 3 host worker nodes.`, level: 'info' },
        { text: `Checking container "nginx-ingress-edge": CPU 1.8%, Memory 124MB (Limit: 1024MB) -> HEALTHY`, level: 'stdout' },
        { text: `Checking container "api-gateway-v2": CPU 4.2%, Memory 380MB (Limit: 2048MB) -> HEALTHY`, level: 'stdout' },
        { text: `Checking container "postgres-replica-01": CPU 12.1%, Memory 1.2GB (Limit: 8192MB) -> HEALTHY`, level: 'stdout', heavy: true },
        { text: `Checking container "redis-cache-cluster": CPU 0.9%, Memory 410MB (Limit: 4096MB) -> HEALTHY`, level: 'stdout' },
        { text: `Pruning dangling anonymous volumes & build caches: ${args.AUTO_PRUNE_DANGLING || 'true'}`, level: 'info' },
        { text: `Cleaned 3 dangling volumes. Reclaimed 1.84 GB system disk space.`, level: 'success' }
      );
    } else if (script.id === 'script-nextjs-build') {
      list.push(
        { text: `> npm run build -- --env=${args.DEPLOY_ENV || 'production'}`, level: 'stdout' },
        { text: `▲ Next.js v15.2.0 production build`, level: 'info' },
        { text: `- Environments: NODE_ENV=production, PURGE_CACHE=${args.PURGE_CACHE || 'true'}`, level: 'stdout' },
        { text: `✔ Compiled client & server bundles in 2.84s`, level: 'stdout', heavy: true },
        { text: `✔ Generated 38 static SSG routes (100% pre-rendered)`, level: 'stdout' },
        { text: `✔ Asset bundle analysis: First load JS shared by all: 78.4 kB`, level: 'info' },
        { text: `Uploading static assets to CloudFront CDN origin edge...`, level: 'stdout', heavy: true },
        { text: `Sync complete: 48 assets uploaded. Edge cache invalidation dispatched.`, level: 'success' }
      );
    } else if (script.id === 'script-db-migrate') {
      list.push(
        { text: `Connecting to database schema "${args.SCHEMA_TARGET || 'public'}"...`, level: 'stdout' },
        { text: `Acquiring transactional advisory lock (ID 8849102)... OK`, level: 'info' },
        { text: `Checking migration ledger: 28 migrations applied, 1 pending.`, level: 'stdout' },
        { text: `Executing migration 20260924_add_indexes.sql within TRANSACTION...`, level: 'stdout', heavy: true },
        { text: `CREATE TABLE IF NOT EXISTS script_run_audits -> OK`, level: 'stdout' },
        { text: `CREATE INDEX CONCURRENTLY idx_script_run_audits_script_id -> OK`, level: 'stdout' },
        { text: `Committing transaction... DONE. Schema is now up-to-date.`, level: 'success' }
      );
    } else if (script.id === 'script-certbot-renew') {
      list.push(
        { text: `Inspecting SSL certificate expiry for: ${args.DOMAINS || '*.execpulse.internal'}`, level: 'stdout' },
        { text: `Current certificate expires in 57 days. Dry run: ${args.DRY_RUN || 'false'}`, level: 'info' },
        { text: `Simulating ACME DNS-01 challenge verification via Cloudflare API...`, level: 'stdout', heavy: true },
        { text: `DNS challenge TXT records verified on authoritative nameservers.`, level: 'stdout' },
        { text: `Executing nginx -t syntax verification... Syntax OK.`, level: 'stdout' },
        { text: `Reloading nginx systemd service... Reloaded without dropped connections.`, level: 'success' }
      );
    } else {
      // Custom user-created script
      const scriptLines = script.content.split('\n').filter(l => l.trim().length > 0);
      list.push(
        { text: `[EXEC] Starting ${script.runtime} execution for "${script.name}"...`, level: 'stdout' },
        { text: `Working directory: ${script.workingDir}`, level: 'info' }
      );
      
      scriptLines.slice(0, 10).forEach(l => {
        if (l.startsWith('#') || l.startsWith('//')) {
          list.push({ text: l, level: 'info' });
        } else if (l.toLowerCase().includes('error') || l.toLowerCase().includes('fail')) {
          list.push({ text: `> ${l}`, level: 'warn' });
        } else {
          list.push({ text: `> ${l}`, level: 'stdout' });
        }
      });

      list.push(
        { text: `[EXEC] Running subroutines and outputting telemetry streams...`, level: 'stdout', heavy: true },
        { text: `All script commands executed with return code 0.`, level: 'success' }
      );
    }

    if (options?.forceFail) {
      list.push({
        text: `FATAL: Command returned unhandled exit code 1. Process aborted.`,
        level: 'error',
      });
    }

    return list;
  }
}
