<script lang="ts">
	import { page } from '$app/stores';
	import { initiales } from '$lib/format';
	import {
		LayoutDashboard,
		CalendarClock,
		Users,
		BarChart3,
		CalendarRange,
		UserCircle,
		LogOut
	} from 'lucide-svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

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
</script>

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
		<!-- Top bar mobile -->
		<header class="flex items-center gap-3 bg-lagon px-4 py-3 text-white md:hidden">
			<span class="font-display text-[16px] font-bold">KronoPool</span>
			<div class="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[12px] font-bold">
				{initiales(data.user.prenom, data.user.nom)}
			</div>
		</header>
		<nav class="flex gap-1 overflow-x-auto border-b border-card-border bg-white px-3 py-2 md:hidden">
			{#each links as l (l.href)}
				{@const active = isActive(l.href, $page.url.pathname)}
				<a
					href={l.href}
					class="whitespace-nowrap rounded-pill px-3 py-1.5 text-[13px] font-semibold {active
						? 'bg-teal text-white'
						: 'text-muted'}"
				>
					{l.label}
				</a>
			{/each}
		</nav>

		<main class="mx-auto w-full max-w-5xl flex-1 p-5 md:p-8">
			{@render children()}
		</main>
	</div>
</div>
