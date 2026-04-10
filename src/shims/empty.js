// Empty module stub for Node-only built-ins not available in service workers.
// Used by Vite aliases to satisfy `import 'worker_threads'`, `import 'os'`, etc.
// when those modules are reachable via library code paths that are never
// actually executed in the browser/SW runtime (gated by isNode checks).
export default {};
