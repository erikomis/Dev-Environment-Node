import type { Translations } from "./pt-br";
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

export const en: Translations = {
  ...common.en,
  home: home.en,
  wizard: wizard.en,
  detect: detect.en,
  stack: stack.en,
  project: project.en,
  install: install.en,
  dashboard: dashboard.en,
  aliases: aliases.en,
  dockerCompose: dockerCompose.en,
  scripts: scripts.en,
  templates: templates.en,
  postInstall: postInstall.en,
};
