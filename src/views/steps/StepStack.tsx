import type { WizardConfig, Framework, ViteTemplate, MonorepoTool } from "../../models";
import { useI18n } from "../../i18n";

interface Props {
  config: WizardConfig;
  onChange: (partial: Partial<WizardConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

const BACKEND_FRAMEWORKS: { id: Framework; label: string; stars: string; ts: boolean }[] = [
  { id: "express", label: "Express",  stars: "★ 65k", ts: false },
  { id: "fastify", label: "Fastify",  stars: "★ 32k", ts: false },
  { id: "nestjs",  label: "NestJS",   stars: "★ 67k", ts: true  },
];

const FULLSTACK_FRAMEWORKS: { id: Framework; label: string; stars: string; ts: boolean }[] = [
  { id: "next",    label: "Next.js",  stars: "★ 130k", ts: true  },
  { id: "nuxt",    label: "Nuxt",     stars: "★ 55k",  ts: true  },
  { id: "angular", label: "Angular",  stars: "★ 96k",  ts: true  },
  { id: "vite",    label: "Vite",     stars: "★ 70k",  ts: false },
];

const VITE_TEMPLATES: { id: ViteTemplate; label: string; icon: string }[] = [
  { id: "react-ts",   label: "React",   icon: "⚛️" },
  { id: "vue-ts",     label: "Vue 3",   icon: "💚" },
  { id: "svelte-ts",  label: "Svelte",  icon: "🔥" },
  { id: "vanilla-ts", label: "Vanilla", icon: "⚡" },
];

const MONOREPO_IDS: { id: MonorepoTool; icon: string }[] = [
  { id: "turborepo", icon: "⚡" },
  { id: "nx",        icon: "🔷" },
];

const PKG_MANAGERS = ["npm", "yarn", "pnpm"] as const;
const TS_ALWAYS = new Set<Framework>(["nestjs", "angular", "next", "nuxt"]);
const NO_DATABASE = new Set<Framework>(["angular", "nuxt", "vite"]);

function FrameworkCard({ fw, desc, selected, onChange }: Readonly<{
  fw: { id: Framework; label: string; stars: string; ts: boolean };
  desc: string;
  selected: boolean;
  onChange: (id: Framework) => void;
}>) {
  return (
    <button
      type="button"
      className={`card-pick ${selected ? "selected" : ""}`}
      onClick={() => onChange(fw.id)}
    >
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-bold text-[14px]">{fw.label}</span>
        <div className="flex items-center gap-1.5">
          {fw.ts && <span className="text-[10px] font-mono text-brand bg-brand/10 px-1.5 py-0.5 rounded">TS</span>}
          <span className="text-[11px] text-faint">{fw.stars}</span>
        </div>
      </div>
      <p className="text-xs text-muted leading-relaxed">{desc}</p>
    </button>
  );
}

export default function StepStack({ config, onChange, onNext, onBack }: Readonly<Props>) {
  const { t } = useI18n();
  const s = t.stack;
  const tsForced = TS_ALWAYS.has(config.framework);

  function selectFramework(id: Framework) {
    const patch: Partial<WizardConfig> = { framework: id };
    if (TS_ALWAYS.has(id)) patch.typescript = true;
    if (NO_DATABASE.has(id)) patch.database = "none";
    onChange(patch);
  }

  return (
    <div className="max-w-xl mx-auto px-8 py-8">
      <div className="mb-7">
        <h2 className="text-xl font-bold mb-1.5">{s.title}</h2>
        <p className="text-muted">{s.subtitle}</p>
      </div>

      {/* ── Monorepo ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <span className="font-semibold">{s.monorepo}</span>
          <p className="text-xs text-faint mt-0.5">{s.monorepoDesc}</p>
        </div>
        <button
          type="button"
          aria-label={`Monorepo ${config.monorepo ? s.monorepoOn : s.monorepoOff}`}
          className={`toggle ${config.monorepo ? "on" : ""}`}
          onClick={() => onChange({ monorepo: !config.monorepo })}
        >
          <div className="toggle-track" />
        </button>
      </div>

      {config.monorepo && (
        <div className="card flex flex-col gap-3 px-4 py-4 mb-5">
          <span className="text-xs font-medium text-muted">{s.monorepoTool}</span>
          <div className="grid grid-cols-2 gap-2">
            {MONOREPO_IDS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`card-pick text-left py-3 px-4 ${config.monorepoTool === m.id ? "selected" : ""}`}
                onClick={() => onChange({ monorepoTool: m.id })}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{m.icon}</span>
                  <span className="font-semibold text-[13px]">{m.id === "turborepo" ? "Turborepo" : "Nx"}</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">{s.fwDescriptions[m.id]}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-faint">{s.monorepoNote}</p>
        </div>
      )}

      <div className="h-px bg-border my-5" />

      {/* ── Backend ─────────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <span className="label">{s.backendLabel}</span>
        <div className="grid grid-cols-3 gap-2">
          {BACKEND_FRAMEWORKS.map((fw) => (
            <FrameworkCard key={fw.id} fw={fw} desc={s.fwDescriptions[fw.id]} selected={config.framework === fw.id} onChange={selectFramework} />
          ))}
        </div>
      </div>

      {/* ── Frontend / Full-stack ────────────────────────────────────────────── */}
      <div className="mb-5">
        <span className="label">{s.fullstackLabel}</span>
        <div className="grid grid-cols-2 gap-2">
          {FULLSTACK_FRAMEWORKS.map((fw) => (
            <FrameworkCard key={fw.id} fw={fw} desc={s.fwDescriptions[fw.id]} selected={config.framework === fw.id} onChange={selectFramework} />
          ))}
        </div>
      </div>

      {/* ── Template Vite ────────────────────────────────────────────────────── */}
      {config.framework === "vite" && (
        <div className="card flex flex-col gap-3 px-4 py-4 mb-5">
          <span className="text-xs font-medium text-muted">{s.viteTemplate}</span>
          <div className="grid grid-cols-4 gap-2">
            {VITE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className={`card-pick text-center py-3 px-2 ${config.viteTemplate === tpl.id ? "selected" : ""}`}
                onClick={() => onChange({ viteTemplate: tpl.id, typescript: true })}
              >
                <div className="text-lg mb-1">{tpl.icon}</div>
                <div className="text-xs font-medium">{tpl.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="h-px bg-border my-5" />

      {/* ── TypeScript ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <span className="font-semibold">{s.tsTitle}</span>
          <p className="text-xs text-faint mt-0.5">
            {tsForced ? s.tsForced : s.tsOptional}
          </p>
        </div>
        {tsForced ? (
          <span className="badge badge-ok text-[11px]">{s.tsAlways}</span>
        ) : (
          <button
            type="button"
            aria-label={`TypeScript ${config.typescript ? s.strictOn : s.strictOff}`}
            className={`toggle ${config.typescript ? "on" : ""}`}
            onClick={() => onChange({ typescript: !config.typescript })}
          >
            <div className="toggle-track" />
          </button>
        )}
      </div>

      {config.typescript && !tsForced && config.framework !== "vite" && (
        <div className="card flex flex-col gap-4 px-4 py-4 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-[13px]">{s.strictTitle}</span>
              <p className="text-xs text-faint mt-0.5">{s.strictDesc}</p>
            </div>
            <button
              type="button"
              aria-label={`Strict mode ${config.tsStrict ? s.strictOn : s.strictOff}`}
              className={`toggle ${config.tsStrict ? "on" : ""}`}
              onClick={() => onChange({ tsStrict: !config.tsStrict })}
            >
              <div className="toggle-track" />
            </button>
          </div>
          <div>
            <span className="label mb-2">{s.target}</span>
            <div className="flex gap-2">
              {(["ES2020", "ES2022", "ESNext"] as const).map((tgt) => (
                <button
                  key={tgt}
                  className={`btn flex-1 text-sm ${config.tsTarget === tgt ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => onChange({ tsTarget: tgt })}
                >
                  {tgt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="h-px bg-border my-5" />

      {/* ── Package manager ──────────────────────────────────────────────────── */}
      <div className="mb-2">
        <span className="label">{s.pkgManager}</span>
        <div className="flex gap-2">
          {PKG_MANAGERS.map((pm) => (
            <button
              key={pm}
              className={`btn flex-1 ${config.packageManager === pm ? "btn-primary" : "btn-secondary"}`}
              onClick={() => onChange({ packageManager: pm })}
            >
              {pm}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button className="btn btn-ghost" onClick={onBack}>{t.back}</button>
        <button className="btn btn-primary" onClick={onNext}>{t.continue}</button>
      </div>
    </div>
  );
}
