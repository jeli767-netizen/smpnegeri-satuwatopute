import { Credential } from '../types';

const VAULT_STORAGE_KEY = 'execpulse_vault_encrypted';
const VAULT_SALT_KEY = 'execpulse_vault_salt';
const VAULT_STATUS_KEY = 'execpulse_vault_unlocked';

// Default starter credentials (demonstration secrets ready to use)
export const DEFAULT_CREDENTIALS: Credential[] = [
  {
    id: 'cred-aws-prod',
    name: 'AWS Production Deployment Secret',
    key: 'AWS_SECRET_ACCESS_KEY',
    category: 'api_key',
    value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    description: 'IAM user for S3 asset sync and EC2 auto-scaling trigger',
    environment: 'production',
    createdAt: '2026-09-01T10:00:00.000Z',
    lastAccessed: '2026-09-24T18:20:00.000Z',
    accessCount: 14,
  },
  {
    id: 'cred-pg-url',
    name: 'Primary PostgreSQL Database URI',
    key: 'DATABASE_URL',
    category: 'database_url',
    value: 'postgresql://postgres_admin:k8s_P@ssw0rd99!@db-cluster.internal:5432/execpulse_prod?sslmode=require',
    description: 'High-availability read/write database connection cluster',
    environment: 'production',
    createdAt: '2026-09-05T14:30:00.000Z',
    lastAccessed: '2026-09-24T21:10:00.000Z',
    accessCount: 42,
  },
  {
    id: 'cred-github-token',
    name: 'GitHub CI/CD Automation Token',
    key: 'GH_AUTOMATION_TOKEN',
    category: 'token',
    value: 'ghp_7A9zLkP9901MneQxYzVw881023aBcDeFgHiJkLm',
    description: 'Fine-grained PAT with repo and release deployment permissions',
    environment: 'global',
    createdAt: '2026-09-10T09:15:00.000Z',
    lastAccessed: '2026-09-23T11:45:00.000Z',
    accessCount: 29,
  },
  {
    id: 'cred-docker-pwd',
    name: 'Harbor / Docker Hub Registry Pass',
    key: 'DOCKER_REGISTRY_PASSWORD',
    category: 'password',
    value: 'dckr_pat_Zx98QweRtyUiOpAsdfGhJkLzXcVbNmM',
    description: 'Container registry push authentication for worker nodes',
    environment: 'staging',
    createdAt: '2026-09-12T16:00:00.000Z',
    lastAccessed: '2026-09-24T08:00:00.000Z',
    accessCount: 8,
  },
  {
    id: 'cred-ssh-bastion',
    name: 'Bastion Gateway SSH Private Key',
    key: 'BASTION_SSH_KEY',
    category: 'ssh_key',
    value: '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn\nNhAAAAAwEAAQAAAYEAuZ981...[SECURE_RSA_KEY_PAYLOAD]...=\n-----END OPENSSH PRIVATE KEY-----',
    description: 'Ed25519/RSA key pair for remote daemon control and log tunneling',
    environment: 'production',
    createdAt: '2026-09-15T08:00:00.000Z',
    lastAccessed: '2026-09-24T22:00:00.000Z',
    accessCount: 19,
  }
];

// Helper to derive AES-GCM CryptoKey from string passphrase
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Convert bytes to hex and back
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

export class VaultService {
  private static masterPassphrase = 'master-pulse-key-2026';
  private static cachedCredentials: Credential[] | null = null;
  private static isUnlocked = true;

  // Initialize vault with stored or default credentials
  public static async init(): Promise<void> {
    try {
      const stored = localStorage.getItem(VAULT_STORAGE_KEY);
      if (!stored) {
        // First run: save defaults encrypted
        this.cachedCredentials = [...DEFAULT_CREDENTIALS];
        await this.save(this.masterPassphrase);
      } else {
        // Try unlocking with default session key
        try {
          await this.unlock(this.masterPassphrase);
        } catch {
          this.isUnlocked = false;
        }
      }
    } catch (e) {
      console.warn('Vault initialization fallback to in-memory state', e);
      this.cachedCredentials = [...DEFAULT_CREDENTIALS];
    }
  }

