/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  setupFiles: ["<rootDir>/test/setupEnv.ts"],
  // Run tests as native ESM, same module system as the real server
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: { target: "es2023", parser: { syntax: "typescript" } },
        module: { type: "es6" },
      },
    ],
  },
  // Source imports use "./file.js" (NodeNext); map them back to the .ts files
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
};
