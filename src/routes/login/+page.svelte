<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Connexion · KronoPool</title></svelte:head>

<div class="min-h-[100dvh] bg-bg">
	<div class="header-lagon">
		<svg class="wave" viewBox="0 0 366 40" preserveAspectRatio="none" aria-hidden="true">
			<path d="M0 20 Q60 4 120 20 T240 20 T366 20 V40 H0 Z" fill="#eaf3f5" />
		</svg>
		<div class="relative py-8 text-center">
			<div class="font-display text-[24px] font-bold tracking-[.02em]">KronoPool</div>
			<div class="mt-1 text-[13px] opacity-80">Gestion des plannings de piscine</div>
		</div>
	</div>

	<div class="relative mx-auto -mt-3 max-w-app px-5">
		<div class="card-lagon">
			<h1 class="mb-1 font-display text-[20px] font-bold">Connexion</h1>
			<p class="mb-4 text-[13px] text-muted">Accédez à votre espace.</p>

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
					<span class="text-[13px] font-semibold text-ink">Email</span>
					<input
						class="field"
						type="email"
						name="email"
						autocomplete="username"
						required
						value={form && 'email' in form ? form.email : ''}
						placeholder="vous@exemple.fr"
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-[13px] font-semibold text-ink">Mot de passe</span>
					<input
						class="field"
						type="password"
						name="password"
						autocomplete="current-password"
						required
						placeholder="••••••••"
					/>
				</label>
				<button class="cta-sand mt-2" type="submit" disabled={loading}>
					{loading ? 'Connexion…' : 'Se connecter'}
				</button>
			</form>
		</div>
	</div>
</div>
