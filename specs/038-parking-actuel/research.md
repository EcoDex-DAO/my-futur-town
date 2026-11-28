# Sources et limites — consultation du 27 novembre 2026

- La [Ville d’Annecy, état des lieux VADA](https://www.annecy.fr/api/fileadmin/mediatheque_annecy/Ma_ville/Le_territoire/Etat_des_Lieux_VADA.pdf), indique 209 places pour Balleydier ; la date précise du relevé et la correspondance avec une zone librement dessinée doivent être établies.
- Un [arrêté municipal de 2025](https://www.annecy.fr/fileadmin/mediatheque_annecy/Actes_administratifs/Arretes-municipaux/2025/2025_mai/CN_2025_1241.pdf) emploie « Balleydier/Trésum » ; un [autre arrêté](https://www.annecy.fr/fileadmin/mediatheque_annecy/Actes_administratifs/Arretes-municipaux/2025/2025_d%C3%A9cembre/CN_2025_3171.pdf) situe deux places d’autopartage côté avenue des Trésums. Ils corroborent le secteur, pas le périmètre exact ni la capacité actuelle de chaque projet.
- Un [diagnostic Grand Annecy](https://www.grandannecy.fr/fileadmin/mediatheque/fichiers/Mon_quotidien/PLUI-HMB/Documents/Bibliotheque/01-RAPPORT_DE_PRESENTATION/1-DIAGNOSTIC/FICHES_DIAGNOSTICS/PLUI_DIAG_MOBILITE_COMMUNES.pdf) identifie Trésum sur sa carte de stationnement. Il ne valide pas une capacité pour la zone choisie.

Aucun chiffre n’est automatiquement affecté à un projet : ni le nom du parking ni une surface cadastrale ne démontrent l’identité du périmètre ou la période. Les accès locaux évoqués par le propriétaire ne sont pas des observations vérifiées.


## Hypothèses de surface et répartition

- [Cerema, Les pôles d’échanges, mai 2016, tableau 4](https://doc.cerema.fr/digitalCollection/DigitalCollectionAttachmentDownloadHandler.ashx?documentId=578402&parentDocumentId=216961&skipCopyright=true&skipWatermark=true), citant le guide STIF 2015 : 25 m² par place ordinaire, 33 m² par place PMR, dégagement compris. Ce sont des ordres de grandeur, pas un plan d’aménagement.
- [Arrêté du 8 décembre 2014, article 3](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000034797410), relatif notamment aux ERP existants : 2 % de places adaptées dans les cas visés, sous conditions ; l’applicabilité à un site donné et les autres obligations restent à vérifier. L’interface emploie 2 % comme hypothèse modifiable, sans déclarer le projet conforme.
- Une zone dessinée ou cadastrale ne garantit ni le foncier ni la surface utilisable. La proportion utilisable initiale de 100 % est une hypothèse provisoire non vérifiée ; l’utilisateur doit la réduire pour les obstacles et usages concurrents.
- Turf 7.4 calcule l’union géométrique avant la surface sphérique approximative : les recouvrements ne sont pas comptés deux fois. La précision ne remplace ni un bornage ni une mesure cadastrale officielle ; une géométrie invalide peut rendre le résultat indisponible. Les bibliothèques Turf et polyclip-ts sont sous licence MIT ; splaytree-ts est sous BSD 3 clauses (sa métadonnée indique par erreur « BDS-3-Clause »). Textes : `docs/third-party-parking-geometry-licenses.txt`.
