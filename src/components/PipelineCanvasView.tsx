import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  GripVertical, 
  Terminal, 
  ShieldCheck, 
  Settings, 
  Clock, 
  Layers, 
  RefreshCw,
  Sliders,
  ChevronRight,
  Sparkles,
  ArrowDown
} from 'lucide-react';
import { Pipeline, PipelineStep, ScriptItem, ScriptStatus } from '../types';

interface PipelineCanvasViewProps {
  pipeline: Pipeline;
  scripts: ScriptItem[];
  onUpdatePipeline: (pipeline: Pipeline) => void;
  onExecutePipeline: () => void;
  onAbortPipeline: () => void;
  onOpenTerminal: () => void;
}

export const PipelineCanvasView: React.FC<PipelineCanvasViewProps> = ({
  pipeline,
  scripts,
  onUpdatePipeline,
  onExecutePipeline,
  onAbortPipeline,
  onOpenTerminal,
}) => {
  const [selectedScriptToAdd, setSelectedScriptToAdd] = useState<string>('');
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);

  const isRunning = pipeline.status === 'running';

  const handleAddStep = () => {
    if (!selectedScriptToAdd) return;
    const newStep: PipelineStep = {
      stepId: `step-${Date.now()}`,
      scriptId: selectedScriptToAdd,
      order: pipeline.steps.length,
      continueOnError: false,
      status: 'idle',
    };

    onUpdatePipeline({
      ...pipeline,
      steps: [...pipeline.steps, newStep],
    });
    setSelectedScriptToAdd('');
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = pipeline.steps.filter((_, i) => i !== index).map((s, idx) => ({ ...s, order: idx }));
    onUpdatePipeline({
      ...pipeline,
      steps: newSteps,
    });
  };

  const handleToggleContinueOnError = (index: number) => {
    const newSteps = [...pipeline.steps];
    newSteps[index] = {
      ...newSteps[index],
      continueOnError: !newSteps[index].continueOnError,
    };
    onUpdatePipeline({
      ...pipeline,
      steps: newSteps,
    });
  };

  // Reorder steps drag & drop
  const handleDragStart = (index: number) => {
    setDraggedStepIndex(index);
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedStepIndex === null || draggedStepIndex === targetIndex) return;

    const newSteps = [...pipeline.steps];
    const [moved] = newSteps.splice(draggedStepIndex, 1);
    newSteps.splice(targetIndex, 0, moved);

    const reindexed = newSteps.map((s, idx) => ({ ...s, order: idx }));
    onUpdatePipeline({
      ...pipeline,
      steps: reindexed,
    });
    setDraggedStepIndex(null);
  };

  const handleResetStatuses = () => {
    const resetSteps = pipeline.steps.map(s => ({
      ...s,
      status: 'idle' as ScriptStatus,
      exitCode: undefined,
      durationMs: undefined,
    }));
    onUpdatePipeline({
      ...pipeline,
      status: 'idle',
      currentStepIndex: -1,
      steps: resetSteps,
    });
  };

  return (
    <div className="p-4 lg:p-6 min-h-[calc(100vh-100px)] flex flex-col gap-6">
      {/* Pipeline Control Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-white tracking-tight">{pipeline.name}</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950 border border-sky-500/30 text-sky-400">
              {pipeline.steps.length} Stages
            </span>
          </div>
          <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
            {pipeline.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetStatuses}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs transition-colors disabled:opacity-50"
            title="Reset execution states"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Pipeline</span>
          </button>

          <button
            onClick={onOpenTerminal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 text-xs transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>View Stream</span>
          </button>

          {isRunning ? (
            <button
              onClick={onAbortPipeline}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md transition-colors"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Abort Pipeline</span>
            </button>
          ) : (
            <button
              onClick={onExecutePipeline}
              disabled={pipeline.steps.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-950 hover:shadow-emerald-900/40 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Execute Pipeline</span>
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Visual Flow Canvas */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-6 dev-grid-pattern relative min-h-[400px]">
        {/* Step List Sequence */}
        {pipeline.steps.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto">
            <Layers className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-neutral-300 mb-1">Pipeline is Empty</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Add executables below to build an automated continuous workflow that runs each step in strict sequence.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pipeline.steps.map((step, index) => {
              const script = scripts.find(s => s.id === step.scriptId);
              const isCurrent = pipeline.currentStepIndex === index && isRunning;
              const isDone = step.status === 'success';
              const isFailed = step.status === 'failed';

              return (
                <div key={step.stepId} className="relative">
                  {/* Step Card */}
                  <div
                    draggable={!isRunning}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-neutral-900 border-sky-500 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/50'
                        : isDone
                        ? 'bg-neutral-900/90 border-emerald-500/40 shadow-sm'
                        : isFailed
                        ? 'bg-neutral-900/90 border-rose-500/40 shadow-sm'
                        : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {/* Left: Drag grip, Stage Number, Script info */}
                    <div className="flex items-center gap-3">
                      <div 
                        className={`text-neutral-600 hover:text-neutral-300 ${isRunning ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing'}`}
                        title="Drag to reorder stage"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Step Number Circle */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                        isCurrent
                          ? 'bg-sky-500 text-white animate-pulse'
                          : isDone
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                          : isFailed
                          ? 'bg-rose-950 text-rose-400 border border-rose-500/50'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {index + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-neutral-100">
                            {script ? script.name : 'Unknown Executable'}
                          </h4>
                          {script && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                              {script.runtime}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 font-mono mt-0.5">
                          {script ? script.executablePath : 'No command'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Step Status, Duration, Error Handling Toggles & Delete */}
                    <div className="flex items-center gap-4">
                      {/* Status indicator */}
                      <div>
                        {isCurrent ? (
                          <span className="flex items-center gap-1.5 text-xs font-mono text-sky-400">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Running...</span>
                          </span>
                        ) : isDone ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Passed ({((step.durationMs || 0) / 1000).toFixed(1)}s)</span>
                          </span>
                        ) : isFailed ? (
                          <span className="flex items-center gap-1 text-xs text-rose-400 font-mono">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Failed (code {step.exitCode || 1})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-500 font-mono">Queued</span>
                        )}
                      </div>

                      {/* Continue on error toggle */}
                      <button
                        onClick={() => handleToggleContinueOnError(index)}
                        disabled={isRunning}
                        className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors ${
                          step.continueOnError
                            ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-300'
                        }`}
                        title="If checked, pipeline continues even if this stage fails"
                      >
                        {step.continueOnError ? 'Ignore Error: ON' : 'Halt on Error'}
                      </button>

                      {/* Remove step */}
                      <button
                        onClick={() => handleRemoveStep(index)}
                        disabled={isRunning}
                        className="p-1 rounded text-neutral-500 hover:text-rose-400 transition-colors disabled:opacity-30"
                        title="Remove step from pipeline"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Flow connector line between steps */}
                  {index < pipeline.steps.length - 1 && (
                    <div className="flex justify-center my-1">
                      <div className="w-0.5 h-4 bg-neutral-800 flex items-center justify-center">
                        <ArrowDown className="w-3 h-3 text-neutral-600" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Step Control Tray */}
        <div className="mt-8 pt-6 border-t border-neutral-800/80 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-neutral-400">Append Executable Stage:</span>
          <select
            value={selectedScriptToAdd}
            onChange={(e) => setSelectedScriptToAdd(e.target.value)}
            disabled={isRunning}
            className="bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500 max-w-xs"
          >
            <option value="">Select executable from library...</option>
            {scripts.map(s => (
              <option key={s.id} value={s.id}>
                [{s.runtime.toUpperCase()}] {s.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleAddStep}
            disabled={!selectedScriptToAdd || isRunning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Pipeline</span>
          </button>
        </div>
      </div>
    </div>
  );
};
