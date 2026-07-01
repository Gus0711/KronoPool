<script lang="ts">
	// Jauge « bassin » : un disque qui se remplit d'eau animée, le total d'heures
	// mis en avant dessous. `ratio` (0..1) = niveau de remplissage ; par défaut un
	// niveau décoratif agréable. Purement visuel, aucune donnée métier modifiée.
	let {
		value,
		label = 'Total sur la période',
		ratio
	}: {
		value: string;
		label?: string;
		ratio?: number;
	} = $props();

	const pct = $derived(Math.round(Math.max(0.12, Math.min(1, ratio ?? 0.58)) * 100));

	const WAVE = 'M0,6 Q30,0 60,6 T120,6 T180,6 T240,6 V40 H0 Z';
</script>

<div class="flex flex-col items-center">
	<div class="basin" role="img" aria-label="{value} au total">
		<div class="water" style="height:{pct}%">
			<svg class="basin-wave" viewBox="0 0 120 40" preserveAspectRatio="none">
				<path class="w1" d={WAVE} />
				<path class="w2" d={WAVE} />
			</svg>
		</div>
		<svg class="drop" width="26" height="30" viewBox="0 0 26 30" fill="none" aria-hidden="true">
			<path
				d="M13 2C13 2 3 13 3 20a10 10 0 0020 0C23 13 13 2 13 2Z"
				stroke="currentColor"
				stroke-width="2.2"
				stroke-linejoin="round"
			/>
		</svg>
	</div>
	<div class="mt-3 font-display text-[40px] font-bold leading-none text-teal">{value}</div>
	<div class="mt-1 text-[13px] font-medium text-muted">{label}</div>
</div>

<style>
	.basin {
		position: relative;
		width: 128px;
		height: 128px;
		border-radius: 9999px;
		overflow: hidden;
		background: #fff;
		border: 3px solid #155e75;
		box-shadow: inset 0 2px 10px rgba(11, 42, 51, 0.12);
	}
	.water {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(180deg, #1d7d9c 0%, #155e75 60%, #0c4a5e 100%);
		transition: height 0.9s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.basin-wave {
		position: absolute;
		left: 0;
		top: -11px;
		width: 200%;
		height: 16px;
	}
	.basin-wave .w1 {
		fill: #1d7d9c;
		animation: wave-drift 6s linear infinite;
	}
	.basin-wave .w2 {
		fill: rgba(255, 255, 255, 0.25);
		animation: wave-drift 4s linear infinite reverse;
	}
	.drop {
		position: absolute;
		top: 18px;
		left: 50%;
		transform: translateX(-50%);
		color: #9db4b9;
	}
	@media (prefers-reduced-motion: reduce) {
		.basin-wave .w1,
		.basin-wave .w2 {
			animation: none;
		}
		.water {
			transition: none;
		}
	}
</style>
