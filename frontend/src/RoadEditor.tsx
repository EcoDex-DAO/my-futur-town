import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
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
}
export function RoadEditor({
  roads,
  onSelectRoad,
  selected,
  onRoads,
  onChanges,
  onDraft,
  onFocus,
}: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [roadSearch, setRoadSearch] = useState("");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [layers, setLayers] = useState<RoadLayer[]>([]),
    [layer, setLayer] = useState<RoadLayer | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]),
    [scenario, setScenario] = useState<Scenario | null>(null);
  const [name, setName] = useState("Sens unique et piste cyclable");
  const [changes, setChanges] = useState<RoadChange[]>([]);
  const [profile, setProfile] = useState<RoadProfile | null>(null);
  const [dirty, setDirty] = useState(false);
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
    if (!supabase) return;
    const { data, error } = await supabase
      .from("scenarios")
      .select("id,name,reference_layer_id,reference_version,updated_at")
      .not("reference_layer_id", "is", null)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    setScenarios(data as Scenario[]);
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
    if (!session) {
      setScenarios([]);
      setScenario(null);
      setChanges([]);
      return;
    }
    listScenarios().catch(fail);
  }, [session?.user.id]);
  useEffect(() => {
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
          fail(error);
          onRoads(EMPTY_ROADS);
          return;
        }
        onRoads(data as Roads);
        setMessage(
          (data as Roads).features.length
            ? "Routes OSM structurées chargées."
            : "Aucun tronçon dans cet instantané.",
        );
      });
    return () => {
      active = false;
    };
  }, [layer?.id, onRoads]);
  useEffect(() => {
    if (!scenario || !session || !supabase) {
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
        if (error) fail(error);
        else setChanges(data as RoadChange[]);
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
  }, [scenario?.id, scenario?.updated_at, session?.user.id]);
  useEffect(() => {
    onChanges(compare ? [] : changes);
  }, [changes, compare, onChanges]);
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
      !compare && dirty && scenario && selected && profile
        ? { id: selected.properties.id, profile }
        : undefined,
    );
    return () => onDraft(undefined);
  }, [selected?.properties.id, profile, scenario?.id, compare, dirty, onDraft]);
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
          Connexion Supabase à configurer : VITE_SUPABASE_URL et
          VITE_SUPABASE_PUBLISHABLE_KEY (clé publique). La carte reste
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
                  onChange={(e) => onSelectRoad(e.target.value)}
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
                  act(async () => {
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
                      act(async () => {
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
                      onClick={() => act(restore)}
                    >
                      Restaurer ce tronçon
                    </button>
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
