import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useStepInstall } from "../viewmodels/useStepInstall";
import { loadProjects } from "../viewmodels/useProjects";
import type { WizardConfig } from "../models";

const baseConfig: WizardConfig = {
  framework: "express",
  viteTemplate: "react-ts",
  typescript: true,
  tsStrict: true,
  tsTarget: "ES2020",
  packageManager: "npm",
  docker: false,
  docker_tool: "docker",
  database: "none",
  projectName: "test-project",
  projectPath: "/tmp",
  monorepo: false,
  monorepoTool: "turborepo",
  overwrite: false,
};

const mockEnv = {
  node: true,
  node_version: "v20.0.0",
  node_via_nvm: true,
  docker: false,
  nvm_in_shell: true,
  git_name: "Test",
  git_email: "test@test.com",
  yarn: false,
  pnpm: false,
  ssh_key: false,
  ssh_public_key: null,
};

describe("useStepInstall", () => {
  it("estado inicial é idle com logs e progresso vazios", () => {
    const { result } = renderHook(() => useStepInstall());
    expect(result.current.status).toBe("idle");
    expect(result.current.logs).toHaveLength(0);
    expect(result.current.progress).toBe(0);
  });

  it("run vai para 'done' em fluxo feliz", async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "check_environment") return Promise.resolve(mockEnv);
      if (cmd === "create_project") return Promise.resolve(undefined);
      if (cmd === "run_command") return Promise.resolve("added 42 packages");
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(baseConfig); });

    await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 3000 });

    expect(result.current.progress).toBe(100);
    const logTexts = result.current.logs.map((l) => l.text);
    expect(logTexts.some((t) => t.includes("Node.js detectado"))).toBe(true);
    expect(logTexts.some((t) => t.includes("sucesso"))).toBe(true);
  });

  it("listen é chamado antes dos invokes", async () => {
    vi.mocked(invoke).mockResolvedValue(mockEnv);
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "check_environment") return Promise.resolve(mockEnv);
      if (cmd === "create_project") return Promise.resolve(undefined);
      if (cmd === "run_command") return Promise.resolve("");
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(baseConfig); });

    await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 3000 });

    expect(listen).toHaveBeenCalledWith("install-log", expect.any(Function));
  });

  it("instala Node quando não está presente", async () => {
    const envWithoutNode = { ...mockEnv, node: false };
    let callCount = 0;
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "check_environment") {
        callCount++;
        return Promise.resolve(callCount === 1 ? envWithoutNode : mockEnv);
      }
      if (cmd === "create_project") return Promise.resolve(undefined);
      if (cmd === "run_command") return Promise.resolve("");
      if (cmd === "run_installer") return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(baseConfig); });

    await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 3000 });

    const logTexts = result.current.logs.map((l) => l.text);
    expect(logTexts.some((t) => t.includes("instalação via nvm"))).toBe(true);
    expect(logTexts.some((t) => t.includes("Node.js instalado"))).toBe(true);
  });

  it("vai para 'error' quando invoke falha", async () => {
    vi.mocked(invoke).mockRejectedValue(new Error("Falha simulada"));

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(baseConfig); });

    await waitFor(() => expect(result.current.status).toBe("error"), { timeout: 3000 });

    const logTexts = result.current.logs.map((l) => l.text);
    expect(logTexts.some((t) => t.startsWith("✗"))).toBe(true);
  });

  it("salva o projeto no localStorage ao concluir com sucesso", async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "check_environment") return Promise.resolve(mockEnv);
      if (cmd === "create_project") return Promise.resolve(undefined);
      if (cmd === "run_command") return Promise.resolve("");
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(baseConfig); });

    await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 3000 });

    const projects = loadProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("test-project");
    expect(projects[0].framework).toBe("express");
  });

  it("unlisten é chamado após conclusão (sucesso ou erro)", async () => {
    const mockUnlisten = vi.fn();
    vi.mocked(listen).mockResolvedValue(mockUnlisten);
    vi.mocked(invoke).mockRejectedValue(new Error("erro"));

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(baseConfig); });

    await waitFor(() => expect(result.current.status).toBe("error"), { timeout: 3000 });

    expect(mockUnlisten).toHaveBeenCalled();
  });
});
