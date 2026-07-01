<script lang="ts">
	import { formatDateCourt } from '$lib/format';
	import type { StatutValidite } from '$lib/server/services/diplomes';

	let {
		date,
		statut,
		joursRestants = null
	}: {
		date: string | null;
		statut: StatutValidite;
		joursRestants?: number | null;
	} = $props();

	const styles: Record<StatutValidite, string> = {
		absent: 'bg-black/5 text-muted',
		expire: 'bg-danger-bg text-danger',
		bientot: 'bg-warn-bg text-warn',
		ok: 'bg-bnssa-bg text-teal'
	};
</script>

<span class="rounded-pill px-2.5 py-1 text-[12px] font-semibold {styles[statut]}">
	{#if statut === 'absent'}
		Non renseigné
	{:else if statut === 'expire'}
		Expiré le {formatDateCourt(date!)}
	{:else if statut === 'bientot'}
		Expire le {formatDateCourt(date!)} ({joursRestants} j)
	{:else}
		Valide jusqu'au {formatDateCourt(date!)}
	{/if}
</span>
