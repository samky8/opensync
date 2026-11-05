// Pure configuration helpers shared by the server and the local setup check.
export const metaVersion = () => process.env.META_GRAPH_VERSION || 'v25.0';
export function metaSetupIssues() {
  const issues: string[] = [];
  if (!/^\d+$/.test(process.env.META_APP_ID || ''))
    issues.push('Set META_APP_ID to your numeric Meta app ID.');
  if (!process.env.META_APP_SECRET) issues.push('Set META_APP_SECRET on the server.');
  if (!/^[a-f\d]{64}$/i.test(process.env.TOKEN_ENCRYPTION_KEY || ''))
    issues.push(
      'Set TOKEN_ENCRYPTION_KEY to 32 random bytes encoded as 64 hex characters; preserve any existing deployed key.',
    );
  if (!/^v\d+\.\d+$/.test(metaVersion()))
    issues.push('Use a version such as v25.0 for META_GRAPH_VERSION.');
  if (process.env.META_LOGIN_CONFIG_ID && !/^\d+$/.test(process.env.META_LOGIN_CONFIG_ID))
    issues.push(
      'META_LOGIN_CONFIG_ID must be a numeric Facebook Login for Business configuration ID.',
    );
  try {
    const url = new URL(process.env.NEXT_PUBLIC_APP_URL || '');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    )
      throw new Error();
  } catch {
    issues.push(
      'Set NEXT_PUBLIC_APP_URL to the public HTTPS origin, without a path, query, or fragment.',
    );
  }
  return issues;
}
export const metaConfigured = () => metaSetupIssues().length === 0;
export const metaRedirect = () =>
  `${(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')}/api/social/callback`;
export const metaScopes = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
];
export function metaAuthorizationUrl(state: string) {
  const url = new URL(`https://www.facebook.com/${metaVersion()}/dialog/oauth`);
  url.search = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: metaRedirect(),
    response_type: 'code',
    ...(process.env.META_LOGIN_CONFIG_ID
      ? { config_id: process.env.META_LOGIN_CONFIG_ID, override_default_response_type: 'true' }
      : { scope: metaScopes.join(',') }),
    auth_type: 'rerequest',
    state,
  }).toString();
  return url.toString();
}
