import type { EnvStatus } from "../../models";
import type { GitState } from "../../viewmodels/useStepDetect";
import { useStepDetect } from "../../viewmodels/useStepDetect";
import { useI18n } from "../../i18n";
import ToolCard from "../../components/ToolCard";
import FormInput from "../../components/FormInput";
import TerminalOutput from "../../components/TerminalOutput";

interface Props {
  onNext: () => void;
}

// ── SSH Key card ───────────────────────────────────────────────────────────────

function SshKeyCard({ env, git, sshGenerating, sshConfirming, setSshConfirming, sshNewKeyPath, generateSshKey }: Readonly<{
  env: EnvStatus;
  git: GitState;
  sshGenerating: boolean;
  sshConfirming: boolean;
  setSshConfirming: (v: boolean) => void;
  sshNewKeyPath: string | null;
  generateSshKey: (email: string, force?: boolean, keyName?: string) => void;
}>) {
  const { t } = useI18n();
  const d = t.detect;

  const action = env.ssh_key ? (
    <button className="btn btn-secondary" style={{ padding: "3px 10px", fontSize: 12 }}
      disabled={sshGenerating} onClick={() => setSshConfirming(true)}>
      {d.sshReplace}
    </button>
  ) : (
    <button className="btn btn-secondary" style={{ padding: "3px 10px", fontSize: 12 }}
      disabled={sshGenerating || !git.email.trim()}
      title={git.email.trim() ? "" : d.gitEmailRequiredTitle}
      onClick={() => generateSshKey(git.email.trim())}>
      {sshGenerating ? d.sshGenerating : d.sshGenerate}
    </button>
  );

  return (
    <ToolCard
      icon="🔑"
      title={d.sshTitle}
      description={env.ssh_key ? d.sshFound : d.sshMissing}
      badgeClass={env.ssh_key ? "badge-ok" : "badge-warn"}
      badgeLabel={env.ssh_key ? d.sshConfigured : t.missing}
      action={action}
    >
      {sshConfirming && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs text-warn mb-3">{d.sshWarnOverwrite}</p>
          <div className="flex gap-2 justify-end">
            <button className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: 12 }}
              onClick={() => setSshConfirming(false)}>{t.cancel}</button>
            <button className="btn btn-secondary" style={{ padding: "3px 10px", fontSize: 12 }}
              disabled={sshGenerating}
              onClick={() => generateSshKey(git.email.trim(), false, "id_ed25519")}>
              {sshGenerating ? d.sshGenerating : d.sshCreateNew}
            </button>
            <button className="btn btn-primary" style={{ padding: "3px 10px", fontSize: 12 }}
              disabled={sshGenerating}
              onClick={() => generateSshKey(git.email.trim(), true)}>
              {sshGenerating ? d.sshGenerating : d.sshOverwrite}
            </button>
          </div>
        </div>
      )}
      {sshNewKeyPath && (
        <div className="mt-3 text-xs text-faint">
          {d.sshNewKeyAt} <span className="font-mono">{sshNewKeyPath}</span>
        </div>
      )}
      {env.ssh_key && env.ssh_public_key && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs text-muted mb-2">{d.sshPublicKeyLabel}</p>
          <div className="relative">
            <pre className="terminal text-[11px] leading-relaxed whitespace-pre-wrap break-all max-h-20 select-text">
              {env.ssh_public_key}
            </pre>
            <button className="btn btn-secondary absolute top-2 right-2" style={{ padding: "2px 8px", fontSize: 11 }}
              onClick={() => navigator.clipboard.writeText(env.ssh_public_key ?? "")}>
              {t.copy}
            </button>
          </div>
        </div>
      )}
    </ToolCard>
  );
}

// ── Git identity card ──────────────────────────────────────────────────────────

