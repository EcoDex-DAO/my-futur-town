---
target: page principale
total_score: 16
max_score: 36
na_heuristics: 8
p0_count: 0
p1_count: 3
target_identity: "file:/home/lammeur-mint/Documents/my-futur-town/src/app/page.tsx"
target_fingerprint: "sha256:90fc3dddf65112cede405c04d4bad18ca9b53e76ea982432312c13ec080119cf"
target_path: /home/lammeur-mint/Documents/my-futur-town/src/app/page.tsx
timestamp: 2026-11-06T20-01-46Z
slug: src-app-page-tsx
---
# Critique de la page principale

Méthode : analyse manuelle après échec des deux sous-agents (limite d’utilisation), et détecteur CLI. Le navigateur automatisé était indisponible ; les appréciations de rendu sont à confirmer visuellement.

## Score indicatif des heuristiques

| Heuristique | Score / 4 | Observation |
|---|---:|---|
| État du système | 2 | Statuts présents, distinction prévisualisation/enregistrement perfectible |
| Correspondance avec le monde réel | 2 | Termes techniques et identifiants exposés |
| Contrôle et liberté | 1 | Suppression immédiate et risque de perte d’une modification |
| Cohérence | 2 | Contrôles et parcours répartis entre panneau et carte |
| Prévention des erreurs | 1 | Aucun garde-fou visible avant suppression ou changement d’objet |
| Reconnaissance | 2 | Libellés présents, étapes de scénario peu explicites |
| Souplesse et efficacité | 2 | Recherche par rue, mais parcours de modification chargé |
| Esthétique et sobriété | n/a | Rendu non inspectable dans cette session |
| Récupération des erreurs | 2 | Messages de statut et nouvelle tentative, erreurs parfois techniques |
| Aide et documentation | 2 | Conseils existants, aide contextuelle limitée |
| Total provisoire | 16/36 | Indication issue du code, à confirmer en situation |

## Impression et points forts

La carte et l’éditeur partagent une même page : les couches sont nommées, la référence OSM est attribuée et le formulaire distingue les hypothèses des données sources. La structure mérite d’être évaluée visuellement ; impossible de juger son équilibre réel ici.

## Points prioritaires

1. P1 — La suppression d’un scénario appelle directement la suppression en base sans confirmation ni annulation. Proposer une confirmation nommant le scénario et, si réalisable, une récupération. `src/RoadEditor.tsx:469`.
2. P1 — Changer de tronçon ou de scénario peut remplacer le profil en cours sans garde visible pour `dirty`. Signaler les modifications non enregistrées et proposer enregistrer, abandonner ou rester. `src/RoadEditor.tsx:180`, `src/RoadEditor.tsx:418`.
3. P1 — Plusieurs libellés et aides utilisent des corps de 9 à 11 px ; le texte `.caption` sur le fond déclaré a un contraste calculé d’environ 3,25:1. Augmenter les tailles et renforcer le contraste ; vérifier les couleurs réellement rendues. `src/style.css:107`, `src/style.css:149`.
4. P2 — Sur mobile, l’éditeur a son propre défilement limité à 38dvh et précède une carte de 65dvh ; risque d’un parcours morcelé et de carte sous le premier écran. Évaluer une carte prioritaire et un panneau déployable. `src/style.css:554`.
5. P2 — Le parcours mélange instantané, rue, connexion, scénario et nombreux paramètres ; les termes « instantané », « EPSG:2154 » et les clés source supposent des connaissances. Organiser la séquence et déplacer les métadonnées techniques dans un détail. `src/RoadEditor.tsx:293`, `src/RoadEditor.tsx:490`.

## Personnes à risque

- Première visite : difficulté probable à comprendre quelle action lancer et pourquoi il faut sélectionner un instantané ou se connecter.
- Clavier/lecteur d’écran : la sélection de tronçon dispose d’une liste, mais la sélection générique de bâtiment repose sur le clic de carte ; un parcours équivalent reste à vérifier.
- Mobile : texte dense, commandes compactes et défilement imbriqué ; vérifier à 200 % et au toucher.

## Détails et questions

L’aide technique de configuration Supabase et certains messages d’erreur bruts ne sont pas formulés pour un utilisateur final. La carte possède un état de chargement et des messages d’erreur, ce qui est utile. Le détecteur CLI a retourné `[]` sur `src` ; ce résultat n’établit pas la conformité accessibilité.

Quelle doit être la première action : explorer la carte ou créer un scénario ? Les informations techniques doivent-elles être visibles par défaut ou sur demande ?
