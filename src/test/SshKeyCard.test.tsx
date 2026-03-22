import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { I18nProvider } from "../i18n";
import StepDetect from "../views/steps/StepDetect";
import { invoke } from "@tauri-apps/api/core";
import type { EnvStatus } from "../models";

function renderWithI18n(ui: React.ReactElement) {
  localStorage.setItem("dev-env-locale", "pt-br");
  return render(<I18nProvider>{ui}</I18nProvider>);
}

const baseEnv: EnvStatus = {
  node: true, node_via_nvm: true, nvm: true,
  docker: false, git: true,
  node_version: "v20.0.0", docker_version: null, git_version: "git version 2.40.0",
  nvm_in_shell: true, git_name: "Dev", git_email: "dev@test.com",
  yarn: false, pnpm: false,
  ssh_key: false, ssh_public_key: null,
};

describe("SSH key card", () => {
  it("mostra botão Gerar quando não há chave e email está preenchido", async () => {
    vi.mocked(invoke).mockResolvedValue(baseEnv);
    renderWithI18n(<StepDetect onNext={vi.fn()} />);
    await screen.findByText("Gerar");
    expect(screen.getByText("Gerar")).toBeInTheDocument();
  });

  it("botão Gerar fica desabilitado sem email do Git", async () => {
    vi.mocked(invoke).mockResolvedValue({ ...baseEnv, git_email: "" });
    renderWithI18n(<StepDetect onNext={vi.fn()} />);
    const btn = await screen.findByText("Gerar");
    expect(btn).toBeDisabled();
  });

  it("chama generate_ssh_key ao clicar em Gerar", async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce(baseEnv)
      .mockResolvedValueOnce("ssh-ed25519 AAAA test@test.com");
    renderWithI18n(<StepDetect onNext={vi.fn()} />);
    fireEvent.click(await screen.findByText("Gerar"));
    await act(async () => {});
    expect(invoke).toHaveBeenCalledWith("generate_ssh_key", expect.objectContaining({
      email: "dev@test.com",
      force: false,
    }));
  });

  it("mostra botão Substituir quando chave já existe", async () => {
    vi.mocked(invoke).mockResolvedValue({
      ...baseEnv,
      ssh_key: true,
      ssh_public_key: "ssh-ed25519 AAAA test@test.com",
    });
    renderWithI18n(<StepDetect onNext={vi.fn()} />);
    expect(await screen.findByText("Substituir")).toBeInTheDocument();
  });

  it("mostra confirmação ao clicar em Substituir e cancela corretamente", async () => {
    vi.mocked(invoke).mockResolvedValue({
      ...baseEnv,
      ssh_key: true,
      ssh_public_key: "ssh-ed25519 AAAA test@test.com",
    });
    renderWithI18n(<StepDetect onNext={vi.fn()} />);
    fireEvent.click(await screen.findByText("Substituir"));
    expect(screen.getByText("Sobrescrever")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancelar"));
    expect(screen.queryByText("Sobrescrever")).not.toBeInTheDocument();
  });

  it("chama generate_ssh_key com force=true ao clicar em Sobrescrever", async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce({ ...baseEnv, ssh_key: true, ssh_public_key: "ssh-ed25519 AAAA" })
      .mockResolvedValueOnce("ssh-ed25519 BBBB new@test.com");
    renderWithI18n(<StepDetect onNext={vi.fn()} />);
    fireEvent.click(await screen.findByText("Substituir"));
    fireEvent.click(screen.getByText("Sobrescrever"));
    await act(async () => {});
    expect(invoke).toHaveBeenCalledWith("generate_ssh_key", expect.objectContaining({
      force: true,
    }));
  });
});
