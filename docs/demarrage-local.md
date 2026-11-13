# Démarrage local après redémarrage

Sur le poste configuré, la copie locale de `main` se trouve dans `~/orca/workspaces/my-futur-town/Orchestrateur/main-local`. Le service utilisateur `my-futur-town.service` démarre cette copie à la connexion et sert <http://localhost:5173>.

Pour vérifier ou relancer le service :

```sh
systemctl --user status my-futur-town.service
systemctl --user restart my-futur-town.service
```

Le fichier [my-futur-town.service.example](my-futur-town.service.example) documente la configuration utilisée. Pour l'installer sur ce poste après avoir vérifié les chemins et installé Node.js et les dépendances du projet :

```sh
mkdir -p ~/.config/systemd/user
cp docs/my-futur-town.service.example ~/.config/systemd/user/my-futur-town.service
systemctl --user daemon-reload
systemctl --user enable --now my-futur-town.service
```

Le service démarre le code présent dans la copie locale ; il ne télécharge pas automatiquement les changements GitHub. Avant de mettre à jour cette copie, vérifier son état Git et conserver les modifications locales, puis synchroniser `main` et redémarrer le service.

Les lignes créées sont enregistrées dans le stockage local du navigateur pour l'origine `http://localhost:5173`. Elles restent normalement disponibles après un redémarrage sur le même navigateur et le même profil, mais elles ne sont pas incluses dans Git ni synchronisées sur GitHub.
