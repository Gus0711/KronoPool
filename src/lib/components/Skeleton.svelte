<script lang="ts">
	// Bloc squelette avec reflet d'eau (shimmer). Utiliser pendant les chargements.
	let {
		w = '100%',
		h = '1rem',
		rounded = 'rounded-cta',
		class: cls = ''
	}: { w?: string; h?: string; rounded?: string; class?: string } = $props();
</script>

<div class="skeleton {rounded} {cls}" style="width:{w};height:{h}"></div>
