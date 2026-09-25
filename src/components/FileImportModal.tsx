import React, { useState } from 'react';
import { 
  UploadCloud, 
  X, 
  FileCode, 
  Key, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { ScriptItem, ScriptRuntime } from '../types';
import { VaultService } from '../services/vault';

interface FileImportModalProps {
  onImportScript: (script: Partial<ScriptItem>) => void;
  onRefreshVault: () => void;
  onClose: () => void;
}

export const FileImportModal: React.FC<FileImportModalProps> = ({
  onImportScript,
  onRefreshVault,
  onClose,
}) => {
  const [importedType, setImportedType] = useState<'script' | 'env' | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);

      if (file.name.endsWith('.env') || file.name.includes('.env.')) {
        setImportedType('env');
      } else {
        setImportedType('script');
      }
    };

    reader.readAsText(file);
  };

  const handleProcessImport = async () => {
    if (!fileContent) return;

    if (importedType === 'env') {
      // Parse .env format
      const lines = fileContent.split('\n');
      let count = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim().toUpperCase();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (key && val) {
            await VaultService.addCredential({
              name: `Imported: ${key}`,
              key,
              category: key.includes('KEY') || key.includes('TOKEN') ? 'token' : key.includes('URL') ? 'database_url' : 'secret',
              value: val,
              description: `Imported from ${fileName}`,
              environment: 'global',
            });
            count++;
          }
        }
      }
      onRefreshVault();
      setStatusMessage(`Successfully imported ${count} encrypted credentials into the vault!`);
      setTimeout(() => onClose(), 1200);
    } else {
      // Process script import
      let runtime: ScriptRuntime = 'bash';
      let path = `./${fileName}`;
      if (fileName.endsWith('.py')) {
        runtime = 'python';
        path = `python3 ${fileName}`;
      } else if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
        runtime = 'node';
        path = `node ${fileName}`;
      } else if (fileName.endsWith('.sql')) {
        runtime = 'sql';
        path = `psql $DATABASE_URL -f ${fileName}`;
      } else if (fileName.endsWith('.exe') || fileName.endsWith('.bin')) {
        runtime = 'binary';
        path = `./${fileName}`;
      }

      onImportScript({
        name: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        description: `Imported executable task from ${fileName}`,
        runtime,
        executablePath: path,
        category: 'Custom',
        workingDir: '/workspace',
        timeoutMs: 60000,
        autoRetry: false,
        content: fileContent,
        args: [],
        requiredCredentials: [],
      });
      setStatusMessage(`Script "${fileName}" registered on dashboard!`);
      setTimeout(() => onClose(), 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Import Script or Secrets</h3>
              <p className="text-xs text-neutral-400">Upload .sh, .py, .js, .sql, .exe or .env file</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {statusMessage ? (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-xl flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          ) : (
            <>
              {/* Drop area */}
              <label className="border-2 border-dashed border-neutral-700 hover:border-emerald-500 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-neutral-950/50">
                <UploadCloud className="w-10 h-10 text-neutral-400 mb-2" />
                <span className="font-semibold text-neutral-200">
                  {fileName ? fileName : 'Click to select or drop a file'}
                </span>
                <span className="text-neutral-500 text-[11px] mt-1">
                  .sh, .py, .js, .sql, .exe, .bat, or .env files
                </span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {fileContent && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[11px] text-neutral-300">
                  <div className="text-neutral-500 text-[10px] mb-1">
                    Detected format: {importedType === 'env' ? 'Environment Variables (.env)' : 'Script File'}
                  </div>
                  <pre className="whitespace-pre-wrap">{fileContent.slice(0, 500)}...</pre>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!fileContent}
                  onClick={handleProcessImport}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md disabled:opacity-50 transition-colors"
                >
                  Process & Import
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
