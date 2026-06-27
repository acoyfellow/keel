import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.B2z9WmyZ.js","_app/immutable/chunks/D8OTdkwq.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/DvhXkdfF.js"];
export const stylesheets = ["_app/immutable/assets/0.BE5WoZk0.css"];
export const fonts = [];