function GitIdentityCard({ env, git, setGit, fixing, applyFix }: Readonly<{
  env: EnvStatus;
  git: GitState;
  setGit: React.Dispatch<React.SetStateAction<GitState>>;
  fixing: string | null;
  applyFix: (fix: object, label: string) => void;
}>) {
  const { t } = useI18n();
  const d = t.detect;
  const hasIdentity = Boolean(env.git_name && env.git_email);

  const action = (
    <button className="btn btn-secondary" style={{ padding: "3px 10px", fontSize: 12 }}
      onClick={() => setGit((g) => ({ ...g, editing: !g.editing }))}>
      {git.editing ? d.gitClose : d.gitEdit}
    </button>
  );

  return (
    <ToolCard
      icon="👤"
      title={d.gitTitle}
      description={hasIdentity ? d.gitOk(env.git_name!, env.git_email!) : d.gitMissing}
      badgeClass={hasIdentity ? "badge-ok" : "badge-warn"}
      badgeLabel={hasIdentity ? t.configured : t.incomplete}
      action={action}
    >
      {git.editing && (
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <FormInput id="git-name" label={d.gitName} value={git.name}
            onChange={(v) => setGit((g) => ({ ...g, name: v }))}
            placeholder={d.gitNamePlaceholder} />
          <FormInput id="git-email" label={d.gitEmail} value={git.email}
            onChange={(v) => setGit((g) => ({ ...g, email: v }))}
            placeholder={d.gitEmailPlaceholder} />
          <button className="btn btn-primary" style={{ alignSelf: "flex-end" }}
            disabled={!git.name.trim() || !git.email.trim() || fixing === "git"}
            onClick={() => applyFix({ git_name: git.name.trim(), git_email: git.email.trim() }, "git")}>
            {fixing === "git" ? t.saving : t.save}
          </button>
        </div>
      )}
    </ToolCard>
  );
}

function fixLogType(text: string): "err" | "ok" {
  return text.startsWith("✗") ? "err" : "ok";
}

// ── Small action helpers (keep ShellConfigSection complexity low) ───────────────

function NvmAction({ fixing, nvmInShell, addLabel, onAdd }: Readonly<{
  fixing: string | null; nvmInShell: boolean; addLabel: string; onAdd: () => void;
}>) {
  if (nvmInShell) return null;
  return (
    <button className="btn btn-secondary" style={{ padding: "3px 10px", fontSize: 12 }}
      disabled={fixing === "nvm"} onClick={onAdd}>
      {fixing === "nvm" ? "…" : addLabel}
    </button>
  );
}

function PkgAction({ name, installed, hasNode, fixing, label, onInstall }: Readonly<{
  name: string; installed: boolean; hasNode: boolean;
  fixing: string | null; label: string; onInstall: () => void;
}>) {
  if (installed) return null;
  return (
    <button className="btn btn-secondary" style={{ padding: "3px 10px", fontSize: 12 }}
      disabled={fixing === name || !hasNode} onClick={onInstall}>
      {fixing === name ? "…" : label}
    </button>
  );
}

// ── Shell config section ────────────────────────────────────────────────────────

