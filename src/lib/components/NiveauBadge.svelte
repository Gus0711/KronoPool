<script lang="ts">
	import type { Niveau } from '$lib/server/db/schema';
	let { niveau }: { niveau: Niveau } = $props();
</script>

{#if niveau === 'MNS'}
	<span class="badge-mns">MNS</span>
{:else}
	<span class="badge-bnssa">BNSSA</span>
{/if}
