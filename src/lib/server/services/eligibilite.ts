import type { Niveau } from '../db/schema';

/**
 * Éligibilité par niveau (CDC §4.1 — règle critique).
 *
 * Un **MNS est aussi BNSSA**. Donc :
 * - poste **BNSSA** → réservable par BNSSA **ou** MNS ;
 * - poste **MNS** → **uniquement** MNS.
 *
 * Corollaire d'affichage : un intervenant ne voit **que** les postes de niveau
 * inclus dans {@link niveauxVisibles} (un BNSSA ne voit jamais les postes MNS).
 */

/** Niveaux de poste visibles/réservables par un intervenant de ce niveau. */
export function niveauxVisibles(niveau: Niveau | null): Niveau[] {
	if (niveau === 'MNS') return ['MNS', 'BNSSA'];
	if (niveau === 'BNSSA') return ['BNSSA'];
	return [];
}

/** Un intervenant de `niveauUser` peut-il prendre un poste `niveauPoste` ? */
export function estEligible(niveauUser: Niveau | null, niveauPoste: Niveau): boolean {
	return niveauxVisibles(niveauUser).includes(niveauPoste);
}
