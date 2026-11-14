import policy from '../../config/homologation.json' with { type: 'json' };

/** @typedef {{schemaVersion:number,stagingProjectRef:string|null,protectedProjectRefs:string[],stagingAppOrigin:string|null,syntheticDataOnly:boolean}} DeploymentPolicy */
/** @param {string} code @returns {never} */
function deny(code) { throw new Error(`JA_ENV_${code}: configuração bloqueada; consulte o guia de homologação.`); }
/** @param {string|undefined|null} value */
function origin(value) {
  try {
    const url = new URL(value ?? '');
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') deny('ORIGIN');
    return url;
  } catch { return deny('ORIGIN'); }
}
/** @param {DeploymentPolicy} approved */
function stagingPolicy(approved) {
  if (approved.schemaVersion !== 1 || approved.syntheticDataOnly !== true ||
      !/^[a-z0-9]{20}$/.test(approved.stagingProjectRef ?? '') ||
      !approved.protectedProjectRefs.length ||
      !approved.protectedProjectRefs.every(ref => /^[a-z0-9]{20}$/.test(ref)) ||
      approved.protectedProjectRefs.includes(approved.stagingProjectRef ?? '')) deny('PROJECT_APPROVAL');
  const app = origin(approved.stagingAppOrigin);
  if (app.protocol !== 'https:' || app.port || ['localhost', '127.0.0.1'].includes(app.hostname)) deny('STAGING_ORIGIN');
  return app.origin;
}
/** Only loopback or the reviewed staging project can ever reach a Supabase SDK.
 * @param {string|undefined} url
 * @param {string|undefined} key
 * @param {DeploymentPolicy} [approved]
 */
export function publicSupabaseConfig(url, key, approved = policy) {
  const parsed = origin(url);
  if (!key || key.startsWith('sb_secret_')) deny('PUBLIC_KEY');
  const local = parsed.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(parsed.hostname) && parsed.port === '54321';
  if (local) {
    // Local CLI may issue legacy anon JWTs; privileged legacy keys are never accepted.
    if (key.split('.').length === 3) {
      try { if (JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role !== 'anon') deny('PUBLIC_KEY'); }
      catch { deny('PUBLIC_KEY'); }
    }
    return { url: parsed.origin, key, mode: /** @type {const} */ ('local') };
  }
  stagingPolicy(approved);
  if (parsed.origin !== `https://${approved.stagingProjectRef}.supabase.co` || parsed.port || parsed.protocol !== 'https:') deny('SUPABASE_DESTINATION');
  if (!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key)) deny('PUBLIC_KEY');
  return { url: parsed.origin, key, mode: /** @type {const} */ ('staging') };
}
/** No production or arbitrary cloud targets in this staging-only branch.
 * @param {Record<string,string|undefined>} env
 * @param {DeploymentPolicy} [approved]
 */
export function runtimeEnvironment(env, approved = policy) {
  const hosted = Boolean(env.VERCEL || env.VERCEL_ENV);
  if (env.APP_ENV && !['local', 'staging'].includes(env.APP_ENV)) deny('MODE');
  if (hosted && (env.VERCEL !== '1' || env.VERCEL_ENV !== 'preview' || env.APP_ENV !== 'staging')) deny('CLOUD_MODE');
  if (env.APP_ENV === 'staging') {
    if (!hosted || env.VERCEL_ENV !== 'preview') deny('PREVIEW_REQUIRED');
    const appOrigin = stagingPolicy(approved);
    if (origin(env.APP_URL).origin !== appOrigin) deny('APP_URL');
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(env.STAGING_GATE_SECRET ?? '') || /change|placeholder|replace|example/i.test(env.STAGING_GATE_SECRET ?? '')) deny('ACCESS_GATE');
    const config = publicSupabaseConfig(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, approved);
    if (config.mode !== 'staging') deny('CLOUD_LOOPBACK');
    return { ...config, appOrigin };
  }
  const app = origin(env.APP_URL ?? 'http://localhost:3000');
  if (app.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(app.hostname) || !['3000', '3210'].includes(app.port)) deny('LOCAL_ORIGIN');
  if (!env.NEXT_PUBLIC_SUPABASE_URL && !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return { mode: /** @type {const} */ ('local'), appOrigin: app.origin, url: undefined, key: undefined };
  const config = publicSupabaseConfig(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, approved);
  if (config.mode !== 'local') deny('LOCAL_REMOTE');
  return { ...config, appOrigin: app.origin };
}
