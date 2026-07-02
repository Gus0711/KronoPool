import { eq } from 'drizzle-orm';
import { db } from '../db';
import { user, type Niveau } from '../db/schema';
import { hashPassword } from '../auth/password';
import { invalidateUserSessions } from '../auth/session';
import { statutValidite, estEnAlerte, type ValiditeInfo } from './diplomes';
import { conformiteEnMasse } from './documents';

export interface IntervenantView {
	id: string;
	nom: string;
	prenom: string;
	email: string;
	telephone: string | null;
	niveau: Niveau | null;
	actif: boolean;
	dateValiditeTitre: string | null;
	dateValiditePse: string | null;
	titre: ValiditeInfo;
	pse: ValiditeInfo;
	enAlerte: boolean;
	/** Nb de documents obligatoires manquants ou expirés (liste admin). */
	docsManquants: number;
}

function toView(u: typeof user.$inferSelect, docsManquants = 0): IntervenantView {
	const titre = statutValidite(u.dateValiditeTitre);
	const pse = statutValidite(u.dateValiditePse);
	return {
		id: u.id,
		nom: u.nom,
		prenom: u.prenom,
		email: u.email,
		telephone: u.telephone,
		niveau: u.niveau,
		actif: u.actif,
		dateValiditeTitre: u.dateValiditeTitre,
		dateValiditePse: u.dateValiditePse,
		titre,
		pse,
		enAlerte: estEnAlerte(titre) || estEnAlerte(pse),
		docsManquants
	};
}

export async function listerIntervenants(): Promise<IntervenantView[]> {
	const rows = await db
		.select()
		.from(user)
		.where(eq(user.role, 'intervenant'))
		.orderBy(user.nom, user.prenom);
	const conformite = await conformiteEnMasse(rows.map((u) => ({ id: u.id, niveau: u.niveau })));
	return rows.map((u) => toView(u, conformite.get(u.id) ?? 0));
}

export async function getIntervenant(id: string): Promise<IntervenantView | null> {
	const u = await db.select().from(user).where(eq(user.id, id)).get();
	if (!u || u.role !== 'intervenant') return null;
	return toView(u);
}

export interface IntervenantInput {
	nom: string;
	prenom: string;
	email: string;
	telephone: string | null;
	niveau: Niveau;
	dateValiditeTitre: string | null;
	dateValiditePse: string | null;
}

/** Crée un intervenant avec mot de passe initial + `must_change_password = true`. */
export async function creerIntervenant(
	data: IntervenantInput,
	motDePasseInitial: string
): Promise<string> {
	const passwordHash = await hashPassword(motDePasseInitial);
	const id = crypto.randomUUID();
	await db.insert(user).values({
		id,
		role: 'intervenant',
		...data,
		passwordHash,
		mustChangePassword: true,
		actif: true
	});
	return id;
}

export async function modifierIntervenant(id: string, data: IntervenantInput): Promise<void> {
	await db
		.update(user)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(user.id, id));
}

/** Active/désactive un compte. Désactivation → sessions existantes invalidées. */
export async function definirActif(id: string, actif: boolean): Promise<void> {
	await db.update(user).set({ actif, updatedAt: new Date() }).where(eq(user.id, id));
	if (!actif) await invalidateUserSessions(id);
}

/** Réinitialise le mot de passe : nouveau hash + forçage du changement + purge sessions. */
export async function reinitialiserMotDePasse(id: string, nouveau: string): Promise<void> {
	const passwordHash = await hashPassword(nouveau);
	await db
		.update(user)
		.set({ passwordHash, mustChangePassword: true, updatedAt: new Date() })
		.where(eq(user.id, id));
	await invalidateUserSessions(id);
}
