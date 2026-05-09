import nextVitals from "eslint-config-next/core-web-vitals"

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...nextVitals,
  {
    rules: {
      // Shadcn / dashboard patterns; refactoring would be large and low value
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["eslint.config.mjs"],
    rules: {
      "import/no-anonymous-default-export": "off",
    },
  },
]

export default eslintConfig
