export type ScriptRuntime = 
  | 'bash' 
  | 'python' 
  | 'node' 
  | 'binary' 
  | 'powershell' 
  | 'docker' 
  | 'sql';

export type ScriptStatus = 'idle' | 'running' | 'success' | 'failed' | 'cancelled';

export type LogLevel = 'stdout' | 'stderr' | 'info' | 'warn' | 'error' | 'success' | 'system';

export interface ScriptArg {
  id: string;
  key: string;
  defaultValue: string;
  value?: string;
  description: string;
  required?: boolean;
}

export interface ScriptItem {
  id: string;
  name: string;
  description: string;
  runtime: ScriptRuntime;
  executablePath: string;
  content: string;
  category: 'DevOps' | 'Database' | 'Security' | 'Build & Deploy' | 'Maintenance' | 'Custom';
  args: ScriptArg[];
  envVars: Record<string, string>;
  requiredCredentials: string[]; // List of Credential IDs
  timeoutMs: number;
  workingDir: string;
  autoRetry: boolean;
  maxRetries?: number;
  status: ScriptStatus;
  lastRunTime?: number;
  lastExitCode?: number;
  lastDurationMs?: number;
  scheduleCron?: string;
  pid?: number;
  order: number;
}

export interface PipelineStep {
  stepId: string;
  scriptId: string;
  order: number;
  continueOnError: boolean;
  customArgs?: Record<string, string>;
  status: ScriptStatus;
  exitCode?: number;
  durationMs?: number;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  status: ScriptStatus;
  currentStepIndex: number;
  lastRunTime?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  timestampMs: number;
  scriptId: string;
  scriptName: string;
  level: LogLevel;
  text: string;
  exitCode?: number;
}

export type CredentialCategory = 'api_key' | 'token' | 'ssh_key' | 'database_url' | 'password' | 'secret';

export interface Credential {
  id: string;
  name: string;
  key: string; // e.g. AWS_SECRET_ACCESS_KEY
  category: CredentialCategory;
  value: string;
  description: string;
  environment: 'production' | 'staging' | 'development' | 'global';
  createdAt: string;
  lastAccessed?: string;
  accessCount: number;
}

export interface SystemMetrics {
  activeProcesses: number;
  cpuLoad: number; // percentage 0-100
  memoryUsageMb: number;
  totalRunsToday: number;
  successRate: number; // percentage 0-100
}
