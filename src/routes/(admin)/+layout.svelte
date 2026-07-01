<script lang="ts">
	import { page } from '$app/stores';
	import { initiales } from '$lib/format';
	import { fly, fade } from 'svelte/transition';
	import {
		LayoutDashboard,
		CalendarClock,
		Users,
		BarChart3,
		CalendarRange,
		UserCircle,
		LogOut,
		Menu,
		X
	} from 'lucide-svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	let menuOpen = $state(false);

	const links = [
		{ href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
		{ href: '/besoins', label: 'Besoins', icon: CalendarClock },
		{ href: '/intervenants', label: 'Intervenants', icon: Users },
		{ href: '/recap', label: "Récap d'heures", icon: BarChart3 },
		{ href: '/planning', label: 'Planning', icon: CalendarRange }
	];

	function isActive(href: string, path: string): boolean {
		return path === href || path.startsWith(href + '/');
	}

	// Ferme le tiroir à chaque changement de page.
	$effect(() => {
		$page.url.pathname;
		menuOpen = false;
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') menuOpen = false;
	}}
/>

<div class="flex min-h-[100dvh] bg-bg">
	<!-- Sidebar desktop -->
	<aside class="hidden w-60 shrink-0 flex-col bg-lagon p-4 text-white md:flex">
		<div class="px-2 py-3 font-display text-[18px] font-bold tracking-[.02em]">KronoPool</div>
		<nav class="mt-4 flex flex-col gap-1">
			{#each links as l (l.href)}
				{@const active = isActive(l.href, $page.url.pathname)}
				<a
					href={l.href}
					class="flex items-center gap-3 rounded-cta px-3 py-2 text-[14px] font-semibold transition {active
						? 'bg-white/15'
						: 'text-white/80 hover:bg-white/10'}"
				>
					<l.icon size={18} />
					{l.label}
				</a>
			{/each}
		</nav>
		<div class="mt-auto border-t border-white/15 pt-3">
			<a href="/compte" class="flex items-center gap-2 rounded-cta px-3 py-2 text-[13px] hover:bg-white/10">
				<UserCircle size={18} />
				<span class="truncate">{data.user.prenom} {data.user.nom}</span>
			</a>
			<a href="/deconnexion" data-sveltekit-reload class="flex items-center gap-2 rounded-cta px-3 py-2 text-[13px] text-white/80 hover:bg-white/10">
				<LogOut size={18} /> Se déconnecter
			</a>
		</div>
	</aside>

	<!-- Zone principale -->
	<div class="flex min-w-0 flex-1 flex-col">
		<!-- Top bar mobile : hamburger + titre + accès compte -->
		<header class="flex items-center gap-3 bg-lagon px-4 py-3 text-white md:hidden">
			<button
				type="button"
				class="-ml-1 flex h-9 w-9 items-center justify-center rounded-cta hover:bg-white/10"
				onclick={() => (menuOpen = true)}
				aria-label="Ouvrir le menu"
				aria-expanded={menuOpen}
			>
				<Menu size={22} />
			</button>
			<span class="font-display text-[16px] font-bold">KronoPool</span>
			<a
				href="/compte"
				class="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[12px] font-bold"
				aria-label="Mon compte"
			>
				{initiales(data.user.prenom, data.user.nom)}
			</a>
		</header>

		<!-- Tiroir mobile -->
		{#if menuOpen}
			<div class="fixed inset-0 z-40 md:hidden">
				<button
					type="button"
					class="absolute inset-0 bg-black/40"
					onclick={() => (menuOpen = false)}
					aria-label="Fermer le menu"
					transition:fade={{ duration: 150 }}
				></button>
				<aside
					class="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-lagon p-4 text-white shadow-xl"
					transition:fly={{ x: -300, duration: 200 }}
				>
					<div class="flex items-center justify-between px-2 py-1">
						<span class="font-display text-[18px] font-bold tracking-[.02em]">KronoPool</span>
						<button
							type="button"
							class="flex h-9 w-9 items-center justify-center rounded-cta hover:bg-white/10"
							onclick={() => (menuOpen = false)}
							aria-label="Fermer le menu"
						>
							<X size={20} />
						</button>
					</div>
					<nav class="mt-4 flex flex-col gap-1">
						{#each links as l (l.href)}
							{@const active = isActive(l.href, $page.url.pathname)}
							<a
								href={l.href}
								class="flex items-center gap-3 rounded-cta px-3 py-2.5 text-[15px] font-semibold transition {active
									? 'bg-white/15'
									: 'text-white/80 hover:bg-white/10'}"
							>
								<l.icon size={20} />
								{l.label}
							</a>
						{/each}
					</nav>
					<div class="mt-auto border-t border-white/15 pt-3">
						<a href="/compte" class="flex items-center gap-3 rounded-cta px-3 py-2.5 text-[14px] hover:bg-white/10">
							<UserCircle size={20} />
							<span class="truncate">{data.user.prenom} {data.user.nom}</span>
						</a>
						<a href="/deconnexion" data-sveltekit-reload class="flex items-center gap-3 rounded-cta px-3 py-2.5 text-[14px] text-white/80 hover:bg-white/10">
							<LogOut size={20} /> Se déconnecter
						</a>
					</div>
				</aside>
			</div>
		{/if}

		<main class="mx-auto w-full max-w-5xl flex-1 p-5 md:p-8">
			{@render children()}
		</main>
	</div>
</div>
