import { describe, it, expect } from "vitest";
import { mkLog } from "../models";

describe("mkLog", () => {
  const seq = { current: 0 };

  it("incrementa o id a cada chamada", () => {
    const s = { current: 0 };
    const a = mkLog(s, "info");
    const b = mkLog(s, "info");
    expect(b.id).toBe(a.id + 1);
  });

  it("classifica como 'ok' quando começa com ✅", () => {
    const entry = mkLog(seq, "✅ Instalado com sucesso");
    expect(entry.type).toBe("ok");
  });

  it("classifica como 'err' quando começa com ✗", () => {
    const entry = mkLog(seq, "✗ Falha ao instalar");
    expect(entry.type).toBe("err");
  });

  it("classifica como 'info' para qualquer outra mensagem", () => {
    const entry = mkLog(seq, "→ Verificando ambiente…");
    expect(entry.type).toBe("info");
  });

  it("preserva o texto original", () => {
    const text = "→ Criando projeto 'meu-app'…";
    const entry = mkLog(seq, text);
    expect(entry.text).toBe(text);
  });
});
