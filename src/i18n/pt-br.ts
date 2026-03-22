import * as common from "./locales/common";
import * as home from "./locales/home";
import * as wizard from "./locales/wizard";
import * as detect from "./locales/detect";
import * as stack from "./locales/stack";
import * as project from "./locales/project";
import * as install from "./locales/install";
import * as dashboard from "./locales/dashboard";
import * as aliases from "./locales/aliases";
import * as dockerCompose from "./locales/dockerCompose";
import * as scripts from "./locales/scripts";
import * as templates from "./locales/templates";
import * as postInstall from "./locales/postInstall";

export const ptBr = {
  ...common.ptBr,
  home: home.ptBr,
  wizard: wizard.ptBr,
  detect: detect.ptBr,
  stack: stack.ptBr,
  project: project.ptBr,
  install: install.ptBr,
  dashboard: dashboard.ptBr,
  aliases: aliases.ptBr,
  dockerCompose: dockerCompose.ptBr,
  scripts: scripts.ptBr,
  templates: templates.ptBr,
  postInstall: postInstall.ptBr,
};

export type Translations = typeof ptBr;
