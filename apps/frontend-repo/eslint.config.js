import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import importX from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "public"]),
  {
    plugins: {
      boundaries,
      import: importX,
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: ["./tsconfig.json"],
        },
      },
      "boundaries/elements": [
        {
          type: "feature",
          pattern: "src/features/*/*/**",
          capture: ["feature", "segment"],
        },
        {
          type: "shared",
          pattern: "src/shared/*/**",
          capture: ["segment"],
        },
        {
          type: "app",
          pattern: "src/app/**",
        },
        {
          type: "mocks",
          pattern: "src/mocks/**",
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      "boundaries/dependencies": [
        "warn",
        {
          default: "allow",
          rules: [
            // 1. Cross-Feature Isolation
            {
              disallow: {
                from: { type: "feature" },
                to: {
                  type: "feature",
                  captured: { feature: "!{{ from.feature }}" },
                },
              },
              message:
                "피처 간 직접 참조는 금지됩니다 ({{ from.feature }} -> {{ to.feature }}). shared로 승격하거나 app 계층에서 합성하세요.",
            },
            // 2. Shared Purity
            {
              disallow: {
                from: { type: "shared" },
                to: [{ type: "feature" }, { type: "app" }],
              },
              message:
                "공유 계층(shared)은 상위 도메인 지식(features, app)을 가질 수 없습니다.",
            },
            // 3. Model Purity
            {
              disallow: {
                from: { captured: { segment: "model" } },
                to: { captured: { segment: ["api", "ui", "routes"] } },
              },
              message:
                "도메인 모델은 순수해야 합니다. api, ui, routes 등 부수 효과 계층을 참조하지 마세요.",
            },
            // 4. UI Isolation
            {
              disallow: {
                from: { captured: { segment: "ui" } },
                to: { captured: { segment: ["routes"] } },
              },
              message:
                "컴포넌트는 제어 로직(routes)에 의존할 수 없습니다. props나 callback으로 주입받으세요.",
            },
            // 5. API Isolation
            {
              disallow: {
                from: { captured: { segment: "api" } },
                to: { captured: { segment: ["ui", "routes"] } },
              },
              message:
                "데이터 통신 레이어는 화면 구성이나 제어 로직을 알 필요가 없습니다.",
            },
          ],
        },
      ],
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "axios",
              message:
                "axios를 직접 사용하지 마세요. @shared/api/axios에 정의된 api 인스턴스를 사용해야 합니다.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/api/axios.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);
