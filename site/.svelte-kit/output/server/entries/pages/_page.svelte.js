import { b as escape_html, i as head, r as ensure_array_like, t as attr_class, y as attr } from "../../chunks/server.js";
//#region src/lib/site.ts
var site = {
	name: "Keel",
	title: "Keel: proof gates for self-updating software",
	description: "Keel admits a candidate only when a signed, artifact-bound proof passes, then leaves a hash-chained receipt.",
	url: "https://keel.coey.dev",
	repository: "https://github.com/acoyfellow/keel"
};
var examples = [
	{
		title: "Bad live candidate refused",
		claim: "A candidate that builds but fails a real request cannot promote.",
		command: "bun run examples/refuse-bad-self-update/run.ts",
		receipt: "receipts/example-refuse-bad-self-update.md",
		result: "promotion denied; known-good restored",
		state: "refused"
	},
	{
		title: "Stolen token inert",
		claim: "A valid write token cannot promote a different artifact without a fresh proof.",
		command: "bun run examples/stolen-token-useless/run.ts",
		receipt: "receipts/example-stolen-token-useless.md",
		result: "ref unchanged after replay and forgery attempts",
		state: "refused"
	},
	{
		title: "One key cannot ship",
		claim: "A 2-of-3 threshold blocks a single compromised verifier key.",
		command: "bun run examples/one-key-cant-ship/run.ts",
		receipt: "receipts/example-one-key-cant-ship.md",
		result: "single signer refused; edited log detected",
		state: "refused"
	},
	{
		title: "Audit survives restart",
		claim: "Trust state and signed decisions survive reload and detect tamper.",
		command: "bun run examples/audit-survives-restart/run.ts",
		receipt: "receipts/example-audit-survives-restart.md",
		result: "7 checks pass after reload and tamper injection",
		state: "accepted"
	},
	{
		title: "Hand-rolled gate deleted",
		claim: "A toy worker deletes local deploy-gate logic by importing Keel.",
		command: "bun run examples/delete-the-handrolled-gate/run.ts",
		receipt: "receipts/example-delete-the-handrolled-gate.md",
		result: "41 owner lines shrink to 25 while attacks flip to refused",
		state: "accepted"
	}
];
var quickStart = [
	{
		command: "bun install",
		note: "install the library and site workspace"
	},
	{
		command: "bun test",
		note: "run deterministic library and content checks"
	},
	{
		command: "bun run examples/delete-the-handrolled-gate/run.ts",
		note: "replay the deletion receipt"
	}
];
var mechanics = [
	"A candidate is named by content digest.",
	"A verifier builds, smokes, and records evidence for that exact digest.",
	"The proof is signed by an active trusted key, or by enough keys for a threshold.",
	"Promotion uses a scoped token and compare-and-swap against the known baseline.",
	"Every decision appends to a hash-chained receipt."
];
var boundaries = [
	"Keel does not deploy an app for you.",
	"Keel does not hold long-lived write credentials.",
	"Keel does not trust a passing test without an artifact-bound proof.",
	"Keel does not claim downstream adoption until another project imports it and deletes code."
];
site.name, site.description, site.repository, `${site.repository}`;
//#endregion
//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		head("1uha8ag", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(site.title)}</title>`);
			});
			$$renderer.push(`<meta name="description"${attr("content", site.description)}/> <link rel="canonical"${attr("href", site.url)}/> <meta property="og:type" content="website"/> <meta property="og:title"${attr("content", site.title)}/> <meta property="og:description"${attr("content", site.description)}/> <meta property="og:url"${attr("content", site.url)}/> <meta property="og:image"${attr("content", `${site.url}/og.svg`)}/> <meta name="twitter:card" content="summary_large_image"/> <meta name="twitter:title"${attr("content", site.title)}/> <meta name="twitter:description"${attr("content", site.description)}/> <meta name="twitter:image"${attr("content", `${site.url}/og.svg`)}/> `);
			$$renderer.push(`<script type="application/ld+json">{JSON.stringify(structuredData)}<\/script>`);
		});
		$$renderer.push(`<main class="shell svelte-1uha8ag"><nav class="topbar svelte-1uha8ag" aria-label="Primary"><a class="brand svelte-1uha8ag" href="/" aria-label="Keel home"><span class="brand-mark svelte-1uha8ag" aria-hidden="true"></span> <span>keel</span></a> <div class="nav-links svelte-1uha8ag"><a href="#proof" class="svelte-1uha8ag">Proof</a> <a href="#mechanism" class="svelte-1uha8ag">Mechanism</a> <a href="#limits" class="svelte-1uha8ag">Limits</a> <a${attr("href", site.repository)} class="svelte-1uha8ag">Source</a></div></nav> <section class="hero svelte-1uha8ag" aria-labelledby="hero-title"><div class="hero-copy svelte-1uha8ag"><p class="eyebrow svelte-1uha8ag">Artifact-bound completion gate</p> <h1 id="hero-title" class="svelte-1uha8ag">Software does not get to call itself done.</h1> <p class="lead svelte-1uha8ag">Keel admits a new version only when a signed proof binds observed behavior to the exact
        candidate artifact. Promotion is compare-and-swap. Refusal rolls back to known-good. The
        trail is signed and hash-chained.</p> <div class="hero-actions svelte-1uha8ag" aria-label="Primary actions"><a class="button primary svelte-1uha8ag" href="#quick-start">Run the proof</a> <a class="button secondary svelte-1uha8ag"${attr("href", site.repository)}>Read source</a></div></div> <aside class="receipt-artifact svelte-1uha8ag" aria-label="Observed gate transcript"><div class="receipt-header svelte-1uha8ag"><span>receipt</span> <span>0.0.1</span></div> <div class="receipt-line refused svelte-1uha8ag"><span class="svelte-1uha8ag">DENIED</span> <code class="svelte-1uha8ag">live smoke failed</code></div> <div class="receipt-line neutral svelte-1uha8ag"><span class="svelte-1uha8ag">ROLLBACK</span> <code class="svelte-1uha8ag">known-good restored</code></div> <div class="receipt-line accepted svelte-1uha8ag"><span class="svelte-1uha8ag">ACCEPTED</span> <code class="svelte-1uha8ag">chain verified</code></div> <p class="svelte-1uha8ag">The receipt is the product surface: what ran, what refused, what changed, and what remains
        unproven.</p></aside></section> <section id="quick-start" class="section split svelte-1uha8ag"><div><p class="eyebrow svelte-1uha8ag">Seven-minute path</p> <h2 class="svelte-1uha8ag">Run the smallest useful check.</h2> <p class="svelte-1uha8ag">The quick path exercises the real library and the deletion example. It does not call a
        network service or ask for a secret.</p></div> <ol class="command-rail svelte-1uha8ag"><!--[-->`);
		const each_array = ensure_array_like(quickStart);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];
			$$renderer.push(`<li class="svelte-1uha8ag"><code class="svelte-1uha8ag">${escape_html(item.command)}</code> <span class="svelte-1uha8ag">${escape_html(item.note)}</span></li>`);
		}
		$$renderer.push(`<!--]--></ol></section> <section id="proof" class="section svelte-1uha8ag"><div class="section-heading svelte-1uha8ag"><p class="eyebrow svelte-1uha8ag">Receipts before claims</p> <h2 class="svelte-1uha8ag">Five examples, each with a way to be wrong.</h2> <p class="svelte-1uha8ag">Each example states a falsifiable claim, runs a harness, and leaves a receipt with a
        two-sided review. Projection stays separate from observed results.</p></div> <div class="evidence-grid svelte-1uha8ag"><!--[-->`);
		const each_array_1 = ensure_array_like(examples);
		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let example = each_array_1[$$index_1];
			$$renderer.push(`<article${attr_class("svelte-1uha8ag", void 0, {
				"accepted": example.state === "accepted",
				"refused": example.state === "refused"
			})}><div class="card-label svelte-1uha8ag"><span>${escape_html(example.state)}</span> <a${attr("href", `${site.repository}/blob/main/${example.receipt}`)} class="svelte-1uha8ag">receipt</a></div> <h3 class="svelte-1uha8ag">${escape_html(example.title)}</h3> <p class="svelte-1uha8ag">${escape_html(example.claim)}</p> <code class="svelte-1uha8ag">${escape_html(example.command)}</code> <strong class="svelte-1uha8ag">${escape_html(example.result)}</strong></article>`);
		}
		$$renderer.push(`<!--]--></div></section> <section id="mechanism" class="section split svelte-1uha8ag"><div><p class="eyebrow svelte-1uha8ag">Mechanism</p> <h2 class="svelte-1uha8ag">The gate is small enough to audit.</h2> <p class="svelte-1uha8ag">The load-bearing primitive is content addressing. A proof, a promotion, and a rollback all
        name the same bytes.</p></div> <div class="mechanism-list svelte-1uha8ag"><!--[-->`);
		const each_array_2 = ensure_array_like(mechanics);
		for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
			let item = each_array_2[index];
			$$renderer.push(`<div class="svelte-1uha8ag"><span class="svelte-1uha8ag">${escape_html(String(index + 1).padStart(2, "0"))}</span> <p class="svelte-1uha8ag">${escape_html(item)}</p></div>`);
		}
		$$renderer.push(`<!--]--></div></section> <section class="section status-section svelte-1uha8ag" aria-labelledby="status-title"><div><p class="eyebrow svelte-1uha8ag">Current ledger</p> <h2 id="status-title" class="svelte-1uha8ag">Verified inside this repo. Downstream adoption is still unproven.</h2></div> <div class="status-strip svelte-1uha8ag"><div class="svelte-1uha8ag"><span class="dot accepted svelte-1uha8ag"></span> <strong class="svelte-1uha8ag">75</strong> <span>tests pass</span></div> <div class="svelte-1uha8ag"><span class="dot accepted svelte-1uha8ag"></span> <strong class="svelte-1uha8ag">5</strong> <span>example receipts</span></div> <div class="svelte-1uha8ag"><span class="dot neutral svelte-1uha8ag"></span> <strong class="svelte-1uha8ag">1</strong> <span>downstream adoption claim remains open</span></div></div></section> <section id="limits" class="section split svelte-1uha8ag"><div><p class="eyebrow svelte-1uha8ag">Boundary</p> <h2 class="svelte-1uha8ag">What Keel does not own.</h2> <p class="svelte-1uha8ag">The library is intentionally provider-agnostic. Callers supply the deploy, verify,
        rollback, and storage ports.</p></div> <ul class="boundary-list svelte-1uha8ag"><!--[-->`);
		const each_array_3 = ensure_array_like(boundaries);
		for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
			let item = each_array_3[$$index_3];
			$$renderer.push(`<li class="svelte-1uha8ag">${escape_html(item)}</li>`);
		}
		$$renderer.push(`<!--]--></ul></section> <footer class="footer svelte-1uha8ag"><p class="svelte-1uha8ag">MIT. Version 0.0.1. Small until the receipts demand otherwise.</p> <a${attr("href", site.repository)} class="svelte-1uha8ag">github.com/acoyfellow/keel</a></footer></main>`);
	});
}
//#endregion
export { _page as default };
