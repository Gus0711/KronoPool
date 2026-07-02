// Types PWA : module virtuel @vite-pwa + API d'installation (non typée par le DOM lib).

declare module 'virtual:pwa-register' {
	export interface RegisterSWOptions {
		immediate?: boolean;
		onNeedRefresh?: () => void;
		onOfflineReady?: () => void;
		onRegisteredSW?: (
			swScriptUrl: string,
			registration: ServiceWorkerRegistration | undefined
		) => void;
		onRegisterError?: (error: unknown) => void;
	}
	export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}

/** Événement Chromium/Android déclenché quand l'app est installable. */
interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
	prompt(): Promise<void>;
}

interface WindowEventMap {
	beforeinstallprompt: BeforeInstallPromptEvent;
	appinstalled: Event;
}

interface Navigator {
	/** iOS Safari : `true` quand l'app est lancée depuis l'écran d'accueil. */
	standalone?: boolean;
}
