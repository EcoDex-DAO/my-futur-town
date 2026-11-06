# Améliorations futures de la page principale

Ce dossier rassemble les actions proposées après l’analyse Impeccable du 6 novembre 2026. Il sert de point de départ pour créer des issues GitHub et planifier les changements ; aucune amélioration n’est implémentée par ce document.

L’analyse initiale repose sur le code et un détecteur automatique. Les deux évaluations indépendantes et l’inspection visuelle n’ont pas pu être réalisées. Les constats de rendu, de contraste effectif, de navigation clavier et de comportement mobile doivent être confirmés sur l’application réelle avant de retenir une solution.

## P1 — Protéger le travail sur les scénarios

### Confirmer la suppression d’un scénario

- [ ] Afficher une confirmation explicite qui nomme le scénario et explique la conséquence de sa suppression.
- [ ] Permettre l’annulation avant la suppression ; étudier une restauration si elle est compatible avec le modèle de données.
- [ ] Vérifier la suppression, l’annulation, les erreurs et l’utilisation au clavier.

Point de départ : [`src/RoadEditor.tsx`](../../src/RoadEditor.tsx), action « Supprimer ce scénario ».

### Prévenir la perte de modifications non enregistrées

- [ ] Indiquer clairement quand un profil contient des modifications non enregistrées.
- [ ] Avant un changement de tronçon ou de scénario susceptible de les remplacer, proposer **Enregistrer**, **Abandonner** ou **Rester**.
- [ ] Étudier les autres sorties du parcours, notamment rechargement et navigation, sans promettre une sauvegarde automatique non implémentée.
- [ ] Vérifier chaque choix, les erreurs d’enregistrement et la conservation de la référence.

Points de départ : [`src/RoadEditor.tsx`](../../src/RoadEditor.tsx) et [`src/main.tsx`](../../src/main.tsx).

## P1 — Améliorer la lisibilité et l’accessibilité

- [ ] Revoir les textes d’aide et libellés actuellement très petits, ainsi que les contrastes du texte avec les fonds réellement affichés.
- [ ] Vérifier les états de focus, la navigation au clavier et les annonces des états et erreurs.
- [ ] Vérifier l’accès aux informations d’un bâtiment sans souris et proposer une alternative si nécessaire ; la liste de tronçons ne couvre que la voirie.
- [ ] Tester à 200 % de zoom, sur ordinateur et mobile, avec un lecteur d’écran lorsque possible.

Point de départ : [`src/style.css`](../../src/style.css). L’analyse statique a mesuré environ 3,25:1 pour la couleur `.caption` sur le fond CSS déclaré ; ce chiffre reste à vérifier dans les contextes réellement rendus.

## P2 — Simplifier le mobile et le parcours

- [ ] Observer la place disponible pour la carte et les commandes aux tailles mobiles usuelles.
- [ ] Évaluer un panneau déployable pour limiter les défilements imbriqués, sans masquer l’accès aux couches ou à l’éditeur.
- [ ] Clarifier les étapes : choisir une rue, créer ou ouvrir un scénario, modifier, puis enregistrer.
- [ ] Rendre les termes et erreurs compréhensibles ; déplacer les identifiants techniques et informations de projection dans un détail à la demande.
- [ ] Tester les états sans API, sans configuration Supabase, sans données importées et avec une connexion lente ou interrompue.

## Préparer la reprise

1. Créer une issue par changement livrable en reprenant le besoin, les critères et les dépendances ci-dessus. Relier les issues entre elles si nécessaire.
2. Confirmer les observations par une revue visuelle et des essais clavier/tactile avant de décider d’une refonte.
3. Pour un changement important, utiliser le flux Spec Kit décrit dans [`docs/workflow.md`](../workflow.md) ; pour une correction limitée, suivre le flux direct issue → branche → pull request.
4. Vérifier les changements avec les tests adaptés, `pnpm test` et `pnpm run build`. Pour la carte, contrôler bureau/mobile, sélection, couches et fonctionnement sans API. Signaler les contrôles non réalisés dans la pull request.
5. Préserver l’attribution des données, la séparation entre référence et scénarios, ainsi que les politiques de propriété. Toute migration doit être validée localement et faire l’objet d’une revue autorisée avant application distante.

Le rapport initial détaillé est conservé dans [l’archive Impeccable](../../.impeccable/critique/2026-11-06T20-01-46Z__src-app-page-tsx.md). Son score est une estimation provisoire, pas un audit de conformité.
