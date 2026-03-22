import { describe, it, expect } from "vitest";
import { isValidName } from "../viewmodels/useStepProject";

describe("isValidName", () => {
  it("aceita nomes válidos", () => {
    expect(isValidName("meu-projeto")).toBe(true);
    expect(isValidName("app123")).toBe(true);
    expect(isValidName("my_app")).toBe(true);
    expect(isValidName("a.b.c")).toBe(true);
  });

  it("rejeita string vazia", () => {
    expect(isValidName("")).toBe(false);
  });

  it("rejeita nomes que começam com hífen", () => {
    expect(isValidName("-projeto")).toBe(false);
  });

  it("rejeita nomes que começam com ponto", () => {
    expect(isValidName(".projeto")).toBe(false);
  });

  it("rejeita letras maiúsculas", () => {
    expect(isValidName("MeuProjeto")).toBe(false);
  });

  it("rejeita espaços", () => {
    expect(isValidName("meu projeto")).toBe(false);
  });

  it("rejeita path traversal (..)", () => {
    expect(isValidName("meu..projeto")).toBe(false);
    expect(isValidName("../etc/passwd")).toBe(false);
  });

  it("rejeita caracteres especiais", () => {
    expect(isValidName("projeto!")).toBe(false);
    expect(isValidName("projeto@123")).toBe(false);
    expect(isValidName("projeto/sub")).toBe(false);
  });
});
