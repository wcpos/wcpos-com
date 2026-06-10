import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      react: {
        // eslint-plugin-react's runtime "detect" relies on context.getFilename(),
        // which was removed in ESLint 10. Pin explicitly until the plugin supports it.
        version: "19.2.6",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-expressions": ["error", { allowTaggedTemplates: true }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
