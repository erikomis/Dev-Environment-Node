import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { DockerService, DockerServiceName } from "../models";

const DEFAULT_SERVICES: DockerService[] = [
  { id: "postgres",      enabled: false, port: "5432",  version: "16-alpine" },
  { id: "mysql",         enabled: false, port: "3306",  version: "8-debian" },
  { id: "mongodb",       enabled: false, port: "27017", version: "7" },
  { id: "redis",         enabled: false, port: "6379",  version: "7-alpine" },
  { id: "rabbitmq",      enabled: false, port: "5672",  version: "3" },
  { id: "nginx",         enabled: false, port: "80",    version: "alpine" },
  { id: "elasticsearch", enabled: false, port: "9200",  version: "8.12.0" },
];

export function useDockerCompose() {
  const [services, setServices] = useState<DockerService[]>(DEFAULT_SERVICES);
  const [outputPath, setOutputPath] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleService(id: DockerServiceName) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
    setGenerated(false);
  }

  function updatePort(id: DockerServiceName, port: string) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, port } : s))
    );
  }

  function updateVersion(id: DockerServiceName, version: string) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, version } : s))
    );
  }

  async function generate() {
    if (!outputPath.trim()) {
      setError("Informe o caminho de destino.");
      return;
    }
    const enabled = services.filter((s) => s.enabled);
    if (enabled.length === 0) {
      setError("Selecione pelo menos um serviço.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      await invoke("generate_docker_compose", {
        path: outputPath.trim(),
        services: enabled.map((s) => ({ id: s.id, port: s.port, version: s.version })),
      });
      setGenerated(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  }

  const enabledCount = services.filter((s) => s.enabled).length;

  return {
    services,
    outputPath,
    setOutputPath,
    generating,
    generated,
    error,
    toggleService,
    updatePort,
    updateVersion,
    generate,
    enabledCount,
  };
}
