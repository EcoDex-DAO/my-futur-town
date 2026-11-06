# Versions, développement et retours arrière

## Identifier ce qui tourne

La version applicative suit SemVer dans `package.json` et le lockfile. La préversion actuelle est `0.3.0-dev.1`. Le suffixe indique qu’il s’agit de développement, pas d’une livraison stable.

Chaque build contient un `version.json` et un bouton **Informations de version** dans l’interface :

- version applicative ;
- révision Git exacte (variable Vercel ou Git local) ;
- présence éventuelle de modifications non committées ;
- date de compilation ;
- environnement Vercel ou local.

Le diagnostic peut être copié dans un signalement de bug. Il ne contient ni jeton ni donnée personnelle. Un build avec modifications locales porte `dirty: true` : le hash du dernier commit seul ne suffit alors pas à le reproduire. Une archive sans métadonnées Git porte `unknown`, jamais un hash inventé.

Le fichier de version est servi sans cache durable sur Vercel. La date du build n’est pas une preuve de validation : les contrôles sont consignés dans le compte rendu de PR.

## Références Git

- `v0.1.0` désigne le socle cartographique de `main` au commit `92ca40c…`.
- `v0.2.0-dev.1` et `v0.2.0-dev.2` sont des points de reprise de développement, pas la production. Utiliser l’outil de rollback à partir de dev.2, qui vérifie également les fichiers protégés de la base choisie.
- Un tag publié ne doit jamais être déplacé ou écrasé : toute correction reçoit un nouveau numéro/commit.
- Garder les travaux sur leurs branches/PR et utiliser les prévisualisations Vercel. Une fusion dans `main` peut déclencher un déploiement de production.

Pour une nouvelle version, modifier package et lockfile ensemble, mettre le changelog à jour, vérifier build/tests et compatibilité de base, puis taguer le commit exact. Aucun workflow ne publie ou déplace automatiquement une version.

## Retour arrière rapide de l’interface Vercel

Depuis le projet Vercel, ouvrir un ancien déploiement **validé**, vérifier son commit, son environnement et ses variables publiques, puis utiliser le retour arrière/promotion de production proposé par Vercel. Cette action ne revient pas sur les migrations Supabase et ne supprime pas les scénarios.

Le projet actuel utilise Next.js avec le Root Directory à la racine. Un rollback Vercel doit pointer sur un ancien déploiement déjà construit ; pour reconstruire avec les réglages actuels, utiliser un nouveau déploiement du code cible.

Vérifier ensuite l’URL publique et la version lorsqu’elle est disponible. La version 0.1.0 n’a pas encore l’écran de diagnostic ajouté en 0.2 ; utiliser son SHA de déploiement pour l’identifier.

## Retour arrière du code, sans réécrire l’historique

Commencer par préserver tout travail en cours et actualiser les références Git :

```sh
git fetch origin main --tags
python3 scripts/prepare-rollback.py v0.3.0
```

Sans `--prepare`, la commande décrit seulement le plan. Pour préparer réellement une branche :

```sh
python3 scripts/prepare-rollback.py v0.3.0 --prepare
```

La commande exige un checkout propre et crée une branche `rollback/…` depuis `HEAD`. Elle restaure uniquement les fichiers applicatifs de la même architecture. Un retour entre les versions Vite et Next.js est refusé : il nécessite un plan de migration manuel revu.

Une base différente peut être choisie avec `--base`, mais elle est refusée si des migrations ou archives actuellement suivies y sont absentes ou modifiées. C’est important tant que main ne contient pas encore toutes les migrations appliquées.

Elle conserve `supabase/migrations/`, les archives d’import et les données de la base, ainsi que les fichiers d’environnement ignorés. Elle crée un relevé de rollback dans `docs/rollbacks/`. Elle ne fait ni reset, ni force-push, ni commit automatique, ni déploiement.

Relire les différences indexées, lancer `pnpm install --frozen-lockfile`, le build, les tests et les contrôles API pertinents, puis committer et ouvrir une PR. Une ancienne interface peut ne pas gérer les fonctions récentes ; la compatibilité avec le schéma actuel doit être vérifiée. La protection de l’historique SQL ne garantit pas à elle seule la compatibilité fonctionnelle.

## Base et scénarios : historique distinct

Les migrations 001/002/003 sont déjà enregistrées sur le projet existant. Ne pas les rejouer ou supprimer pour revenir à une interface antérieure. Corriger le schéma via une nouvelle migration additive après inspection ; toute suppression/restauration de données est une opération distincte qui demande une procédure et une autorisation spécifiques.

Les versions de référence OSM sont des instantanés immuables. Un scénario conserve sa couche/version. Une mise à jour des données crée une autre couche ; elle n’écrase pas la référence des scénarios existants. Les archives et manifestes sont dans `data/reference/osm/` sous ODbL.

## Tests de sécurité du rollback

`python3 -m unittest discover -s scripts/tests -v` utilise uniquement des dépôts Git jetables : inspection sans écriture, restauration de code en conservant une migration plus récente, refus d’un checkout comportant des changements et refus d’une base plus ancienne que les migrations actuellement suivies. Il ne déclenche aucun retour arrière du projet réel.
