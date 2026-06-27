
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const NODE_ENV: string;
	export const COLORTERM: string;
	export const CODEX_INTERNAL_ORIGINATOR_OVERRIDE: string;
	export const SVELTEKIT_FORK: string;
	export const _: string;
	export const npm_node_execpath: string;
	export const OSLogRateLimit: string;
	export const DESK_APPS_REPO_TOKEN: string;
	export const NVM_BIN: string;
	export const BUN_INSTALL: string;
	export const npm_lifecycle_script: string;
	export const CLOUDFLARE_PERSONAL_API_TOKEN: string;
	export const GH_PAGER: string;
	export const LOG_FORMAT: string;
	export const SHLVL: string;
	export const npm_package_version: string;
	export const TRACE_INGEST_TOKEN: string;
	export const npm_package_json: string;
	export const CODEX_CI: string;
	export const ZSH_TMUX_AUTOSTART: string;
	export const CLOUDFLARE_PERSONAL_ACCOUNT_ID: string;
	export const ZSH_TMUX_AUTOSTARTED: string;
	export const npm_package_name: string;
	export const npm_lifecycle_event: string;
	export const XPC_FLAGS: string;
	export const npm_command: string;
	export const USER: string;
	export const __CFBundleIdentifier: string;
	export const XPC_SERVICE_NAME: string;
	export const DESK_DEVICE_TOKEN: string;
	export const GUARDRAIL_REAL_WRANGLER_CLI: string;
	export const NODE_EXTRA_CA_CERTS: string;
	export const DISABLE_AUTO_UPDATE: string;
	export const CODEX_THREAD_ID: string;
	export const LC_CTYPE: string;
	export const DESK_APPS_REPO_REMOTE: string;
	export const PATH: string;
	export const PAGER: string;
	export const npm_execpath: string;
	export const CLOUDFLARE_ACCOUNT_ID: string;
	export const CARGO_HTTP_CAINFO: string;
	export const COMMAND_MODE: string;
	export const GUARDRAIL_DIST: string;
	export const NVM_CD_FLAGS: string;
	export const PWD: string;
	export const HOME: string;
	export const NVM_INC: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const SSH_AUTH_SOCK: string;
	export const LC_ALL: string;
	export const LOGNAME: string;
	export const CODEX_SHELL: string;
	export const RUST_LOG: string;
	export const npm_config_local_prefix: string;
	export const TERM: string;
	export const TMPDIR: string;
	export const MallocNanoZone: string;
	export const NO_COLOR: string;
	export const NODE: string;
	export const npm_config_user_agent: string;
	export const REQUESTS_CA_BUNDLE: string;
	export const GIT_PAGER: string;
	export const SSL_CERT_FILE: string;
	export const LANG: string;
	export const GUARDRAIL_WORKERS_SUBDOMAIN: string;
	export const SHELL: string;
	export const NVM_DIR: string;
	export const OMO_SPARKSHELL_APP_SERVER_SOCKET: string;
	export const CODEX_HOME: string;
	export const BRAINTRUST_API_KEY: string;
	export const DEJA_API_KEY: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		NODE_ENV: string;
		COLORTERM: string;
		CODEX_INTERNAL_ORIGINATOR_OVERRIDE: string;
		SVELTEKIT_FORK: string;
		_: string;
		npm_node_execpath: string;
		OSLogRateLimit: string;
		DESK_APPS_REPO_TOKEN: string;
		NVM_BIN: string;
		BUN_INSTALL: string;
		npm_lifecycle_script: string;
		CLOUDFLARE_PERSONAL_API_TOKEN: string;
		GH_PAGER: string;
		LOG_FORMAT: string;
		SHLVL: string;
		npm_package_version: string;
		TRACE_INGEST_TOKEN: string;
		npm_package_json: string;
		CODEX_CI: string;
		ZSH_TMUX_AUTOSTART: string;
		CLOUDFLARE_PERSONAL_ACCOUNT_ID: string;
		ZSH_TMUX_AUTOSTARTED: string;
		npm_package_name: string;
		npm_lifecycle_event: string;
		XPC_FLAGS: string;
		npm_command: string;
		USER: string;
		__CFBundleIdentifier: string;
		XPC_SERVICE_NAME: string;
		DESK_DEVICE_TOKEN: string;
		GUARDRAIL_REAL_WRANGLER_CLI: string;
		NODE_EXTRA_CA_CERTS: string;
		DISABLE_AUTO_UPDATE: string;
		CODEX_THREAD_ID: string;
		LC_CTYPE: string;
		DESK_APPS_REPO_REMOTE: string;
		PATH: string;
		PAGER: string;
		npm_execpath: string;
		CLOUDFLARE_ACCOUNT_ID: string;
		CARGO_HTTP_CAINFO: string;
		COMMAND_MODE: string;
		GUARDRAIL_DIST: string;
		NVM_CD_FLAGS: string;
		PWD: string;
		HOME: string;
		NVM_INC: string;
		__CF_USER_TEXT_ENCODING: string;
		SSH_AUTH_SOCK: string;
		LC_ALL: string;
		LOGNAME: string;
		CODEX_SHELL: string;
		RUST_LOG: string;
		npm_config_local_prefix: string;
		TERM: string;
		TMPDIR: string;
		MallocNanoZone: string;
		NO_COLOR: string;
		NODE: string;
		npm_config_user_agent: string;
		REQUESTS_CA_BUNDLE: string;
		GIT_PAGER: string;
		SSL_CERT_FILE: string;
		LANG: string;
		GUARDRAIL_WORKERS_SUBDOMAIN: string;
		SHELL: string;
		NVM_DIR: string;
		OMO_SPARKSHELL_APP_SERVER_SOCKET: string;
		CODEX_HOME: string;
		BRAINTRUST_API_KEY: string;
		DEJA_API_KEY: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
