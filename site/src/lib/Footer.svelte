<script lang="ts">
  import { site } from '$lib/site';
</script>

<footer class="footer">
  <p>MIT. Version 0.0.1. Small until the receipts demand otherwise.</p>
  <a href={site.repository}>github.com/acoyfellow/keel</a>
</footer>

<style>
  .footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-10) 0 var(--space-16);
    border-top: 1px solid var(--color-border);
    font-family: 'IBM Plex Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.78rem;
    color: var(--color-muted);
  }
</style>
