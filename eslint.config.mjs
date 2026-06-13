import nextConfig from "eslint-config-next/core-web-vitals";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "ui-only-backup/**",
      "dist/**",
    ],
  },
  ...nextConfig,
  {
    rules: {
      // Client-only hydration init (theme, dashboard fetch) is intentional.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
