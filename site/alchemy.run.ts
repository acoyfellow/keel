import alchemy from 'alchemy';
import { SvelteKit } from 'alchemy/cloudflare';
import { CloudflareStateStore, FileSystemStateStore } from 'alchemy/state';

const projectName = 'keel';

// Personal deploy: local file state + the alchemy OAuth login (~/.alchemy).
// Set ALCHEMY_PASSWORD + CLOUDFLARE_API_TOKEN + ALCHEMY_STATE_TOKEN to use
// remote CloudflareStateStore instead (for CI).
const remote = Boolean(process.env.ALCHEMY_STATE_TOKEN && process.env.CLOUDFLARE_API_TOKEN);

const project = await alchemy(projectName, {
  password: process.env.ALCHEMY_PASSWORD ?? 'keel-local-state',
  stateStore: (scope) =>
    remote && !scope.local
      ? new CloudflareStateStore(scope, {
          scriptName: `${projectName}-app-state`,
          apiToken: alchemy.secret(process.env.CLOUDFLARE_API_TOKEN ?? ''),
          stateToken: alchemy.secret(process.env.ALCHEMY_STATE_TOKEN ?? ''),
        })
      : new FileSystemStateStore(scope),
});

const isProduction = !project.stage || project.stage === 'production';
const resourcePrefix = isProduction ? projectName : `${projectName}-${project.stage}`;

export const SITE = await SvelteKit(`${resourcePrefix}-site`, {
  name: `${resourcePrefix}-site`,
  ...(isProduction ? { domains: ['keel.coey.dev'] } : {}),
  adopt: true,
  url: true,
});

console.log({ url: SITE.url });

await project.finalize();
