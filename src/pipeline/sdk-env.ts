/**
 * Build a clean environment for the Claude Agent SDK subprocess.
 * Strips the CLAUDECODE env var to allow nested sessions.
 */
export function getCleanEnv(): Record<string, string | undefined> {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  return env;
}
