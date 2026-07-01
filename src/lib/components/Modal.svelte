<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { X } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	// Modale mobile-first : feuille qui remonte du bas sur mobile, carte centrée
	// sur grand écran. Fermeture par la croix, le fond ou Échap.
	let {
		open = $bindable(false),
		title,
		onClose,
		children,
		footer
	}: {
		open?: boolean;
		title: string;
		onClose?: () => void;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	function close() {
		open = false;
		onClose?.();
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') close();
	}}
/>

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
		<button
			type="button"
			class="absolute inset-0 bg-ink/50 backdrop-blur-[1px]"
			transition:fade={{ duration: 160 }}
			onclick={close}
			aria-label="Fermer"
		></button>

		<div
			class="relative w-full max-w-app overflow-hidden rounded-t-[22px] bg-white shadow-2xl sm:m-4 sm:rounded-[22px]"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			transition:fly={{ y: 300, duration: 260 }}
		>
			<!-- Poignée façon feuille mobile -->
			<div class="flex justify-center pt-2.5 sm:hidden">
				<span class="h-1.5 w-10 rounded-full bg-card-border"></span>
			</div>

			<div class="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
				<h2 class="font-display text-[19px] font-bold text-ink">{title}</h2>
				<button
					type="button"
					class="-mr-1 -mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-bg"
					onclick={close}
					aria-label="Fermer"
				>
					<X size={20} />
				</button>
			</div>

			<div class="px-5 pb-4">
				{@render children()}
			</div>

			{#if footer}
				<div class="flex flex-col gap-2 border-t border-card-border bg-bg/40 px-5 pb-[22px] pt-4">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
