import { useRef, useState } from "react";
interface BuildInfo {
  version: string;
  revision: string;
  dirty: boolean | null;
  builtAt: string;
  environment: string;
}
export const BUILD_INFO: BuildInfo = JSON.parse(process.env.NEXT_PUBLIC_BUILD_INFO || "{}");
export function VersionInfo() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const info = BUILD_INFO;
  const diagnostic = `Your Futur Town ${info.version}\nRévision : ${info.revision}\nModifications non committées : ${info.dirty === null ? "inconnu" : info.dirty ? "oui" : "non"}\nBuild : ${info.builtAt}\nEnvironnement : ${info.environment}`;
  return (
    <>
      <button
        className="version-badge"
        onClick={() => dialog.current?.showModal()}
        aria-label="Informations de version"
      >
        v{info.version} · {info.revision.slice(0, 7)}
        {info.dirty ? " +" : ""}
      </button>
      <dialog ref={dialog} className="version-dialog">
        <h2>Informations de version</h2>
        <p>
          {info.version.includes("-")
            ? "Version de développement / préversion"
            : "Version stable"}
        </p>
        <pre>{diagnostic}</pre>
        <p>
          En cas de bug, joignez ces informations à votre signalement. Le retour
          arrière de l’interface conserve les données et scénarios ; voir le
          guide de versions du dépôt.
        </p>
        <a href="/version.json" target="_blank" rel="noreferrer">
          Métadonnées du build
        </a>
        <div>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(diagnostic);
                setMessage("Diagnostic copié.");
              } catch {
                setMessage(
                  "Copie indisponible : sélectionnez le texte ci-dessus.",
                );
              }
            }}
          >
            Copier le diagnostic
          </button>
          <button onClick={() => dialog.current?.close()}>Fermer</button>
        </div>
        <p role="status">{message}</p>
      </dialog>
    </>
  );
}
