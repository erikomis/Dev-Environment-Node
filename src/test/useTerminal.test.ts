import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useTerminal, PRESET_ALIASES } from "../viewmodels/useTerminal";
import type { TerminalStatus } from "../models";

const mockStatus: TerminalStatus = {
  current_shell: "/bin/zsh",
  shell_name: "zsh",
  oh_my_zsh: false,
  zsh_autosuggestions: false,
  zsh_syntax_highlighting: false,
  starship: false,
  fzf: false,
  bat: false,
  eza: false,
  zoxide: false,
};

beforeEach(() => {
  vi.mocked(invoke).mockResolvedValue(mockStatus);
});

describe("useTerminal", () => {
  it("detecta o status ao montar", async () => {
    const { result } = renderHook(() => useTerminal());
    await act(async () => {});
    expect(invoke).toHaveBeenCalledWith("check_terminal");
    expect(result.current.status).toEqual(mockStatus);
    expect(result.current.loading).toBe(false);
  });

  it("hasChanges é false no estado inicial", async () => {
    const { result } = renderHook(() => useTerminal());
    await act(async () => {});
    expect(result.current.hasChanges).toBe(false);
  });

  it("hasChanges é true ao ativar um toggle", async () => {
    const { result } = renderHook(() => useTerminal());
    await act(async () => {});
    act(() => { result.current.setInstallOmz(true); });
    expect(result.current.hasChanges).toBe(true);
  });

  it("toggleAlias adiciona e remove aliases corretamente", async () => {
    const { result } = renderHook(() => useTerminal());
    await act(async () => {});

    const id = PRESET_ALIASES[0].id;
    act(() => { result.current.toggleAlias(id); });
    expect(result.current.selectedAliases.has(id)).toBe(true);

    act(() => { result.current.toggleAlias(id); });
    expect(result.current.selectedAliases.has(id)).toBe(false);
  });

  it("apply chama setup_terminal com o payload correto", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(mockStatus); // check_terminal no mount
    vi.mocked(invoke).mockResolvedValueOnce(["✅ Feito"]); // setup_terminal
    vi.mocked(invoke).mockResolvedValueOnce(mockStatus); // check_terminal no detect()

    const { result } = renderHook(() => useTerminal());
    await act(async () => {});

    act(() => { result.current.setInstallFzf(true); });
    await act(async () => { await result.current.apply(); });

    expect(invoke).toHaveBeenCalledWith("setup_terminal", {
      setup: expect.objectContaining({ install_fzf: true }),
    });
  });
});
