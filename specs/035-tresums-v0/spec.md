# Trésums V0 : préparation du site

**Branche** : `EcoDex-DAO/issue-55-tresums-v0` · **Issue** : #55 · **Date** : 2026-11-25

## Parcours et vérification

1. L'utilisateur ouvre Trésums, voit le cadastre et sélectionne une ou plusieurs parcelles. L'identifiant, la source, la date et les limites sont visibles. Le cadastre indisponible ne bloque pas la carte.
2. Il dessine et modifie des circulations, accès, sens et zones de stationnement, clairement présentés comme des hypothèses. Il retrouve son travail après rechargement.
3. Il utilise les mêmes fonctions sur ordinateur et mobile. Le projet n'est ni un bornage ni une étude de faisabilité.

## Exigences

- Afficher les parcelles du voisinage des Trésums et leur identification, permettre leur sélection et la conserver.
- Créer, modifier et supprimer des géométries et leurs attributs ; distinguer références et hypothèses.
- Conserver les données localement sans écraser les scénarios existants ; signaler les erreurs de lecture et d'écriture.
- Documenter provenance, date, couverture, licences et limites des sources et des DXF ; ne pas redistribuer les données non vérifiées.
- Maintenir la carte utilisable si les données cadastrales sont indisponibles.

## Hypothèses et limites

La V0 est un outil de préparation locale, sans validation foncière, étude d'accès, synchronisation multi-utilisateur ni import automatique DXF. Les fichiers DXF fournis ont des coordonnées locales sans géoréférencement explicite ; aucun calage ne doit être supposé. Les données locales du navigateur ne sont pas une sauvegarde partagée.

## Critères de réussite

- Sélection, création, modification, suppression et rechargement vérifiables dans un navigateur sur ordinateur et mobile.
- Une panne de source et une erreur de stockage sont identifiables sans perte silencieuse.
- L'attribution et l'avertissement sur le caractère indicatif restent accessibles.
