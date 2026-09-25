import React, { useState } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Trash2, 
  Lock, 
  Unlock, 
  Database, 
  Key, 
  FileKey, 
  Terminal, 
  AlertCircle,
  ExternalLink,
  Code2,
  Info
} from 'lucide-react';
import { Credential, CredentialCategory, ScriptItem } from '../types';
import { VaultService } from '../services/vault';

interface VaultViewProps {
  credentials: Credential[];
  scripts: ScriptItem[];
  onRefreshCredentials: () => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  credentials,
  scripts,
  onRefreshCredentials,
}) => {
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(VaultService.isVaultUnlocked());

  // Form states for new credential
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [category, setCategory] = useState<CredentialCategory>('api_key');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development' | 'global'>('production');

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to permanently remove this encrypted credential?')) {
      await VaultService.deleteCredential(id);
      onRefreshCredentials();
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !key || !value) return;

    await VaultService.addCredential({
      name,
      key: key.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      category,
      value,
      description,
      environment,
    });

    onRefreshCredentials();
    setShowAddModal(false);
    setName('');
    setKey('');
    setValue('');
    setDescription('');
  };

  const getCategoryIcon = (cat: CredentialCategory) => {
    switch (cat) {
      case 'database_url':
        return <Database className="w-4 h-4 text-sky-400" />;
      case 'ssh_key':
        return <FileKey className="w-4 h-4 text-amber-400" />;
      case 'token':
        return <ShieldCheck className="w-4 h-4 text-purple-400" />;
      case 'api_key':
        return <Key className="w-4 h-4 text-emerald-400" />;
      default:
        return <KeyRound className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getEnvBadge = (env: string) => {
    switch (env) {
      case 'production':
        return 'bg-rose-950/60 text-rose-300 border-rose-500/30';
      case 'staging':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/30';
      case 'development':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-sky-950/60 text-sky-300 border-sky-500/30';
    }
  };

  return (
    <div className="p-4 lg:p-6 min-h-[calc(100vh-100px)] space-y-6">
      {/* Vault Security Status Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Encrypted Credential Vault</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                AES-GCM-256
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
              Secrets are stored encrypted with PBKDF2 key derivation and 100,000 iterations. Automatically injected into executable environments with instant log sanitization to prevent accidental leaks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Store New Secret</span>
          </button>
        </div>
      </div>

      {/* Secret Injection Guide Card */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-neutral-300">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white">How Injection Works:</span>
          <span className="text-neutral-400">
            Reference any vault key in your scripts as <code className="bg-neutral-900 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-[11px]">$DATABASE_URL</code> or <code className="bg-neutral-900 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-[11px]">{"{{AWS_SECRET_ACCESS_KEY}}"}</code>.
          </span>
        </div>
        <div className="text-[11px] text-neutral-500 font-mono">
          Logs are automatically scrubbed for secret values before terminal render.
        </div>
      </div>

      {/* Credentials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {credentials.map((cred) => {
          const isRevealed = revealedIds.has(cred.id);
          const boundScripts = scripts.filter(s => s.requiredCredentials?.includes(cred.id) || s.requiredCredentials?.includes(cred.key));

          return (
            <div
              key={cred.id}
              className="bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4.5 flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Header: Icon, Name, Category & Environment */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                      {getCategoryIcon(cred.category)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-100 group-hover:text-purple-300 transition-colors">
                        {cred.name}
                      </h4>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {cred.description}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${getEnvBadge(cred.environment)}`}>
                    {cred.environment}
                  </span>
                </div>

                {/* Key Identifier */}
                <div className="mt-3 mb-2 flex items-center justify-between text-xs">
                  <span className="font-mono text-emerald-400 font-semibold text-[11px]">
                    {cred.key}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    Accessed {cred.accessCount || 0} times
                  </span>
                </div>

                {/* Secret Value Display (Masked / Revealed) */}
                <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-neutral-300 truncate flex-1 select-all">
                    {isRevealed ? cred.value : '••••••••••••••••••••••••••••••••'}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleReveal(cred.id)}
                      className="p-1 rounded text-neutral-500 hover:text-neutral-200 transition-colors"
                      title={isRevealed ? 'Hide secret' : 'Reveal secret'}
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleCopy(cred.id, cred.value)}
                      className="p-1 rounded text-neutral-500 hover:text-emerald-400 transition-colors"
                      title="Copy secret value"
                    >
                      {copiedId === cred.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer: Bound Scripts & Delete */}
              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-400 font-mono">
                  {boundScripts.length > 0 ? (
                    <span className="text-purple-300">Bound to {boundScripts.length} script(s)</span>
                  ) : (
                    <span className="text-neutral-600">No scripts bound</span>
                  )}
                </span>

                <button
                  onClick={() => handleDelete(cred.id)}
                  className="text-neutral-500 hover:text-rose-400 transition-colors p-1"
                  title="Delete secret"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Credential Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Store Encrypted Credential</h3>
                <p className="text-xs text-neutral-400">Add an API token, private key, or connection string</p>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Secret Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AWS Production S3 Deploy Key"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Environment Variable Key</label>
                  <input
                    type="text"
                    required
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                    placeholder="e.g. AWS_SECRET_ACCESS_KEY"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 font-mono placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CredentialCategory)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="api_key">API Key</option>
                    <option value="token">OAuth / Access Token</option>
                    <option value="database_url">Database URI</option>
                    <option value="ssh_key">SSH Private Key</option>
                    <option value="password">Password / Token</option>
                    <option value="secret">Generic Secret</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Secret Value (Encrypted at Rest)</label>
                <textarea
                  required
                  rows={3}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Paste private key, token, or connection URI..."
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 font-mono placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Environment Scope</label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                    <option value="global">Global / All</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Usage notes or service context"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md transition-colors"
                >
                  Encrypt & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
