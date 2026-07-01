<script lang="ts">
	import { page } from '$app/stores';
	import { Calendar, Bookmark, Clock, User } from 'lucide-svelte';

	const items = [
		{ href: '/creneaux', label: 'Créneaux', icon: Calendar },
		{ href: '/mes-reservations', label: 'Réservations', icon: Bookmark },
		{ href: '/mon-recap', label: 'Récap', icon: Clock },
		{ href: '/compte', label: 'Compte', icon: User }
	];

	function isActive(href: string, path: string): boolean {
		return path === href || path.startsWith(href + '/');
	}
</script>

<nav
	class="sticky bottom-0 z-10 flex items-center justify-around bg-white px-2 pb-[22px] pt-[10px] shadow-nav"
>
	{#each items as item (item.href)}
		{@const active = isActive(item.href, $page.url.pathname)}
		<a
			href={item.href}
			class="flex flex-1 flex-col items-center gap-1 text-[10px] font-semibold"
			style="color:{active ? '#155e75' : '#9db4b9'}"
			aria-current={active ? 'page' : undefined}
		>
			<item.icon size={21} strokeWidth={1.9} />
			{item.label}
		</a>
	{/each}
</nav>
