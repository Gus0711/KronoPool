<script lang="ts">
	import BottomNav from '$lib/components/BottomNav.svelte';
	let { children } = $props();
</script>

<div class="mx-auto flex min-h-[100dvh] max-w-app flex-col bg-bg">
	<div class="flex flex-1 flex-col">{@render children()}</div>
	<BottomNav />
</div>
