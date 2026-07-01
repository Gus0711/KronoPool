<script lang="ts">
	import type { Snippet } from 'svelte';

	// État vide illustré (bouée / nageur / vaguelettes). Trait fin, palette lagon.
	let {
		illus = 'bouee',
		title,
		children
	}: {
		illus?: 'bouee' | 'nageur' | 'vagues';
		title: string;
		children?: Snippet;
	} = $props();
</script>

<div class="mt-14 flex flex-col items-center px-6 text-center">
	<div class="enter-rise mb-4 text-teal/70">
		{#if illus === 'bouee'}
			<!-- Bouée de sauvetage -->
			<svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden="true">
				<circle cx="44" cy="44" r="34" stroke="currentColor" stroke-width="3" />
				<circle cx="44" cy="44" r="16" stroke="currentColor" stroke-width="3" />
				<path
					d="M44 10v18M44 60v18M10 44h18M60 44h18"
					stroke="#e0b676"
					stroke-width="6"
					stroke-linecap="round"
				/>
				<path
					d="M8 66q10-6 20 0t20 0 20 0 12-3"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					opacity="0.5"
				/>
			</svg>
		{:else if illus === 'nageur'}
			<!-- Nageur stylisé -->
			<svg width="96" height="80" viewBox="0 0 96 80" fill="none" aria-hidden="true">
				<circle cx="30" cy="26" r="7" stroke="currentColor" stroke-width="3" />
				<path
					d="M20 40q12-8 26-4l22 6"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
				/>
				<path d="M46 36l14-10" stroke="#e0b676" stroke-width="3" stroke-linecap="round" />
				<path
					d="M6 58q10-7 20 0t20 0 20 0 18-2"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					opacity="0.55"
				/>
				<path
					d="M6 70q10-7 20 0t20 0 20 0 18-2"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					opacity="0.35"
				/>
			</svg>
		{:else}
			<!-- Vaguelettes -->
			<svg width="96" height="64" viewBox="0 0 96 64" fill="none" aria-hidden="true">
				<path
					d="M6 22q10-8 20 0t20 0 20 0 20 0"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
				/>
				<path
					d="M6 40q10-8 20 0t20 0 20 0 20 0"
					stroke="#e0b676"
					stroke-width="3"
					stroke-linecap="round"
					opacity="0.8"
				/>
				<path
					d="M6 58q10-8 20 0t20 0 20 0 20 0"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					opacity="0.5"
				/>
			</svg>
		{/if}
	</div>
	<p class="font-display text-[16px] font-bold text-ink">{title}</p>
	{#if children}
		<p class="mt-1 text-[13.5px] text-muted">{@render children()}</p>
	{/if}
</div>
