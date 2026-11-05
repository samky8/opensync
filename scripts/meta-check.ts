import nextEnv from '@next/env';
import { metaSetupIssues, metaRedirect } from '../src/lib/meta-config';

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
const issues = metaSetupIssues();
console.log('Meta local configuration check (does not contact Meta or print secrets)');
for (const issue of issues) console.log(`FAIL: ${issue}`);
if (!issues.length) {
  console.log('PASS: Required environment settings are present and correctly formatted.');
  console.log(`OAuth redirect URI: ${metaRedirect()}`);
}
console.log(
  'Manual checks: migration 004, public media access, completed privacy/terms, Meta verification, Advanced Access, Live mode, and real publishing tests.',
);
console.log(
  'See docs/META-SETUP.md. Passing this check does not prove Meta approval or valid credentials.',
);
process.exitCode = issues.length ? 1 : 0;
