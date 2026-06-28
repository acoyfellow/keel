<script lang="ts">
  import Topbar from '$lib/Topbar.svelte';
  import Footer from '$lib/Footer.svelte';
  import { boundaries, examples, mechanics, quickStart, site } from '$lib/site';
</script>

<svelte:head>
  <title>{site.title}</title>
  <meta name="description" content={site.description} />
  <link rel="canonical" href={site.url} />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={site.title} />
  <meta property="og:description" content={site.description} />
  <meta property="og:url" content={site.url} />
  <meta property="og:image" content={`${site.url}/og.png`} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={site.title} />
  <meta name="twitter:description" content={site.description} />
  <meta name="twitter:image" content={`${site.url}/og.png`} />
</svelte:head>

<main class="shell">
  <Topbar />

  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy">
      <p class="eyebrow">Artifact-bound completion gate</p>
      <h1 id="hero-title">Software does not get to call itself done.</h1>
      <p class="lead">
        Keel admits a new version only when a signed proof binds observed behavior to the exact
        candidate artifact. Promotion is compare-and-swap. Refusal rolls back to known-good. The
        trail is signed and hash-chained.
      </p>
      <div class="hero-actions" aria-label="Primary actions">
        <a class="button primary" href="#quick-start">Run the proof</a>
        <a class="button secondary" href={site.repository}>Read source</a>
      </div>
    </div>

    <aside class="receipt-artifact" aria-label="Observed gate transcript">
      <div class="receipt-header">
        <span>receipt</span>
        <span>0.0.1</span>
      </div>
      <div class="receipt-line refused">
        <span>DENIED</span>
        <code>live smoke failed</code>
      </div>
      <div class="receipt-line neutral">
        <span>ROLLBACK</span>
        <code>known-good restored</code>
      </div>
      <div class="receipt-line accepted">
        <span>ACCEPTED</span>
        <code>chain verified</code>
      </div>
      <p>
        The receipt is the product surface: what ran, what refused, what changed, and what remains
        unproven.
      </p>
    </aside>
  </section>

  <section id="quick-start" class="section split">
    <div>
      <p class="eyebrow">Quick start</p>
      <h2>Run the smallest useful check.</h2>
      <p>
        The quick path exercises the real library and the deletion example. It does not call a
        network service or ask for a secret.
      </p>
    </div>
    <ol class="command-rail">
      {#each quickStart as item}
        <li>
          <code>{item.command}</code>
          <span>{item.note}</span>
        </li>
      {/each}
    </ol>
  </section>

  <section id="proof" class="section">
    <div class="section-heading">
      <p class="eyebrow">Receipts before claims</p>
      <h2>Five examples, each with a way to be wrong.</h2>
      <p>
        Each example states a falsifiable claim, runs a harness, and leaves a receipt with a
        two-sided review. Projection stays separate from observed results.
      </p>
    </div>

    <div class="evidence-grid">
      {#each examples as example}
        <article class:accepted={example.state === 'accepted'} class:refused={example.state === 'refused'}>
          <div class="card-label">
            <span>{example.state}</span>
            <a href={`${site.repository}/blob/main/${example.receipt}`}>receipt</a>
          </div>
          <h3>{example.title}</h3>
          <p>{example.claim}</p>
          <code>{example.command}</code>
          <strong>{example.result}</strong>
        </article>
      {/each}
    </div>
  </section>

  <section id="mechanism" class="section split">
    <div>
      <p class="eyebrow">Mechanism</p>
      <h2>The gate is small enough to audit.</h2>
      <p>
        The load-bearing primitive is content addressing. A proof, a promotion, and a rollback all
        name the same bytes.
      </p>
    </div>
    <div class="mechanism-list">
      {#each mechanics as item, index}
        <div>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <p>{item}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="section status-section" aria-labelledby="status-title">
    <div>
      <p class="eyebrow">Current ledger</p>
      <h2 id="status-title">Verified inside this repo. Downstream adoption is still unproven.</h2>
    </div>
    <div class="status-strip">
      <div>
        <span class="dot accepted"></span>
        <strong>75</strong>
        <span>tests pass</span>
      </div>
      <div>
        <span class="dot accepted"></span>
        <strong>5</strong>
        <span>example receipts</span>
      </div>
      <div>
        <span class="dot neutral"></span>
        <strong>1</strong>
        <span>downstream adoption claim remains open</span>
      </div>
    </div>
  </section>

  <section id="limits" class="section split">
    <div>
      <p class="eyebrow">Boundary</p>
      <h2>What Keel does not own.</h2>
      <p>
        The library is intentionally provider-agnostic. Callers supply the deploy, verify,
        rollback, and storage ports.
      </p>
    </div>
    <ul class="boundary-list">
      {#each boundaries as item}
        <li>{item}</li>
      {/each}
    </ul>
  </section>

  <Footer />
</main>

<style>
  .shell {
    width: min(100% - 32px, 1180px);
    margin: 0 auto;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    min-height: 72px;
    font-family: 'IBM Plex Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.78rem;
    color: var(--color-muted);
  }

  .brand,
  .nav-links {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .brand {
    color: var(--color-text);
    font-weight: 700;
  }

  .brand-mark {
    width: 22px;
    height: 22px;
    border-radius: var(--radius-sm);
    display: block;
  }

  .nav-links a {
    padding: var(--space-2);
    border-radius: var(--radius-sm);
  }

  .nav-links a:hover {
    color: var(--color-blue);
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.65fr);
    gap: var(--space-10);
    align-items: end;
    min-height: calc(100dvh - 120px);
    padding: var(--space-20) 0 var(--space-16);
  }

  .hero-copy {
    max-width: 760px;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0 0 var(--space-5);
    font-family: 'IBM Plex Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-orange);
  }

  .eyebrow::before,
  .eyebrow::after {
    color: var(--color-border-strong);
  }

  .eyebrow::before {
    content: '[';
  }

  .eyebrow::after {
    content: ']';
  }

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  h1 {
    max-width: 850px;
    font-size: clamp(2.75rem, 8vw, 6.75rem);
    font-weight: 780;
    line-height: 0.92;
  }

  h2 {
    max-width: 720px;
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    font-weight: 720;
    line-height: 1.1;
  }

  h3 {
    font-size: 1.125rem;
    line-height: 1.35;
  }

  .lead {
    max-width: 690px;
    margin-top: var(--space-6);
    color: var(--color-muted);
    font-size: 1.125rem;
    line-height: 1.65;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-top: var(--space-8);
  }

  .button {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    padding: 0 var(--space-5);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    font-weight: 700;
    transition:
      transform 120ms ease-out,
      border-color 120ms ease-out,
      background 120ms ease-out;
  }

  .button:hover {
    transform: translateY(-1px);
  }

  .button.primary {
    border-color: var(--color-orange);
    background: var(--color-orange);
    color: var(--color-canvas);
  }

  .button.secondary:hover {
    border-color: var(--color-blue);
  }

  .receipt-artifact {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-6);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--color-raised) 88%, transparent);
  }

  .receipt-header,
  .receipt-line,
  .card-label,
  .status-strip,
  .footer {
    font-family: 'IBM Plex Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .receipt-header,
  .receipt-line {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .receipt-header {
    color: var(--color-faint);
    font-size: 0.75rem;
  }

  .receipt-line {
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-layer-2);
    font-size: 0.82rem;
  }

  .receipt-line.accepted span {
    color: var(--color-green);
  }

  .receipt-line.refused span {
    color: var(--color-red);
  }

  .receipt-line.neutral span {
    color: var(--color-amber);
  }

  .receipt-artifact p {
    color: var(--color-muted);
    font-size: 0.92rem;
    line-height: 1.55;
  }

  .section {
    padding: var(--space-20) 0;
    border-top: 1px solid var(--color-border);
  }

  .split {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(320px, 1fr);
    gap: var(--space-10);
    align-items: start;
  }

  .section p {
    max-width: 640px;
    margin-top: var(--space-4);
    color: var(--color-muted);
    line-height: 1.65;
  }

  .section-heading {
    display: grid;
    gap: var(--space-4);
    margin-bottom: var(--space-10);
  }

  .command-rail {
    display: grid;
    gap: var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .command-rail li {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-layer);
  }

  code {
    color: var(--color-blue);
    overflow-wrap: anywhere;
  }

  .command-rail span {
    color: var(--color-muted);
    font-size: 0.92rem;
  }

  .evidence-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: var(--space-4);
  }

  .evidence-grid article {
    grid-column: span 2;
    display: grid;
    gap: var(--space-4);
    min-height: 280px;
    padding: var(--space-6);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-layer);
    transition:
      transform 180ms ease-out,
      border-color 180ms ease-out;
  }

  .evidence-grid article:nth-child(4),
  .evidence-grid article:nth-child(5) {
    grid-column: span 3;
  }

  .evidence-grid article:hover {
    border-color: var(--color-border-strong);
    transform: translateY(-2px);
  }

  .evidence-grid article.accepted {
    border-top-color: var(--color-green);
  }

  .evidence-grid article.refused {
    border-top-color: var(--color-red);
  }

  .card-label {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  .card-label a {
    color: var(--color-blue);
  }

  .evidence-grid p {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.95rem;
  }

  .evidence-grid strong {
    align-self: end;
    color: var(--color-text);
    font-size: 0.92rem;
  }

  .mechanism-list {
    display: grid;
    gap: var(--space-3);
  }

  .mechanism-list div {
    display: grid;
    grid-template-columns: 48px 1fr;
    gap: var(--space-4);
    align-items: start;
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--color-border);
  }

  .mechanism-list span {
    font-family: 'IBM Plex Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: var(--color-orange);
  }

  .mechanism-list p {
    margin: 0;
  }

  .status-section {
    display: grid;
    gap: var(--space-8);
  }

  .status-strip {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .status-strip div {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-layer);
    color: var(--color-muted);
    font-size: 0.82rem;
  }

  .status-strip strong {
    color: var(--color-text);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-faint);
  }

  .dot.accepted {
    background: var(--color-green);
  }

  .dot.neutral {
    background: var(--color-amber);
  }

  .boundary-list {
    display: grid;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .boundary-list li {
    padding: var(--space-4) var(--space-5);
    border-left: 2px solid var(--color-orange);
    background: var(--color-layer);
    color: var(--color-muted);
    line-height: 1.55;
  }

  .footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-10) 0;
    border-top: 1px solid var(--color-border);
    color: var(--color-faint);
    font-size: 0.78rem;
  }

  .footer a {
    color: var(--color-blue);
  }

  @media (max-width: 900px) {
    .hero,
    .split {
      grid-template-columns: 1fr;
    }

    .hero {
      min-height: auto;
      padding-top: var(--space-16);
    }

    .evidence-grid {
      grid-template-columns: 1fr;
    }

    .evidence-grid article,
    .evidence-grid article:nth-child(4),
    .evidence-grid article:nth-child(5) {
      grid-column: span 1;
    }
  }

  @media (max-width: 640px) {
    .shell {
      width: min(100% - 24px, 1180px);
    }

    .topbar {
      align-items: flex-start;
      flex-direction: column;
      justify-content: center;
      min-height: 96px;
    }

    .nav-links {
      width: 100%;
      justify-content: space-between;
      gap: var(--space-2);
    }

    .nav-links a {
      padding-inline: 0;
    }

    .hero-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .button {
      width: 100%;
    }

    .section {
      padding: var(--space-16) 0;
    }

    .hero {
      padding-bottom: 0;
    }

    .receipt-artifact {
      gap: var(--space-2);
      padding: var(--space-5);
    }

    .receipt-artifact p {
      display: none;
    }
  }
</style>
