import type { ReactNode } from "react";

interface Props {
  icon: string;
  title: string;
  description: string;
  badgeClass: string;
  badgeLabel: string;
  action?: ReactNode;
  children?: ReactNode;
}

/**
 * Card de status de ferramenta — ícone, título, descrição, badge e ação opcional.
 * Usado em StepDetect para exibir status de Node, Docker, Git, nvm, SSH, etc.
 */
export default function ToolCard({ icon, title, description, badgeClass, badgeLabel, action, children }: Readonly<Props>) {
  return (
    <div className="card py-4 px-5">
      <div className="flex items-center gap-4">
        <span className="text-2xl w-8 text-center">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-[13px]">{title}</span>
          <p className="text-xs text-faint mt-0.5">{description}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}
