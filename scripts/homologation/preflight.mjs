import { runtimeEnvironment } from '../../src/lib/environment/policy.mjs';
try {
  const result = runtimeEnvironment(process.env);
  if (process.argv.includes('--staging') && result.mode !== 'staging') throw new Error('JA_ENV_STAGING_REQUIRED: execute com configuração Preview de homologação aprovada.');
  console.log(`PASS: configuração ${result.mode === 'staging' ? 'de homologação aprovada, com barreira de acesso' : 'local, sem destino remoto'}; nenhuma requisição externa realizada.`);
} catch (error) {
  // Validation errors contain constant codes, never environment values.
  console.error(error instanceof Error && error.message.startsWith('JA_ENV_') ? error.message : 'JA_ENV_INVALID: configuração bloqueada.');
  process.exitCode = 1;
}
