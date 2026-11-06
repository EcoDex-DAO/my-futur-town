# Constitution de My Futur Town

## Core Principles

### I. Carte de référence autonome

La consultation de la carte et ses interactions principales DOIVENT rester utilisables
lorsque l’API de l’application est indisponible, sous réserve de l’accès aux ressources
cartographiques externes et de WebGL. Les erreurs de chargement DOIVENT être visibles.

### II. Sécurité et propriété des scénarios

Les données réelles et les scénarios DOIVENT rester séparés. Les scénarios et leurs
éventuelles politiques d’accès DOIVENT respecter la propriété et les autorisations définies.
Les secrets NE DOIVENT PAS être publiés ni placés dans des variables `NEXT_PUBLIC_*`.
La vérification TLS DOIT rester active. Toute migration DOIT être validée localement et
faire l’objet d’une revue autorisée avant application à une base distante.

### III. Provenance et licences des données

Chaque source utilisée DOIT conserver son attribution et respecter ses conditions de
licence. Les imports et les choix de sources DOIVENT documenter leur provenance et leurs
limites ; les propriétés de tuiles NE DOIVENT PAS être présentées comme des identifiants
métier stables sans garantie explicite de la source.

### IV. Accessibilité et lisibilité

Les interfaces DOIVENT rester utilisables sur écran de bureau et mobile. Les nouveaux
contrôles DOIVENT avoir un nom accessible, être utilisables au clavier lorsque pertinent
et présenter des états et erreurs compréhensibles.

### V. Changements vérifiables

Chaque changement DOIT être proportionné à son besoin et accompagné de vérifications
adaptées aux comportements modifiés et à leurs échecs pertinents. Les limites de
validation DOIVENT être indiquées dans la pull request. Les tests et le build du projet
DOIVENT réussir avant intégration, sauf exception documentée et acceptée par les responsables.

## Contraintes techniques

L’application utilise Next.js, React, TypeScript, MapLibre et pnpm. Les changements de
pile ou de dépendances DOIVENT être motivés et conserver le verrouillage des dépendances.
Les variables publiques sont incorporées au build ; leur contenu est accessible au client.
Les migrations Supabase/PostGIS restent versionnées dans le dépôt.

## Flux de livraison

Une issue décrit le besoin et les critères d’acceptation. Les fonctionnalités complexes
sont précisées, planifiées et découpées avec Spec Kit ; un changement simple peut suivre
un flux direct. Le travail part de `main` dans une branche et est présenté dans une pull
request liée à l’issue, avec les contrôles, les limites et, pour une modification visuelle,
des captures lorsque disponibles. La revue examine les impacts de sécurité, données et UX.

## Governance

Cette constitution guide les spécifications, plans, implémentations et revues. Les
responsables du projet examinent toute exception et toute modification de ses principes
dans une pull request motivée. Une modification incompatible incrémente la version
majeure, un nouveau principe ou une extension substantielle la version mineure, et une
clarification la version corrective. Les changements correspondants sont documentés et
les travaux concernés sont adaptés après adoption. `AGENTS.md` détaille les commandes
et conventions opérationnelles du dépôt.

**Version**: 0.1.0 | **Ratified**: TODO(RATIFICATION_DATE) : adoption à confirmer | **Last Amended**: 2026-11-06
