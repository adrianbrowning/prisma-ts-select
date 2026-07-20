import defaultConfig from "@gingacodemonkey/config/eslint";
import type { Linter } from "eslint";

export const extraRules: Array<Linter.Config> = [{
  rules: {
    "no-barrel-files/no-barrel-files": "off",
  },
}];

const config: Array<Linter.Config> = [
  ...defaultConfig,
  ...extraRules,
];

export default config;
