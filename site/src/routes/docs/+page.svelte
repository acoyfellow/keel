<script lang="ts">
  import Topbar from '$lib/Topbar.svelte';
  import Footer from '$lib/Footer.svelte';
  import { site, examples } from '$lib/site';

  const concepts = [
    { term: 'Proof', body: 'An Ed25519, artifact-bound record of what the verifier observed. A proof is admitted only for the exact content digest it names.' },
    { term: 'Keyring', body: 'Verifier keys with validity windows, rotation, and revocation. A valid signature from a revoked or rotated-out key is refused.' },
    { term: 'Threshold', body: 'k-of-n distinct trusted keys must sign. One compromised key cannot admit a candidate alone.' },
    { term: 'Promote', body: 'Compare-and-swap against the known baseline. A candidate cannot clobber production if the baseline moved underneath it.' },
    { term: 'Decision', body: 'Every step is hash-chained and signed, survives a restart, and an edited or removed entry is detectable.' }
  ];

  const quickstart = [
    { command: 'git clone https://github.com/acoyfellow/keel', note: 'clone the repo' },
    { command: 'bun install', note: 'install, zero runtime dependencies' },
    { command: 'bun test', note: '75 deterministic checks across the gate' },
    { command: 'bun run examples/refuse-bad-self-update/run.ts', note: 'watch a bad candidate get refused' }
  ];

  const limits = [
    { surface: 'Live smoke', boundary: 'The default runner boots a built server and sends one request. It is a reference runner, not a hosted preview environment.' },
    { surface: 'Minting', boundary: 'The minting role and scoped token are enforced in the model. Production must back the minting role with a real, separately held credential.' },
    { surface: 'Persistence', boundary: 'The default store is file-backed with a checksum. A KV, Durable Object, or D1 adapter implements the same interface.' },
    { surface: 'Trust root', boundary: 'Threshold raises the cost of a single compromise. It does not remove the owner root as ultimate authority.' },
    { surface: 'Leverage', boundary: 'The delete-the-gate result is real inside this repo. An out-of-tree worker doing the same against its live deploy is recorded as unproven.' }
  ];
</script>

<svelte:head>
  <title>Keel / docs</title>
  <meta name="description" content="Keel documentation: install, core concepts, examples, deploy, and honest limits." />
</svelte:head>

<main class="shell">
  <Topbar />

  <header class="doc-hero">
    <p class="eyebrow">Docs</p>
    <h1>Run the gate, then read why it refuses.</h1>
    <p class="lead">
      Keel is a provider-agnostic control plane for verified self-update. It decides whether a
      candidate version may replace the running one. It does not deploy, contact a provider, or
      hold credentials.
    </p>
  </header>

  <section class="section" aria-labelledby="quickstart">
    <div class="section-heading">
      <p class="eyebrow">Quick start</p>
      <h2 id="quickstart">Four commands, no account.</h2>
      <p>The quick path exercises the real library. It does not call a network service or ask for a secret.</p>
    </div>
    <ol class="command-rail">
      {#each quickstart as item}
        <li><code>{item.command}</code><span>{item.note}</span></li>
      {/each}
    </ol>
  </section>

  <section class="section" aria-labelledby="concepts">
    <div class="section-heading">
      <p class="eyebrow">Concepts</p>
      <h2 id="concepts">Five parts, one decision.</h2>
      <p>A candidate is identified by content. These parts decide whether it may replace the running version.</p>
    </div>
    <dl class="concept-list">
      {#each concepts as c}
        <div><dt>{c.term}</dt><dd>{c.body}</dd></div>
      {/each}
    </dl>
  </section>

  <section class="section" aria-labelledby="examples">
    <div class="section-heading">
      <p class="eyebrow">Examples</p>
      <h2 id="examples">Each one is a claim that could be wrong.</h2>
      <p>Every example runs and leaves a receipt with the case for it and the strongest case against it.</p>
    </div>
    <ul class="example-list">
      {#each examples as ex}
        <li>
          <div class="example-head">
            <span class="tag {ex.state}">{ex.state}</span>
            <h3>{ex.title}</h3>
          </div>
          <p>{ex.claim}</p>
          <code>{ex.command}</code>
          <span class="result">{ex.result}</span>
        </li>
      {/each}
    </ul>
  </section>

  <section class="section" aria-labelledby="deploy">
    <div class="section-heading">
      <p class="eyebrow">Deploy</p>
      <h2 id="deploy">Keel is a library, not a service.</h2>
      <p>
        Import it where your deploy already runs and supply the deploy, verify, storage, and
        credential ports. Keel decides; the ports act. There is nothing to host.
      </p>
    </div>
    <ol class="command-rail">
      <li><code>import &#123; verifySignedProof, Keyring &#125; from './keel/src/index.ts'</code><span>path import; keel is not published to npm</span></li>
      <li><code>bun test</code><span>keel ships 75 checks; test your own ports the same way</span></li>
    </ol>
  </section>

  <section class="section" aria-labelledby="limits">
    <div class="section-heading">
      <p class="eyebrow">Limits</p>
      <h2 id="limits">What keel does not pretend to do.</h2>
      <p>The model is honest about its edges. These are reference implementations and named gaps, not hidden assumptions.</p>
    </div>
    <dl class="limit-list">
      {#each limits as l}
        <div><dt>{l.surface}</dt><dd>{l.boundary}</dd></div>
      {/each}
    </dl>
  </section>

  <Footer />
</main>

<style>
  .doc-hero { padding: var(--space-16) 0 var(--space-12); }
  .doc-hero h1 {
    margin: 0;
    max-width: 680px;
    font-size: clamp(2rem, 1.4rem + 2.6vw, 3rem);
    line-height: 1.08;
    letter-spacing: -0.03em;
  }
  .section-heading h2 { margin: 0; font-size: clamp(1.75rem, 3vw, 2.5rem); letter-spacing: -0.03em; line-height: 1.1; }

  .concept-list, .limit-list { display: grid; gap: 0; margin: 0; }
  .concept-list div, .limit-list div {
    display: grid;
    grid-template-columns: minmax(120px, 180px) 1fr;
    gap: var(--space-6);
    padding: var(--space-5) 0;
    border-top: 1px solid var(--color-border);
  }
  .concept-list div:first-child, .limit-list div:first-child { border-top: 0; }
  dt { margin: 0; font-weight: 700; color: var(--color-text); }
  dd { margin: 0; color: var(--color-muted); line-height: 1.65; }

  .example-list { display: grid; gap: var(--space-4); margin: 0; padding: 0; list-style: none; }
  .example-list li {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }
  .example-list code {
    font-family: 'IBM Plex Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.9rem;
    color: var(--color-text);
  }
  .example-head { display: flex; align-items: center; gap: var(--space-3); }
  .example-head h3 { margin: 0; font-size: 1.05rem; }
  .example-list p { margin: 0; color: var(--color-muted); line-height: 1.6; }
  .result { color: var(--color-faint); font-size: 0.82rem; }
  .tag {
    font-family: 'IBM Plex Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-strong);
    color: var(--color-muted);
  }
  .tag.refused { color: var(--color-red); border-color: color-mix(in srgb, var(--color-red) 40%, transparent); }
  .tag.accepted { color: var(--color-green); border-color: color-mix(in srgb, var(--color-green) 40%, transparent); }

  @media (max-width: 640px) {
    .concept-list div, .limit-list div { grid-template-columns: 1fr; gap: var(--space-2); }
  }
</style>
