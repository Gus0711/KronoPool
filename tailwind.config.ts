import type { Config } from 'tailwindcss';

/**
 * Design system « 2a Lagon » — tokens définitifs (cf. docs/handoff/README.md).
 * Ne pas modifier les hex sans revalider la maquette hifi.
 */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// Fonds
				bg: '#eaf3f5', // fond général de l'app
				// Teal marque + dégradé en-tête
				teal: {
					DEFAULT: '#155e75', // teal marque
					dark: '#0c4a5e',
					darker: '#082f3b'
				},
				// Texte
				ink: '#0b2a33', // texte principal
				muted: '#5a747b', // texte secondaire
				// Accent sable (CTA)
				sand: {
					DEFAULT: '#e0b676',
					ink: '#3a2a10', // texte sur sable
					dark: '#b8862f' // alerte / bientôt expiré
				},
				// Cartes
				card: {
					DEFAULT: '#ffffff',
					border: '#d7e6e9'
				},
				// Badges niveau
				bnssa: {
					bg: '#dceef1',
					text: '#155e75'
				},
				mns: {
					bg: '#e0b676',
					text: '#0b2a33'
				},
				// Navigation
				nav: {
					inactive: '#9db4b9'
				},
				// Sémantique
				danger: {
					DEFAULT: '#b91c1c',
					bg: '#fee2e2'
				},
				warn: {
					DEFAULT: '#b8862f',
					bg: '#fdf1dd'
				}
			},
			fontFamily: {
				display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
				body: ['Figtree', 'system-ui', 'sans-serif']
			},
			borderRadius: {
				card: '16px',
				cta: '12px',
				pill: '20px'
			},
			boxShadow: {
				card: '0 6px 18px -12px rgba(11,42,51,.4)',
				cta: '0 6px 16px -8px rgba(224,182,118,.9)',
				nav: '0 -6px 20px -10px rgba(11,42,51,.3)'
			},
			backgroundImage: {
				lagon: 'linear-gradient(155deg,#155e75 0%,#0c4a5e 55%,#082f3b 100%)'
			},
			maxWidth: {
				app: '480px' // colonne centrée espace intervenant
			}
		}
	},
	plugins: []
} satisfies Config;
