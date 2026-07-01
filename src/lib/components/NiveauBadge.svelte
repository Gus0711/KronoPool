<script lang="ts">
	import type { Niveau } from '$lib/server/db/schema';
	import { Waves, ShieldCheck } from 'lucide-svelte';
	let { niveau }: { niveau: Niveau } = $props();
</script>

{#if niveau === 'MNS'}
	<span class="badge-mns"><ShieldCheck size={12} strokeWidth={2.4} />MNS</span>
{:else}
	<span class="badge-bnssa"><Waves size={12} strokeWidth={2.4} />BNSSA</span>
{/if}