  public static isVaultUnlocked(): boolean {
    return this.isUnlocked && this.cachedCredentials !== null;
  }

  public static lock(): void {
    this.isUnlocked = false;
    this.cachedCredentials = null;
  }

  public static async unlock(passphrase: string): Promise<boolean> {
    try {
      const storedData = localStorage.getItem(VAULT_STORAGE_KEY);
      if (!storedData) {
        this.cachedCredentials = [...DEFAULT_CREDENTIALS];
        this.masterPassphrase = passphrase;
        this.isUnlocked = true;
        await this.save(passphrase);
        return true;
      }

      const parsed = JSON.parse(storedData);
      const salt = hexToBuffer(parsed.salt);
      const iv = hexToBuffer(parsed.iv);
      const ciphertext = hexToBuffer(parsed.ciphertext);

      const cryptoKey = await deriveKey(passphrase, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        cryptoKey,
        ciphertext as BufferSource
      );

      const dec = new TextDecoder();
      const jsonStr = dec.decode(decrypted);
      this.cachedCredentials = JSON.parse(jsonStr);
      this.masterPassphrase = passphrase;
      this.isUnlocked = true;
      return true;
    } catch (err) {
      console.error('Failed to unlock vault:', err);
      return false;
    }
  }

  public static async save(passphrase: string = this.masterPassphrase): Promise<void> {
    if (!this.cachedCredentials) return;

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await deriveKey(passphrase, salt);

    const enc = new TextEncoder();
    const encodedData = enc.encode(JSON.stringify(this.cachedCredentials));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encodedData
    );

    const payload = {
      salt: bufferToHex(salt.buffer),
      iv: bufferToHex(iv.buffer),
      ciphertext: bufferToHex(ciphertext),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(payload));
    this.masterPassphrase = passphrase;
    this.isUnlocked = true;
  }

  public static getCredentials(): Credential[] {
    if (!this.isUnlocked || !this.cachedCredentials) {
      return [];
    }
    return [...this.cachedCredentials];
  }

  public static async addCredential(credential: Omit<Credential, 'id' | 'createdAt' | 'accessCount'>): Promise<Credential> {
    if (!this.cachedCredentials) this.cachedCredentials = [];
    const newCred: Credential = {
      ...credential,
      id: `cred-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      accessCount: 0,
    };
    this.cachedCredentials.unshift(newCred);
    await this.save();
    return newCred;
  }

  public static async updateCredential(id: string, updates: Partial<Credential>): Promise<void> {
    if (!this.cachedCredentials) return;
    const index = this.cachedCredentials.findIndex(c => c.id === id);
    if (index !== -1) {
      this.cachedCredentials[index] = { ...this.cachedCredentials[index], ...updates };
      await this.save();
    }
  }

  public static async deleteCredential(id: string): Promise<void> {
    if (!this.cachedCredentials) return;
    this.cachedCredentials = this.cachedCredentials.filter(c => c.id !== id);
    await this.save();
  }

  public static recordAccess(credentialIds: string[]): void {
    if (!this.cachedCredentials) return;
    const now = new Date().toISOString();
    let changed = false;
    for (const cred of this.cachedCredentials) {
      if (credentialIds.includes(cred.id) || credentialIds.includes(cred.key)) {
        cred.lastAccessed = now;
        cred.accessCount = (cred.accessCount || 0) + 1;
        changed = true;
      }
    }
    if (changed) {
      this.save().catch(console.error);
    }
  }

  /**
   * Redacts sensitive secret values from log text to prevent credential leakage in output
   */
  public static sanitizeLogs(text: string): string {
    if (!this.cachedCredentials) return text;
    let sanitized = text;
    for (const cred of this.cachedCredentials) {
      if (cred.value && cred.value.length > 5) {
        // Redact exact value
        sanitized = sanitized.split(cred.value).join(`[REDACTED_${cred.key}]`);
      }
    }
    return sanitized;
  }
}
