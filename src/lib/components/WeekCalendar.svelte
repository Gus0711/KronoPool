<script lang="ts">
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import {
		isoDate,
		parseISO,
		addDays,
		startOfWeekMonday,
		minutesOf,
		moisAnnee,
		jourCourt,
		agencerJournee
	} from '$lib/calendar';
	import type { BesoinResume, StatutBesoin } from '$lib/server/services/besoins';

	let { besoins }: { besoins: BesoinResume[] } = $props();

	const PX_PAR_HEURE = 48;
	const todayISO = isoDate(new Date());

	// Semaine affichée : par défaut celle du 1er besoin à venir, sinon aujourd'hui.
	const semaineInitiale = () => {
		const ref = besoins.find((b) => b.statut !== 'passe') ?? besoins[0];
		return startOfWeekMonday(ref ? parseISO(ref.date) : new Date());
	};
	let lundi = $state(semaineInitiale());

	const jours = $derived(Array.from({ length: 7 }, (_, i) => addDays(lundi, i)));
	const debutISO = $derived(isoDate(jours[0]));
	const finISO = $derived(isoDate(jours[6]));

	// Besoins de la semaine, indexés par jour + convertis en minutes.
	type Ev = BesoinResume & { startMin: number; endMin: number };
	const parJour = $derived.by(() => {
		const map = new Map<string, Ev[]>();
		for (const b of besoins) {
			if (b.date < debutISO || b.date > finISO) continue;
			const ev: Ev = { ...b, startMin: minutesOf(b.heureDebut), endMin: minutesOf(b.heureFin) };
			(map.get(b.date) ?? map.set(b.date, []).get(b.date)!).push(ev);
		}
		return map;
	});

	// Plage horaire visible, dérivée des événements (défaut 8h–19h).
	const plage = $derived.by(() => {
		let min = 8 * 60;
		let max = 19 * 60;
		for (const evs of parJour.values()) {
			for (const e of evs) {
				min = Math.min(min, e.startMin);
				max = Math.max(max, e.endMin);
			}
		}
		const startH = Math.floor(min / 60);
		const endH = Math.ceil(max / 60);
		return { startH, endH };
	});
	const heures = $derived(
		Array.from({ length: plage.endH - plage.startH }, (_, i) => plage.startH + i)
	);
	const hauteur = $derived((plage.endH - plage.startH) * PX_PAR_HEURE);

	// Feu tricolore : à pourvoir (ambre) · complet (vert) · passé (gris).
	const couleur: Record<StatutBesoin, string> = {
		avenir: 'bg-warn-bg text-warn border-warn',
		complet: 'bg-success-bg text-success border-success',
		passe: 'bg-black/[.04] text-muted border-nav-inactive'
	};

	function topPx(startMin: number): number {
		return ((startMin - plage.startH * 60) / 60) * PX_PAR_HEURE;
	}
	function hauteurPx(startMin: number, endMin: number): number {
		return Math.max(22, ((endMin - startMin) / 60) * PX_PAR_HEURE);
	}

	function hhmm(min: number): string {
		const h = Math.floor(min / 60);
		const m = min % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	// Clic sur une zone libre de la grille → création pré-remplie (façon Google Agenda).
	// L'heure est déduite de la position verticale du clic, arrondie à 30 min, +1h par défaut.
	function creerSurCreneau(e: MouseEvent, jour: Date) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const y = e.clientY - rect.top;
		const brut = plage.startH * 60 + (y / PX_PAR_HEURE) * 60;
		const arrondi = Math.round(brut / 30) * 30;
		const maxDebut = plage.endH * 60 - 60;
		const debut = Math.min(Math.max(arrondi, plage.startH * 60), maxDebut);
		const params = new URLSearchParams({
			date: isoDate(jour),
			debut: hhmm(debut),
			fin: hhmm(debut + 60)
		});
		goto(`/besoins/nouveau?${params.toString()}`);
	}

	function semainePrec() {
		lundi = addDays(lundi, -7);
	}
	function semaineSuiv() {
		lundi = addDays(lundi, 7);
	}
	function aujourdhui() {
		lundi = startOfWeekMonday(new Date());
	}
</script>

