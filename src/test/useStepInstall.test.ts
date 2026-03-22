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
  nvm: true,
  docker: false,
  orbstack: false,
  docker_version: null,
  git: true,
  git_version: "git version 2.40.0",
  nvm_in_shell: true,
  git_name: "Test",
  git_email: "test@test.com",
  yarn: false,
  pnpm: false,
  ssh_key: false,
  ssh_public_key: null,
};

function mockHappyPath() {
  vi.mocked(invoke).mockImplementation((cmd: string) => {
    if (cmd === "check_environment") return Promise.resolve(mockEnv);
    if (cmd === "create_project")    return Promise.resolve(undefined);
    if (cmd === "run_command")       return Promise.resolve("added 42 packages");
    return Promise.resolve(undefined);
  });
}

describe("useStepInstall", () => {
  it("estado inicial é idle com logs e progresso vazios", () => {
    const { result } = renderHook(() => useStepInstall());
    expect(result.current.status).toBe("idle");
    expect(result.current.logs).toHaveLength(0);
    expect(result.current.progress).toBe(0);
  });

  it("run vai para 'done' em fluxo feliz", async () => {
    mockHappyPath();
    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(baseConfig); });

    await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 3000 });

    expect(result.current.progress).toBe(100);
    const texts = result.current.logs.map((l) => l.text);
    expect(texts.some((t) => t.includes("Node.js detectado"))).toBe(true);
    expect(texts.some((t) => t.includes("sucesso"))).toBe(true);
  });

  it("listen é chamado antes dos invokes", async () => {
    mockHappyPath();
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
      if (cmd === "create_project")  return Promise.resolve(undefined);
      if (cmd === "run_command")     return Promise.resolve("");
      if (cmd === "run_installer")   return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(baseConfig); });

    await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 3000 });

    const texts = result.current.logs.map((l) => l.text);
    expect(texts.some((t) => t.includes("instalação via nvm"))).toBe(true);
    expect(texts.some((t) => t.includes("Node.js instalado"))).toBe(true);
  });

  it("instala Docker quando não está presente e pré-requisitos ok", async () => {
    const configWithDocker: WizardConfig = { ...baseConfig, docker: true, docker_tool: "docker" };
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "check_environment")        return Promise.resolve(mockEnv);
      if (cmd === "check_docker_prerequisites") return Promise.resolve({ can_install: true, reason: null, warnings: [] });
      if (cmd === "install_docker_tool")      return Promise.resolve([]);
      if (cmd === "create_project")           return Promise.resolve(undefined);
      if (cmd === "run_command")              return Promise.resolve("");
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(configWithDocker); });

    await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 3000 });

    expect(invoke).toHaveBeenCalledWith("check_docker_prerequisites", { tool: "docker" });
    expect(invoke).toHaveBeenCalledWith("install_docker_tool", { tool: "docker" });
  });

  it("exibe warnings de pré-requisitos Docker nos logs", async () => {
    const configWithDocker: WizardConfig = { ...baseConfig, docker: true, docker_tool: "orbstack" };
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "check_environment") return Promise.resolve(mockEnv);
      if (cmd === "check_docker_prerequisites") return Promise.resolve({
        can_install: true,
        reason: null,
        warnings: ["Após a instalação, abra o app manualmente."],
      });
      if (cmd === "install_docker_tool") return Promise.resolve([]);
      if (cmd === "create_project")      return Promise.resolve(undefined);
      if (cmd === "run_command")         return Promise.resolve("");
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(configWithDocker); });

    await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 3000 });

    const texts = result.current.logs.map((l) => l.text);
    expect(texts.some((t) => t.includes("Após a instalação, abra o app manualmente."))).toBe(true);
  });

  it("vai para 'error' quando pré-requisitos Docker não são atendidos", async () => {
    const configWithDocker: WizardConfig = { ...baseConfig, docker: true };
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "check_environment") return Promise.resolve(mockEnv);
      if (cmd === "check_docker_prerequisites") return Promise.resolve({
        can_install: false,
        reason: "Homebrew não encontrado.",
        warnings: [],
      });
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(configWithDocker); });

    await waitFor(() => expect(result.current.status).toBe("error"), { timeout: 3000 });

    const texts = result.current.logs.map((l) => l.text);
    expect(texts.some((t) => t.includes("Homebrew não encontrado."))).toBe(true);
  });

  it("vai para 'done' quando install_docker_tool retorna reiniciar_necessario (WSL)", async () => {
    const configWithDocker: WizardConfig = { ...baseConfig, docker: true, docker_tool: "docker" };
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "check_environment") return Promise.resolve(mockEnv);
      if (cmd === "check_docker_prerequisites") return Promise.resolve({ can_install: true, reason: null, warnings: [] });
      if (cmd === "install_docker_tool") return Promise.reject("reiniciar_necessario"); // NOSONAR — Tauri rejeita com string, não Error
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(configWithDocker); });

    // Deve ir para 'done', não 'error', e não chegar em create_project
    await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 3000 });
    expect(invoke).not.toHaveBeenCalledWith("create_project", expect.anything());
  });

  it("pula instalação do Docker se já estiver instalado", async () => {
    const envWithDocker = { ...mockEnv, docker: true };
    const configWithDocker: WizardConfig = { ...baseConfig, docker: true };
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "check_environment") return Promise.resolve(envWithDocker);
      if (cmd === "create_project")    return Promise.resolve(undefined);
      if (cmd === "run_command")       return Promise.resolve("");
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(configWithDocker); });

    await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 3000 });
    expect(invoke).not.toHaveBeenCalledWith("check_docker_prerequisites", expect.anything());
    expect(invoke).not.toHaveBeenCalledWith("install_docker_tool", expect.anything());
  });

  it("pula instalação do Docker se OrbStack já estiver instalado", async () => {
    const envWithOrbStack = { ...mockEnv, orbstack: true };
    const configWithDocker: WizardConfig = { ...baseConfig, docker: true };
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "check_environment") return Promise.resolve(envWithOrbStack);
      if (cmd === "create_project")    return Promise.resolve(undefined);
      if (cmd === "run_command")       return Promise.resolve("");
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(configWithDocker); });

    await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 3000 });
    expect(invoke).not.toHaveBeenCalledWith("install_docker_tool", expect.anything());
  });

  it("vai para 'error' quando invoke falha", async () => {
    vi.mocked(invoke).mockRejectedValue(new Error("Falha simulada"));

    const { result } = renderHook(() => useStepInstall());
    act(() => { result.current.run(baseConfig); });

    await waitFor(() => expect(result.current.status).toBe("error"), { timeout: 3000 });

    const texts = result.current.logs.map((l) => l.text);
    expect(texts.some((t) => t.startsWith("✗"))).toBe(true);
  });

  it("salva o projeto no localStorage ao concluir com sucesso", async () => {
    mockHappyPath();
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
