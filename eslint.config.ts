import defaultConfig from "@gingacodemonkey/config/eslint";
import type { Linter } from "eslint";

export const extraRules: Array<Linter.Config> = [{
  rules: {
    "no-barrel-files/no-barrel-files": "off",
    "no-console": "off",
  },
},
  { files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises" : "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "sonarjs/assertions-in-tests": "off",
      "sonarjs/no-unused-vars" : "off"
    }}
];

const config: Array<Linter.Config> = [
  ...defaultConfig,
  ...extraRules,
];

export default config;
