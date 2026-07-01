<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Nouveau mot de passe · KronoPool</title></svelte:head>

<div class="min-h-[100dvh] bg-bg">
	<header class="header-lagon">
		<svg class="wave" viewBox="0 0 366 40" preserveAspectRatio="none" aria-hidden="true">
			<path d="M0 20 Q60 4 120 20 T240 20 T366 20 V40 H0 Z" fill="#eaf3f5" />
		</svg>
		<div class="relative py-4">
			<div class="font-display text-[13px] font-bold tracking-[.02em]">KronoPool</div>
			<h1 class="mt-2 font-display text-[24px] font-bold tracking-[-.02em]">
				Choisissez votre mot de passe
			</h1>
			<p class="mt-1 text-[13px] opacity-80">
				Pour votre première connexion, définissez un nouveau mot de passe.
			</p>
		</div>
	</header>

	<div class="relative mx-auto -mt-3 max-w-app px-5">
		<div class="card-lagon">
			{#if form?.error}
				<div
					class="mb-4 rounded-cta border border-danger/20 bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger"
					role="alert"
				>
					{form.error}
				</div>
			{/if}
			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
				class="flex flex-col gap-3"
			>
				<label class="flex flex-col gap-1">
					<span class="text-[13px] font-semibold text-ink">Nouveau mot de passe</span>
					<input class="field" type="password" name="password" autocomplete="new-password" required minlength="8" />
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-[13px] font-semibold text-ink">Confirmation</span>
					<input class="field" type="password" name="confirm" autocomplete="new-password" required minlength="8" />
				</label>
				<button class="cta-sand mt-2" type="submit" disabled={loading}>
					{loading ? 'Validation…' : 'Valider'}
				</button>
			</form>
		</div>
	</div>
</div>
