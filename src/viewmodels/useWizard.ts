import { useState, useEffect } from "react";
import type { WizardConfig, WizardStep } from "../models";
import { loadTemplates, saveTemplate, deleteTemplate } from "./useTemplates";

const STORAGE_KEY = "dev-env-wizard";

const DEFAULT_CONFIG: WizardConfig = {
  framework: "express",
  viteTemplate: "react-ts",
  typescript: true,
  tsStrict: true,
  tsTarget: "ES2020",
  packageManager: "npm",
  docker: false,
  docker_tool: "docker",
  database: "none",
  projectName: "meu-projeto",
  projectPath: "",
  monorepo: false,
  monorepoTool: "turborepo",
  overwrite: false,
};

export interface SavedWizard {
  step: WizardStep;
  config: WizardConfig;
}

export function loadSavedWizard(): SavedWizard | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedWizard) : null;
  } catch {
    return null;
  }
}

function persistWizard(step: WizardStep, config: WizardConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, config }));
}

function clearWizard() {
  localStorage.removeItem(STORAGE_KEY);
}

function hasNonDefaultState(saved: SavedWizard): boolean {
  return saved.step > 0 || saved.config.projectName !== DEFAULT_CONFIG.projectName;
}

export function useWizard(onFinish: () => void, envReady = false) {
  const [savedData] = useState<SavedWizard | null>(loadSavedWizard);
  const hasResume = savedData !== null && hasNonDefaultState(savedData);

  // Skip the Detect step when the environment is already configured and there
  // is no session to resume — the user goes straight to Stack (step 1).
  const initialStep: WizardStep = !hasResume && envReady ? 1 : 0;

  const [step, setStep] = useState<WizardStep>(initialStep);
  const [config, setConfig] = useState<WizardConfig>(DEFAULT_CONFIG);
  const [showResume, setShowResume] = useState(false);

  // Template state
  const [templates, setTemplates] = useState(loadTemplates);
  const [showTemplates, setShowTemplates] = useState(false);

  // Show resume prompt once on mount if there's meaningful saved state
  useEffect(() => {
    if (hasResume) {
      setShowResume(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist on every change
  useEffect(() => {
    persistWizard(step, config);
  }, [step, config]);

  const update = (partial: Partial<WizardConfig>) =>
    setConfig((c) => ({ ...c, ...partial }));

  const next = () => setStep((s) => Math.min(s + 1, 3) as WizardStep);
  const prev = () => setStep((s) => Math.max(s - 1, 0) as WizardStep);

  function resume() {
    if (savedData) {
      setStep(savedData.step);
      setConfig(savedData.config);
    }
    setShowResume(false);
  }

  function restart() {
    setStep(0);
    setConfig(DEFAULT_CONFIG);
    setShowResume(false);
  }

  function finish() {
    clearWizard();
    onFinish();
  }

  function saveAsTemplate(name: string) {
    const tpl = saveTemplate(name, config);
    setTemplates((prev) => [...prev, tpl]);
  }

  function loadFromTemplate(id: string) {
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setConfig(tpl.config);
      setShowTemplates(false);
    }
  }

  function removeTemplate(id: string) {
    deleteTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return {
    step, config, update, next, prev,
    showResume, resume, restart, finish,
    templates, showTemplates, setShowTemplates,
    saveAsTemplate, loadFromTemplate, removeTemplate,
  };
}
