# Validation et limites — horaires aux terminus

La photographie fournie représente la ligne 1 à l'arrêt Contamines, avec des minutes regroupées par heure et des renvois de destination et de calendrier. Elle a servi de référence de lecture, sans import de ses chiffres.

Les modifications sont locales au navigateur, dans une clé distincte des lignes créées et des fichiers GTFS. Le stockage refuse les données illisibles et les changements détectés depuis un autre onglet. Les courses modifiées et ajoutées apparaissent dans l'éditeur et sur la fiche de l'arrêt, séparément de la grille SIBRA d'origine. Les parcours créés exigent des durées cumulées saisies ; l'ordre de leurs arrêts est celui de leur enregistrement et doit être vérifié. Un changement du parcours ou du modèle GTFS est signalé.

La simulation de circulation et le bilan n'utilisent pas ces scénarios. Les affectations et conflits de véhicules relèvent de #30. La détection des départs identiques porte sur le même parcours, y compris entre jours de service autour de minuit ; elle ne détecte pas les conflits entre parcours. Les scénarios ne sont pas synchronisés entre appareils et n'éditent pas le GTFS. Les dates et exceptions des lignes SIBRA restent limitées à la couverture du jeu local ; les lignes créées utilisent une date précise, sans récurrence automatique.

Les captures Orca ont permis de contrôler l'ouverture de l'éditeur sur ordinateur et mobile, ainsi qu'une correction de largeur mobile. Les parcours automatisés utilisent des données et un fond de carte simulés ; ils ne vérifient ni la praticabilité des parcours ni le service réel.

## Vérifications

- Build Next.js réussi ; tests Vitest réussis.
- Trois tests Playwright réussis sur le port 4174 : création et réouverture sur ordinateur et mobile, passage après minuit, doublon entre jours de service et décalage d'une course GTFS. Les jeux sont simulés.
- Captures : [ordinateur](captures/bureau.png), [mobile](captures/mobile.png). Aperçu local sur le port 3001 ; le service existant sur 3000 est conservé.
- Les changements d'heure saisonniers et les conflits entre variantes ne sont pas évalués. La simulation et le bilan utilisent toujours la référence.

Les captures montrent une version intermédiaire de l'interface ; les libellés ont évolué depuis. Le stockage navigateur est isolé par origine : les données de l'aperçu sur `localhost:3001` ne sont pas celles de l'application sur le port 3000.
