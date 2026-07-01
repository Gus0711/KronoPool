<script lang="ts">
	import { fly } from 'svelte/transition';
	import { CheckCircle2, AlertCircle } from 'lucide-svelte';
	import { toasts } from '$lib/toast';
</script>

<div class="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
	{#each $toasts as t (t.id)}
		<div
			transition:fly={{ y: 16, duration: 220 }}
			class="pointer-events-auto flex max-w-app items-center gap-2 rounded-cta px-4 py-3 text-[14px] font-semibold text-white shadow-card"
			style="background:{t.kind === 'success' ? '#155e75' : '#b91c1c'}"
			role="status"
		>
			{#if t.kind === 'success'}
				<CheckCircle2 size={18} class="shrink-0" />
			{:else}
				<AlertCircle size={18} class="shrink-0" />
			{/if}
			{t.message}
		</div>
	{/each}
</div>
