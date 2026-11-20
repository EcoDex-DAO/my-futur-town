# Démarrage local après redémarrage

Sur le poste configuré, la copie locale de `main` se trouve dans `~/Documents/my-futur-town`. Le service utilisateur `my-futur-town.service` démarre cette copie à la connexion et sert <http://localhost:3000>.

Pour vérifier ou relancer le service :

```sh
systemctl --user status my-futur-town.service
systemctl --user restart my-futur-town.service
```

Le service installé utilise actuellement une surcharge `local-main.conf` pour ce chemin et ce port. La commande `systemctl --user cat my-futur-town.service` affiche le fichier principal et ses surcharges. Le fichier [my-futur-town.service.example](my-futur-town.service.example) présente une configuration équivalente sans surcharge. Pour une nouvelle installation, après avoir vérifié les chemins, les éventuelles surcharges existantes, Node.js et les dépendances du projet :

```sh
mkdir -p ~/.config/systemd/user
cp docs/my-futur-town.service.example ~/.config/systemd/user/my-futur-town.service
systemctl --user daemon-reload
systemctl --user enable --now my-futur-town.service
```

Le service démarre le code présent dans la copie locale ; il ne télécharge pas automatiquement les changements GitHub. Avant de mettre à jour cette copie, vérifier son état Git et conserver les modifications locales, puis synchroniser `main` et redémarrer le service.

Le stockage du navigateur dépend de l’origine : les lignes enregistrées sur l’ancien port 5173 ne sont pas automatiquement transférées vers le port 3000. De même, `http://localhost:3000` et `http://127.0.0.1:3000` sont deux origines distinctes : leurs lignes enregistrées ne sont pas partagées.

Les lignes créées sont enregistrées dans le stockage local du navigateur pour l'origine `http://localhost:3000`. Elles restent normalement disponibles après un redémarrage sur le même navigateur et le même profil, mais elles ne sont pas incluses dans Git ni synchronisées sur GitHub.
