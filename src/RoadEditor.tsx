import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { RoadScenarioLink } from "./features/multimodal/scenarios";
import {
  allocatedWidth,
  profileError,
  proposedProfile,
  type Road,
  type RoadProfile,
  type RoadLayer,
  type Scenario,
  type RoadChange,
  type Roads,
  EMPTY_ROADS,
} from "./roads";
interface Props {
  roads: Roads;
  onSelectRoad: (id: string) => void;
  selected: Road | null;
  onRoads: (r: Roads) => void;
  onChanges: (c: RoadChange[]) => void;
  onDraft: (d: { id: string; profile: RoadProfile } | undefined) => void;
  onFocus: () => void;
  onScenarioChange: (scenario: RoadScenarioLink | null) => void;
  requestedRoadScenario: RoadScenarioLink | null;
  roadSelectionRequest: { id: string; token: number } | null;
}
export function RoadEditor({
  roads,
  onSelectRoad,
  selected,
  onRoads,
  onChanges,
  onDraft,
  onFocus,
  onScenarioChange,
  requestedRoadScenario,
  roadSelectionRequest,
}: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const handledRequest = useRef<RoadScenarioLink | null>(null);
  const [roadSearch, setRoadSearch] = useState("");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [layers, setLayers] = useState<RoadLayer[]>([]),
    [layer, setLayer] = useState<RoadLayer | null>(null);
  const [loadedRoadLayerId, setLoadedRoadLayerId] = useState<string | null>(null);
  const [roadLoadError, setRoadLoadError] = useState(false);
  const [reloadRoad, setReloadRoad] = useState(0);
  const [scenarioListLoaded, setScenarioListLoaded] = useState(false);
  const [scenarioOwnerId, setScenarioOwnerId] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]),
    [scenario, setScenario] = useState<Scenario | null>(null);
  const [name, setName] = useState("Sens unique et piste cyclable");
  const [changes, setChanges] = useState<RoadChange[]>([]);
  const [loadedChangesKey, setLoadedChangesKey] = useState<string | null>(null);
  const [changesLoadError, setChangesLoadError] = useState(false);
  const changesKey = session && scenario && scenarioOwnerId === session.user.id
    ? JSON.stringify([session.user.id, scenario.id, scenario.updated_at]) : null;
  const changesLoaded = changesKey !== null && loadedChangesKey === changesKey;
  const roadsLoaded = !!scenario && layer?.id === scenario.reference_layer_id && loadedRoadLayerId === layer.id;
  const changesLoading = !!scenario && !changesLoaded;
  const [profile, setProfile] = useState<RoadProfile | null>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);
  const [compare, setCompare] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [graph, setGraph] = useState<{
    segments: number;
    forward: number;
    reverse: number;
  } | null>(null);
  function fail(e: unknown) {
    setMessage(
      e && typeof e === "object" && "message" in e
        ? String(e.message)
        : "Opération impossible. Vérifiez votre connexion et vos droits.",
    );
  }
  async function listScenarios() {
    if (!supabase || !sessionRef.current) return;
    const ownerId = sessionRef.current.user.id;
    const { data, error } = await supabase
      .from("scenarios")
      .select("id,name,reference_layer_id,reference_version,updated_at")
      .not("reference_layer_id", "is", null)
      .order("updated_at", { ascending: false });
    if (sessionRef.current?.user.id !== ownerId) return;
    if (error) throw error;
    setScenarios(data as Scenario[]);
    setScenarioListLoaded(true);
  }
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    supabase
      .from("geo_layers")
      .select("id,name,slug,metadata")
      .like("slug", "annecy-roads-%")
      .order("slug", { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          fail(error);
          return;
        }
        setLayers(data as RoadLayer[]);
        setLayer(data?.[0] ?? null);
      });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    setScenarios([]);
    setScenarioListLoaded(false);
    setScenario(null);
    setScenarioOwnerId(null);
    setChanges([]);
    if (!session) return;
    listScenarios().catch(fail);
  }, [session?.user.id]);
  useEffect(() => {
    onScenarioChange(session && scenario && changesLoaded && roadsLoaded && !compare ? {
      id: scenario.id,
      ownerId: session.user.id,
      name: scenario.name,
      referenceLayerId: scenario.reference_layer_id,
      referenceVersion: scenario.reference_version,
    } : null);
  }, [session?.user.id, scenario, changesLoaded, roadsLoaded, compare, onScenarioChange]);
  const handledRoadSelection = useRef<number | null>(null);
  function allowDiscard() {
    return !dirty || window.confirm("Ce tronçon contient des modifications non enregistrées. Les abandonner ?");
  }
  function selectRoad(id: string) {
    if (id === (selected?.properties.id ?? "") || !allowDiscard()) return;
    onSelectRoad(id);
  }
  useEffect(() => {
    if (!roadSelectionRequest || handledRoadSelection.current === roadSelectionRequest.token) return;
    handledRoadSelection.current = roadSelectionRequest.token;
    selectRoad(roadSelectionRequest.id);
  }, [roadSelectionRequest]);
  useEffect(() => {
    if (!requestedRoadScenario || handledRequest.current === requestedRoadScenario) return;
    if (!supabase) {
      setMessage("Voirie liée indisponible : configurez Supabase.");
      return;
    }
    if (!session) {
      setMessage("Voirie liée indisponible : connectez-vous au compte propriétaire.");
      return;
    }
    if (session.user.id !== requestedRoadScenario.ownerId) {
      setMessage("Voirie liée indisponible pour le compte connecté.");
      return;
    }
    if (!scenarioListLoaded) return;
    const match = scenarios.find((item) => item.id === requestedRoadScenario.id &&
      item.reference_layer_id === requestedRoadScenario.referenceLayerId &&
      item.reference_version === requestedRoadScenario.referenceVersion);
    if (!match) {
      setMessage("Voirie liée introuvable ou inaccessible avec ce compte.");
      return;
    }
    const reference = layers.find((item) => item.id === match.reference_layer_id);
    if (!reference) {
      setMessage("L’instantané de référence lié à cette voirie est indisponible.");
      return;
    }
    handledRequest.current = requestedRoadScenario;
    if (scenario?.id === match.id) {
      if (changesLoaded && roadsLoaded) setMessage("Cette voirie est déjà ouverte.");
      else {
        setMessage("Nouvelle tentative de chargement de la voirie liée…");
        setReloadRoad((previous) => previous + 1);
      }
      return;
    }
    if (!allowDiscard()) return;
    setLayer(reference);
    setScenarioOwnerId(session.user.id);
    setScenario(match);
    setCompare(false);
    setMessage("Chargement de la voirie liée ; ses changements restent partagés entre scénarios associés.");
  }, [requestedRoadScenario, session?.user.id, scenarioListLoaded, scenarios, layers]);
  useEffect(() => {
    setLoadedRoadLayerId(null);
    setRoadLoadError(false);
    if (!supabase || !layer) {
      onRoads(EMPTY_ROADS);
      return;
    }
    let active = true;
    setMessage("Chargement des routes de référence…");
    supabase
      .rpc("yft_road_features", { p_layer_id: layer.id })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setRoadLoadError(true);
          fail(error);
          onRoads(EMPTY_ROADS);
          return;
        }
        onRoads(data as Roads);
        setLoadedRoadLayerId(layer.id);
        setMessage(
          (data as Roads).features.length
            ? "Routes OSM structurées chargées."
            : "Aucun tronçon dans cet instantané.",
        );
      });
    return () => {
      active = false;
    };
  }, [layer?.id, reloadRoad, onRoads]);
  useEffect(() => {
    setLoadedChangesKey(null);
    setChangesLoadError(false);
    if (!scenario || !session || !supabase || scenarioOwnerId !== session.user.id) {
      setChanges([]);
      setGraph(null);
      return;
    }
    let active = true;
    setChanges([]);
    setGraph(null);
    supabase
      .from("scenario_changes")
      .select("id,reference_object_id,properties")
      .eq("scenario_id", scenario.id)
      .eq("operation", "update")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setChangesLoadError(true);
          fail(error);
        }
        else {
          setChanges(data as RoadChange[]);
          setLoadedChangesKey(JSON.stringify([session.user.id, scenario.id, scenario.updated_at]));
        }
      });
    supabase
      .rpc("yft_road_graph", { p_scenario_id: scenario.id })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          fail(error);
          return;
        }
        setGraph({
          segments: data.length,
          forward: data.filter(
            (s: { forward_allowed: boolean }) => s.forward_allowed,
          ).length,
          reverse: data.filter(
            (s: { reverse_allowed: boolean }) => s.reverse_allowed,
          ).length,
        });
      });
    return () => {
      active = false;
    };
  }, [scenario?.id, scenario?.updated_at, session?.user.id, scenarioOwnerId, reloadRoad]);
  useEffect(() => {
    onChanges(compare || !changesLoaded || !roadsLoaded ? [] : changes);
  }, [changes, compare, changesLoaded, roadsLoaded, onChanges]);
  useEffect(() => {
    if (!selected) {
      setProfile(null);
      return;
    }
    const saved = changes.find(
      (c) => c.reference_object_id === selected.properties.id,
    )?.properties.road_profile;
    setProfile(saved ?? proposedProfile(selected.properties.road_profile));
    setDirty(false);
  }, [selected?.properties.id, changes]);
  useEffect(() => {
    onDraft(
      !compare && changesLoaded && roadsLoaded && dirty && scenario && selected && profile
        ? { id: selected.properties.id, profile }
        : undefined,
    );
    return () => onDraft(undefined);
  }, [selected?.properties.id, profile, scenario?.id, compare, changesLoaded, roadsLoaded, dirty, onDraft]);
  async function act(task: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await task();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function auth(create = false) {
    if (!supabase) return;
    const { error } = create
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setPassword("");
    if (create)
      setMessage(
        "Compte demandé. Confirmez votre adresse e-mail si Supabase le demande, puis connectez-vous.",
      );
  }
  async function createScenario() {
    if (!supabase || !layer) return;
    const { data, error } = await supabase
      .from("scenarios")
      .insert({
        name: name.trim(),
        reference_layer_id: layer.id,
        reference_version: layer.metadata.version,
        assumptions: {
          model: "road-profile-v1",
          units: "m and km/h",
          unknown_values: "explicit user hypotheses",
        },
      })
      .select()
      .single();
    if (error) throw error;
    setScenarioOwnerId(session?.user.id ?? null);
    setScenario(data as Scenario);
    setCompare(false);
    await listScenarios();
    setMessage("Scénario enregistré dans Supabase.");
  }
  async function save() {
    if (!supabase || !scenario || !selected || !profile) return;
    const invalid = profileError(profile);
    if (invalid) throw new Error(invalid);
    const { error } = await supabase.from("scenario_changes").upsert(
      {
        scenario_id: scenario.id,
        reference_object_id: selected.properties.id,
        operation: "update",
        properties: { road_profile: profile, quality: "user_hypothesis" },
        geom: null,
      },
      { onConflict: "scenario_id,reference_object_id" },
    );
    if (error) throw error;
    setDirty(false);
    setScenario({ ...scenario, updated_at: new Date().toISOString() });
    setMessage("Modification enregistrée. La référence reste intacte.");
  }
  async function restore() {
    if (!supabase || !scenario || !selected) return;
    const { error } = await supabase
      .from("scenario_changes")
      .delete()
      .eq("scenario_id", scenario.id)
      .eq("reference_object_id", selected.properties.id);
    if (error) throw error;
    setDirty(false);
    setScenario({ ...scenario, updated_at: new Date().toISOString() });
    setMessage("Modification retirée du scénario ; référence restaurée.");
  }
  function edit(p: RoadProfile) {
    setDirty(true);
    setProfile(p);
  }
  const invalid = profile ? profileError(profile) : undefined;
  return (
    <section className="road-editor" aria-label="Éditeur de voirie">
      <h2>
        <span>02</span> Voirie · scénarios
      </h2>
      {!supabase ? (
        <p className="caption">
          Connexion Supabase à configurer : NEXT_PUBLIC_SUPABASE_URL et
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (clé publique). La carte reste
          disponible.
        </p>
      ) : (
        <>
          <label className="field">
            Instantané de référence
            <select
              aria-label="Instantané de référence"
              value={layer?.id ?? ""}
              disabled={busy || !!scenario}
              onChange={(e) =>
                setLayer(layers.find((l) => l.id === e.target.value) ?? null)
              }
            >
              <option value="">Aucun import disponible</option>
              {layers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} · {l.metadata.version}
                </option>
              ))}
            </select>
          </label>
          <p className="caption">
            {layer
              ? `${layer.metadata.segments} tronçons · OSM / ODbL · ${layer.metadata.version}`
              : "Aucun jeu de voirie importé. Les routes du fond ne sont pas éditables."}
          </p>
          {layer && (
            <button className="secondary" onClick={onFocus}>
              Voir le secteur pilote
            </button>
          )}
          {roads.features.length > 0 && (
            <>
              <label className="field">
                Rechercher une rue importée
                <input
                  type="search"
                  value={roadSearch}
                  onChange={(e) => setRoadSearch(e.target.value)}
                />
              </label>
              <label className="field">
                Sélectionner un tronçon
                <select
                  aria-label="Sélectionner un tronçon"
                  value={selected?.properties.id ?? ""}
                  onChange={(e) => selectRoad(e.target.value)}
                >
                  <option value="">Choisir une route réelle</option>
                  {roads.features
                    .filter((f) =>
                      (f.properties.name ?? "")
                        .toLocaleLowerCase("fr")
                        .includes(roadSearch.toLocaleLowerCase("fr")),
                    )
                    .map((f) => (
                      <option key={f.properties.id} value={f.properties.id}>
                        {f.properties.name || "Sans nom"} ·{" "}
                        {Math.round(f.properties.length_m)} m ·{" "}
                        {f.properties.source_key}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}
          {!session ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(() => auth());
              }}
            >
              <p className="caption">
                Connectez-vous pour conserver vos scénarios privés.
              </p>
              <label className="field">
                E-mail
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="field">
                Mot de passe
                <input
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button disabled={busy}>Se connecter</button>
              <button
                type="button"
                className="secondary"
                disabled={busy || !email || password.length < 8}
                onClick={() => act(() => auth(true))}
              >
                Créer un compte
              </button>
            </form>
          ) : (
            <>
              <p className="caption">Connecté : {session.user.email}</p>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  allowDiscard() && act(async () => {
                    const { error } = await supabase!.auth.signOut();
                    if (error) throw error;
                  })
                }
              >
                Se déconnecter
              </button>
              <label className="field">
                Scénario enregistré
                <select
                  aria-label="Scénario enregistré"
                  value={scenario?.id ?? ""}
                  disabled={busy}
                  onChange={(e) => {
                    const s =
                      scenarios.find((s) => s.id === e.target.value) ?? null;
                    if (s?.id === scenario?.id) return;
                    if (!allowDiscard()) return;
                    setScenarioOwnerId(s ? session.user.id : null);
                    setScenario(s);
                    if (s)
                      setLayer(
                        layers.find((l) => l.id === s.reference_layer_id) ??
                          null,
                      );
                    setCompare(false);
                  }}
                >
                  <option value="">Référence seule / nouveau scénario</option>
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              {!scenario && (
                <>
                  <label className="field">
                    Nom du scénario
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={busy || !layer || !name.trim()}
                    onClick={() => act(createScenario)}
                  >
                    Créer le scénario
                  </button>
                </>
              )}
              {scenario && (
                <>
                  {!changesLoadError && !roadLoadError && (!changesLoaded || !roadsLoaded) && <p role="status">Chargement de la voirie du scénario : la carte ne montre pas encore ses modifications.</p>}
                  {(changesLoadError || roadLoadError) && <p role="alert">La voirie du scénario n’a pas pu être chargée ; la carte ne montre que la référence disponible.</p>}
                  {(changesLoadError || roadLoadError) && <button type="button" className="secondary" onClick={() => setReloadRoad((previous) => previous + 1)}>Réessayer le chargement de la voirie</button>}
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={compare}
                      onChange={(e) => setCompare(e.target.checked)}
                    />{" "}
                    Comparer : afficher la référence
                  </label>
                  <p className="caption">
                    {changes.length} modification(s) enregistrée(s). Rechargez
                    puis choisissez ce scénario pour les retrouver.
                  </p>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      allowDiscard() && window.confirm("Supprimer définitivement ce scénario de voirie et ses modifications ? Les scénarios multimodaux liés ne pourront plus l’ouvrir.") && act(async () => {
                        const { error } = await supabase!
                          .from("scenarios")
                          .delete()
                          .eq("id", scenario.id);
                        if (error) throw error;
                        setScenario(null);
                        await listScenarios();
                      })
                    }
                  >
                    Supprimer ce scénario
                  </button>
                </>
              )}
            </>
          )}
          {selected && (
            <div className="road-profile">
              <h3>{selected.properties.name || "Tronçon sans nom"}</h3>
              <p className="caption">
                {selected.properties.source_key}
                <br />
                {Math.round(selected.properties.length_m)} m · EPSG:2154
                <br />
                Nœuds : {selected.properties.from_node.slice(0, 8)} →{" "}
                {selected.properties.to_node.slice(0, 8)}
              </p>
              <p className="caption">
                Référence : sens{" "}
                {selected.properties.road_profile.direction ?? "inconnu"}, voies{" "}
                {selected.properties.road_profile.lanes ?? "inconnues"}, largeur{" "}
                {selected.properties.road_profile.width_m ?? "inconnue"} m.
              </p>
              {!scenario ? (
                <p className="caption">
                  Choisissez ou créez un scénario pour modifier ce tronçon.
                </p>
              ) : (
                profile && (
                  <>
                    {changesLoading && <p role="status">{changesLoadError ? "Impossible de charger les modifications : la voirie du scénario n’est pas affichée. Réessayez en rouvrant le scénario." : "Chargement des modifications enregistrées…"}</p>}
                    <fieldset disabled={changesLoading || !roadsLoaded || busy}>
                    <p className="hypothesis">
                      Les valeurs proposées lorsque la source est inconnue sont
                      des hypothèses ajustables. Largeurs en mètres ; aucune
                      mesure nouvelle n’est inventée.
                    </p>
                    <label className="field">
                      Sens de circulation
                      <select
                        aria-label="Sens de circulation"
                        value={profile.direction}
                        disabled={compare}
                        onChange={(e) =>
                          edit({
                            ...profile,
                            direction: e.target
                              .value as RoadProfile["direction"],
                          })
                        }
                      >
                        <option value="both">Double sens</option>
                        <option value="forward">
                          Sens unique → ordre des nœuds OSM
                        </option>
                        <option value="reverse">
                          Sens unique ← ordre inverse
                        </option>
                        <option value="closed">Fermée aux voitures</option>
                      </select>
                    </label>
                    {(
                      [
                        ["lanes", "Nombre de voies"],
                        ["width_m", "Largeur totale (m)"],
                        ["lane_width_m", "Largeur par voie auto (m)"],
                        ["cycle_width_m", "Largeur cyclable totale (m)"],
                        [
                          "sidewalk_width_m",
                          "Largeur totale des trottoirs (m)",
                        ],
                      ] as const
                    ).map(([key, label]) => (
                      <label className="field" key={key}>
                        {label}
                        <input
                          type="number"
                          step={key === "lanes" ? 1 : 0.1}
                          min={0}
                          value={
                            Number.isFinite(profile[key]) ? profile[key] : ""
                          }
                          disabled={compare}
                          onChange={(e) =>
                            edit({
                              ...profile,
                              [key]:
                                e.target.value === ""
                                  ? NaN
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    ))}
                    <label className="field">
                      Vitesse (km/h, vide = inconnue)
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={profile.speed_kph ?? ""}
                        disabled={compare}
                        onChange={(e) =>
                          edit({
                            ...profile,
                            speed_kph:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <p className="caption">
                      Largeur allouée : {allocatedWidth(profile).toFixed(1)} /{" "}
                      {profile.width_m} m. Prévisualisation non enregistrée.
                    </p>
                    {invalid && <p className="form-error">{invalid}</p>}
                    <button
                      disabled={busy || !!invalid || compare || !dirty}
                      onClick={() => act(save)}
                    >
                      Enregistrer le tronçon
                    </button>
                    <button
                      className="secondary"
                      disabled={busy || compare}
                      onClick={() => { if (allowDiscard()) act(restore); }}
                    >
                      Restaurer ce tronçon
                    </button>
                    </fieldset>
                  </>
                )
              )}
            </div>
          )}
          {graph && (
            <p className="caption">
              Graphe enregistré : {graph.segments} arcs, {graph.forward}{" "}
              autorisés vers l’avant et {graph.reverse} vers l’arrière. Les
              restrictions de tournants OSM ne sont pas encore importées ; aucun
              routage n’est annoncé.
            </p>
          )}
        </>
      )}
      {message && (
        <p className="editor-status" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
