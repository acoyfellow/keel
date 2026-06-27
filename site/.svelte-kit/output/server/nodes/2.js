

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.CMQLjvRo.js","_app/immutable/chunks/D8OTdkwq.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/DvhXkdfF.js"];
export const stylesheets = ["_app/immutable/assets/2.BNYmOH-N.css"];
export const fonts = [];