<!-- Barre de navigation -->
<div class="mb-4 flex flex-wrap items-center gap-3">
	<div class="flex items-center gap-1">
		<button
			class="rounded-cta border border-card-border bg-white p-2 text-ink transition hover:bg-bg"
			onclick={semainePrec}
			aria-label="Semaine précédente"
		>
			<ChevronLeft size={18} />
		</button>
		<button
			class="rounded-cta border border-card-border bg-white p-2 text-ink transition hover:bg-bg"
			onclick={semaineSuiv}
			aria-label="Semaine suivante"
		>
			<ChevronRight size={18} />
		</button>
	</div>
	<button
		class="rounded-cta border border-card-border bg-white px-3 py-2 text-[13px] font-semibold text-ink transition hover:bg-bg"
		onclick={aujourdhui}
	>
		Aujourd'hui
	</button>
	<span class="font-display text-[18px] font-bold text-ink">{moisAnnee(jours[0])}</span>
</div>

<!-- Calendrier -->
<div class="overflow-x-auto rounded-card border border-card-border bg-white">
	<div class="min-w-[720px]">
		<!-- En-tête des jours -->
		<div class="flex border-b border-card-border">
			<div class="w-14 shrink-0"></div>
			{#each jours as jour (isoDate(jour))}
				{@const estToday = isoDate(jour) === todayISO}
				<div class="flex-1 border-l border-card-border px-2 py-2 text-center">
					<div class="text-[11px] font-semibold uppercase tracking-wide text-muted">
						{jourCourt(jour)}
					</div>
					<div
						class="mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full font-display text-[15px] font-bold {estToday
							? 'bg-teal text-white'
							: 'text-ink'}"
					>
						{jour.getDate()}
					</div>
				</div>
			{/each}
		</div>

		<!-- Grille horaire -->
		<div class="flex" style="height:{hauteur}px">
			<!-- Gouttière des heures -->
			<div class="relative w-14 shrink-0">
				{#each heures as h (h)}
					<div class="relative" style="height:{PX_PAR_HEURE}px">
						<span class="absolute -top-2 right-1.5 text-[11px] text-muted">{h}:00</span>
					</div>
				{/each}
			</div>

			<!-- Colonnes des jours -->
			{#each jours as jour (isoDate(jour))}
				{@const evs = agencerJournee(parJour.get(isoDate(jour)) ?? [])}
				{@const estToday = isoDate(jour) === todayISO}
				<div class="relative flex-1 border-l border-card-border {estToday ? 'bg-bnssa-bg/30' : ''}">
					<!-- Lignes des heures -->
					{#each heures as h (h)}
						<div class="border-t border-card-border/70" style="height:{PX_PAR_HEURE}px"></div>
					{/each}

					<!-- Zone cliquable de fond : crée un besoin pré-rempli au créneau cliqué -->
					<button
						type="button"
						class="absolute inset-0 h-full w-full cursor-copy"
						onclick={(e) => creerSurCreneau(e, jour)}
						aria-label="Créer un besoin le {isoDate(jour)}"
					></button>

					<!-- Événements -->
					{#each evs as ev (ev.id)}
						<a
							href="/besoins/{ev.id}"
							class="absolute overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left shadow-sm transition hover:z-10 hover:shadow-md {couleur[ev.statut]}"
							style="top:{topPx(ev.startMin)}px; height:{hauteurPx(ev.startMin, ev.endMin)}px; left:calc({(ev.col /
								ev.cols) *
								100}% + 2px); width:calc({100 / ev.cols}% - 4px)"
						>
							<div class="text-[11px] font-bold leading-tight">
								{ev.heureDebut}–{ev.heureFin}
							</div>
							{#if ev.commentaire}
								<div class="truncate text-[11px] leading-tight opacity-90">{ev.commentaire}</div>
							{/if}
							<div class="text-[10px] font-semibold opacity-80">{ev.pourvus}/{ev.total} pourvus</div>
						</a>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Légende -->
<div class="mt-4 flex flex-wrap items-center gap-4 text-[12px] text-muted">
	<span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded-sm border-l-4 border-warn bg-warn-bg"></span> À venir (à pourvoir)</span>
	<span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded-sm border-l-4 border-success bg-success-bg"></span> Complet</span>
	<span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded-sm border-l-4 border-nav-inactive bg-black/[.04]"></span> Passé</span>
</div>
