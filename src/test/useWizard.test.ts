import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWizard, loadSavedWizard } from "../viewmodels/useWizard";

describe("loadSavedWizard", () => {
  it("retorna null quando localStorage está vazio", () => {
    expect(loadSavedWizard()).toBeNull();
  });

  it("retorna dados salvos quando existem", () => {
    localStorage.setItem(
      "dev-env-wizard",
      JSON.stringify({ step: 2, config: { projectName: "meu-app" } }),
    );
    const saved = loadSavedWizard();
    expect(saved?.step).toBe(2);
    expect(saved?.config.projectName).toBe("meu-app");
  });

  it("retorna null se o JSON for inválido", () => {
    localStorage.setItem("dev-env-wizard", "invalid json{");
    expect(loadSavedWizard()).toBeNull();
  });
});

describe("useWizard", () => {
  const onFinish = vi.fn();

  it("começa no step 0 com config padrão", () => {
    const { result } = renderHook(() => useWizard(onFinish));
    expect(result.current.step).toBe(0);
    expect(result.current.config.framework).toBe("express");
    expect(result.current.showResume).toBe(false);
  });

  it("avança e volta de step", () => {
    const { result } = renderHook(() => useWizard(onFinish));
    act(() => result.current.next());
    expect(result.current.step).toBe(1);
    act(() => result.current.prev());
    expect(result.current.step).toBe(0);
  });

  it("não vai abaixo do step 0 ou acima do step 3", () => {
    const { result } = renderHook(() => useWizard(onFinish));
    act(() => result.current.prev());
    expect(result.current.step).toBe(0);
    act(() => { result.current.next(); result.current.next(); result.current.next(); result.current.next(); });
    expect(result.current.step).toBe(3);
  });

  it("update mescla campos parciais na config", () => {
    const { result } = renderHook(() => useWizard(onFinish));
    act(() => result.current.update({ projectName: "novo-app", typescript: false }));
    expect(result.current.config.projectName).toBe("novo-app");
    expect(result.current.config.typescript).toBe(false);
    expect(result.current.config.framework).toBe("express");
  });

  it("persiste no localStorage ao mudar step", () => {
    const { result } = renderHook(() => useWizard(onFinish));
    act(() => result.current.next());
    const saved = loadSavedWizard();
    expect(saved?.step).toBe(1);
  });

  it("exibe prompt de resume se houver sessão salva não-padrão", () => {
    localStorage.setItem(
      "dev-env-wizard",
      JSON.stringify({ step: 1, config: { projectName: "outro-projeto" } }),
    );
    const { result } = renderHook(() => useWizard(onFinish));
    expect(result.current.showResume).toBe(true);
  });

  it("resume restaura step e config salvos", () => {
    localStorage.setItem(
      "dev-env-wizard",
      JSON.stringify({ step: 2, config: { projectName: "saved-app", framework: "nestjs" } }),
    );
    const { result } = renderHook(() => useWizard(onFinish));
    act(() => result.current.resume());
    expect(result.current.step).toBe(2);
    expect(result.current.config.projectName).toBe("saved-app");
    expect(result.current.showResume).toBe(false);
  });

  it("restart limpa o estado e fecha o prompt", () => {
    localStorage.setItem(
      "dev-env-wizard",
      JSON.stringify({ step: 2, config: { projectName: "saved-app" } }),
    );
    const { result } = renderHook(() => useWizard(onFinish));
    act(() => result.current.restart());
    expect(result.current.step).toBe(0);
    expect(result.current.config.projectName).toBe("meu-projeto");
    expect(result.current.showResume).toBe(false);
  });

  it("finish chama onFinish e limpa o localStorage", () => {
    const { result } = renderHook(() => useWizard(onFinish));
    act(() => result.current.finish());
    expect(onFinish).toHaveBeenCalledOnce();
    expect(localStorage.getItem("dev-env-wizard")).toBeNull();
  });
});
