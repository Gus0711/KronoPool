<script lang="ts">
	// « Ligne d'eau » animée en bas de l'en-tête lagon : deux couches de vagues
	// qui glissent en sens opposés pour un effet de profondeur. Le motif se répète
	// tous les 360 u sur 1440 u de viewBox → translation de -50 % parfaitement bouclée.
	// `fill` = couleur du fond de page (crée la découpe de la vague de premier plan).
	let { fill = '#eaf3f5' }: { fill?: string } = $props();

	const D = 'M0,20 Q90,8 180,20 T360,20 T540,20 T720,20 T900,20 T1080,20 T1260,20 T1440,20 V40 H0 Z';
	const D_BACK =
		'M0,16 Q90,28 180,16 T360,16 T540,16 T720,16 T900,16 T1080,16 T1260,16 T1440,16 V40 H0 Z';
</script>

<div class="wave-band" aria-hidden="true">
	<svg class="wave-layer wave-back" viewBox="0 0 1440 40" preserveAspectRatio="none">
		<path d={D_BACK} fill="rgba(255,255,255,0.12)" />
	</svg>
	<svg class="wave-layer wave-front" viewBox="0 0 1440 40" preserveAspectRatio="none">
		<path d={D} {fill} />
	</svg>
</div>

<style>
	.wave-band {
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 34px;
		overflow: hidden;
	}
</style>