function ShellConfigSection({ env, git, setGit, fixing, fixLogEntries, applyFix, sshGenerating, sshConfirming, setSshConfirming, sshNewKeyPath, generateSshKey }: Readonly<{
  env: EnvStatus;
  git: GitState;
  setGit: React.Dispatch<React.SetStateAction<GitState>>;
  fixing: string | null;
  fixLogEntries: Array<{ id: number; text: string; type: "err" | "ok" }>;
  applyFix: (fix: object, label: string) => void;
  sshGenerating: boolean;
  sshConfirming: boolean;
  setSshConfirming: (v: boolean) => void;
  sshNewKeyPath: string | null;
  generateSshKey: (email: string, force?: boolean, keyName?: string) => void;
}>) {
  const { t } = useI18n();
  const d = t.detect;

  return (
    <>
      <p className="label mb-2 mt-2">{d.sectionShell}</p>
      <div className="flex flex-col gap-2 mb-6">
        <ToolCard icon="⚙" title={d.nvmTitle}
          description={env.nvm_in_shell ? d.nvmOk : d.nvmMissing}
          badgeClass={env.nvm_in_shell ? "badge-ok" : "badge-warn"}
          badgeLabel={env.nvm_in_shell ? t.configured : t.missing}
          action={<NvmAction fixing={fixing} nvmInShell={env.nvm_in_shell} addLabel={d.nvmAdd}
            onAdd={() => applyFix({ add_nvm_to_shell: true }, "nvm")} />} />

        <GitIdentityCard env={env} git={git} setGit={setGit} fixing={fixing} applyFix={applyFix} />

        <ToolCard icon="Y" title="yarn" description={d.yarnDesc}
          badgeClass={env.yarn ? "badge-ok" : "badge-info"}
          badgeLabel={env.yarn ? t.installed : t.optional}
          action={<PkgAction name="yarn" installed={env.yarn} hasNode={env.node} fixing={fixing}
            label={t.installBtn} onInstall={() => applyFix({ install_yarn: true }, "yarn")} />} />

        <ToolCard icon="pn" title="pnpm" description={d.pnpmDesc}
          badgeClass={env.pnpm ? "badge-ok" : "badge-info"}
          badgeLabel={env.pnpm ? t.installed : t.optional}
          action={<PkgAction name="pnpm" installed={env.pnpm} hasNode={env.node} fixing={fixing}
            label={t.installBtn} onInstall={() => applyFix({ install_pnpm: true }, "pnpm")} />} />

        <SshKeyCard env={env} git={git}
          sshGenerating={sshGenerating} sshConfirming={sshConfirming}
          setSshConfirming={setSshConfirming} sshNewKeyPath={sshNewKeyPath}
          generateSshKey={generateSshKey} />
      </div>

      <TerminalOutput logs={fixLogEntries} className="mb-6" />
    </>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────────

function toolBadgeLabel(loading: boolean, installed: boolean, installedLabel: string, notFoundLabel: string): string {
  if (loading) return "…";
  return installed ? installedLabel : notFoundLabel;
}

export default function StepDetect({ onNext }: Readonly<Props>) {
  const { t } = useI18n();
  const d = t.detect;
  const {
    env, loading, fixing, fixLogs,
    git, setGit, tools, missingRequired,
    detect, applyFix,
    sshGenerating, sshConfirming, setSshConfirming, sshNewKeyPath, generateSshKey,
  } = useStepDetect();

  const fixLogEntries = fixLogs.map((text, i) => ({
    id: i,
    text,
    type: fixLogType(text),
  }));

  return (
    <div className="max-w-xl mx-auto px-8 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1.5">{d.title}</h2>
        <p className="text-muted">{d.subtitle}</p>
      </div>

      <p className="label mb-2">{d.sectionTools}</p>
      <div className="flex flex-col gap-2 mb-6">
        {tools.map((tool) => (
          <ToolCard key={tool.label} icon={tool.icon} title={tool.label}
            description={tool.description}
            badgeClass={tool.installed ? "badge-ok" : "badge-bad"}
            badgeLabel={toolBadgeLabel(loading, tool.installed, t.installed, d.notFound)}>
            {tool.required && !loading && (
              <span className="text-[11px] text-faint">{d.required}</span>
            )}
            {tool.detail && !loading && (
              <div className="mt-1 text-[11px] text-faint font-mono">{tool.detail}</div>
            )}
          </ToolCard>
        ))}
      </div>

      {!loading && missingRequired && (
        <div className="card border-warn bg-warn/5 px-4 py-3 mb-6">
          <p className="text-warn text-[13px]">
            <strong>Node.js</strong> — {d.missingNode}
          </p>
        </div>
      )}

      {!loading && env && (
        <ShellConfigSection
          env={env} git={git} setGit={setGit} fixing={fixing}
          fixLogEntries={fixLogEntries} applyFix={applyFix}
          sshGenerating={sshGenerating} sshConfirming={sshConfirming}
          setSshConfirming={setSshConfirming} sshNewKeyPath={sshNewKeyPath}
          generateSshKey={generateSshKey}
        />
      )}

      <div className="flex justify-between">
        <button className="btn btn-ghost" onClick={detect} disabled={loading || !!fixing}>
          {loading ? t.detecting : d.recheck}
        </button>
        <button className="btn btn-primary" onClick={onNext} disabled={loading}>
          {t.continue}
        </button>
      </div>
    </div>
  );
}
