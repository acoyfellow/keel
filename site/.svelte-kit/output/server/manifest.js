export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.svg","icon.svg","manifest.webmanifest","og.svg","robots.txt","sitemap.xml","sw.js"]),
	mimeTypes: {".svg":"image/svg+xml",".webmanifest":"application/manifest+json",".txt":"text/plain",".xml":"text/xml",".js":"text/javascript"},
	_: {
		client: {start:"_app/immutable/entry/start.hnqjE5pJ.js",app:"_app/immutable/entry/app.aY7I6Nk_.js",imports:["_app/immutable/entry/start.hnqjE5pJ.js","_app/immutable/chunks/DA7Xs4W5.js","_app/immutable/chunks/D8OTdkwq.js","_app/immutable/entry/app.aY7I6Nk_.js","_app/immutable/chunks/D8OTdkwq.js","_app/immutable/chunks/DYl5dUZ5.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js'))
		],
		remotes: {
			
		},
		routes: [
			
		],
		prerendered_routes: new Set(["/"]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
