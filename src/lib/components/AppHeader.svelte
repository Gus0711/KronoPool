<script lang="ts">
	import type { Snippet } from 'svelte';
	import { initiales } from '$lib/format';

	let {
		prenom,
		nom = '',
		title = '',
		children
	}: {
		prenom: string;
		nom?: string;
		title?: string;
		children?: Snippet;
	} = $props();
</script>

<header class="header-lagon">
	<svg class="wave" viewBox="0 0 366 40" preserveAspectRatio="none" aria-hidden="true">
		<path d="M0 20 Q60 4 120 20 T240 20 T366 20 V40 H0 Z" fill="#eaf3f5" />
	</svg>

	<div class="relative flex items-center justify-between">
		<div>
			<div class="font-display text-[13px] font-bold tracking-[.02em]">KronoPool</div>
			<div class="mt-px text-[12.5px] font-medium opacity-80">Bonjour {prenom}</div>
		</div>
		<div
			class="flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-bold"
			style="background:rgba(224,182,118,.22);border:1.5px solid #e0b676;color:#f2d9ac"
		>
			{initiales(prenom, nom)}
		</div>
	</div>

	{#if title}
		<h1 class="relative mt-2 font-display text-[27px] font-bold tracking-[-.02em]">{title}</h1>
	{/if}

	{#if children}
		<div class="relative mt-4">{@render children()}</div>
	{/if}
</header>
