const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const importPlugin = require("eslint-plugin-import");

module.exports = [
  {
    files: ["client/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
    },
    rules: {
      "import/no-default-export": "error",
      "import/no-namespace": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          "prefer": "type-imports",
          "fixStyle": "separate-type-imports"
        }
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "eqeqeq": "error",
      "no-restricted-syntax": [
        "error",
        {
          "selector": "ImportDefaultSpecifier",
          "message": "Default imports are not allowed."
        },
        {
          "selector": "ImportNamespaceSpecifier",
          "message": "Namespace imports are not allowed."
        }
      ],
    },
  },
];
