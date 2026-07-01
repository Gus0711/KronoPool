<script lang="ts">
	import { fade } from 'svelte/transition';
	import { toasts } from '$lib/toast';
</script>

<div class="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
	{#each $toasts as t (t.id)}
		<div
			transition:fade={{ duration: 150 }}
			class="pointer-events-auto max-w-app rounded-cta px-4 py-3 text-[14px] font-semibold text-white shadow-card"
			style="background:{t.kind === 'success' ? '#155e75' : '#b91c1c'}"
			role="status"
		>
			{t.message}
		</div>
	{/each}
</div>
