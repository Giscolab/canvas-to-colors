const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SETTINGS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    numColors: { type: "integer", description: "Entre 4 et 80" },
    minRegionSize: { type: "integer", description: "Entre 0 et 500" },
    smoothness: { type: "integer", description: "Entre 0 et 100" },
    mergeTolerance: { type: "integer", description: "Entre 0 et 30" },
    enableArtisticMerge: { type: "boolean" },
    smartPalette: { type: "boolean" },
    paintEffect: { type: "string", enum: ["none", "watercolor", "brush"] },
    paintIntensity: { type: "integer", description: "Entre 0 et 100" },
    artisticEffect: { type: "string", enum: ["none", "oil", "pencil"] },
    artisticIntensity: { type: "integer", description: "Entre 0 et 100" },
    summary: { type: "string", description: "Une phrase en francais resumant le style de rendu vise" },
    rationale: {
      type: "array",
      description: "3 a 5 justifications courtes en francais",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          parameter: { type: "string" },
          value: { type: "string" },
          reason: { type: "string" },
        },
        required: ["parameter", "value", "reason"],
      },
    },
  },
  required: [
    "numColors",
    "minRegionSize",
    "smoothness",
    "mergeTolerance",
    "enableArtisticMerge",
    "smartPalette",
    "paintEffect",
    "paintIntensity",
    "artisticEffect",
    "artisticIntensity",
    "summary",
    "rationale",
  ],
};

const SYSTEM_PROMPT = `Tu es un expert en preparation de canevas "peinture par numeros".
On te fournit le rapport d'analyse chiffre d'une image (nombre de couleurs uniques, entropie, densite de contours, score de complexite, type d'image, couleurs dominantes) ainsi que les recommandations heuristiques deja calculees par le moteur.

Tu proposes un jeu complet de parametres de generation, adapte au niveau de difficulte demande par l'utilisateur.
Regles:
- numColors 4-80, minRegionSize 0-500, smoothness 0-100, mergeTolerance 0-30, intensites 0-100.
- Difficulte "debutant": peu de couleurs (8-16), grandes zones (minRegionSize eleve), bords plus doux, fusion artistique active.
- Difficulte "intermediaire": equilibre, proche des recommandations heuristiques.
- Difficulte "expert": beaucoup de couleurs, petites zones conservees, bords nets.
- Les photos supportent plus de couleurs que les images vectorielles ou les dessins au trait.
- Une densite de contours elevee justifie plus de fusion des petites zones.
- Reste proche des recommandations heuristiques sauf si l'analyse justifie un ecart, et explique-le.
- Reponds uniquement en francais, de facon concise et concrete.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Methode non autorisee" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Service IA non configure" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { analysis, recommendations, difficulty } = body ?? {};

    if (!analysis || typeof analysis !== "object") {
      return new Response(JSON.stringify({ error: "Analyse requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const level = ["debutant", "intermediaire", "expert"].includes(difficulty)
      ? difficulty
      : "intermediaire";

    const userPrompt = [
      `Niveau de difficulte souhaite: ${level}.`,
      "",
      "Rapport d'analyse:",
      JSON.stringify(analysis),
      "",
      "Recommandations heuristiques du moteur:",
      JSON.stringify(recommendations ?? null),
    ].join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "none",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "paint_parameters",
            strict: true,
            schema: SETTINGS_SCHEMA,
          },
        },
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Trop de requetes IA, reessayez dans un instant." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Credits IA epuises. Ajoutez des credits pour continuer." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!response.ok) {
      const detail = await response.text();
      console.error("AI gateway error", response.status, detail);
      return new Response(JSON.stringify({ error: "Le service IA a echoue" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "Reponse IA vide" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Unparseable AI content", content);
      return new Response(JSON.stringify({ error: "Reponse IA illisible" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
      const num = Math.round(Number(value));
      if (!Number.isFinite(num)) return fallback;
      return Math.min(max, Math.max(min, num));
    };
    const asEnum = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
      allowed.includes(value as T) ? (value as T) : fallback;

    const rationale = Array.isArray(parsed.rationale)
      ? (parsed.rationale as Array<Record<string, unknown>>)
          .slice(0, 6)
          .map((entry) => ({
            parameter: String(entry?.parameter ?? "").slice(0, 60),
            value: String(entry?.value ?? "").slice(0, 60),
            reason: String(entry?.reason ?? "").slice(0, 300),
          }))
          .filter((entry) => entry.parameter && entry.reason)
      : [];

    const suggestion = {
      difficulty: level,
      settings: {
        numColors: clampInt(parsed.numColors, 4, 80, 24),
        minRegionSize: clampInt(parsed.minRegionSize, 0, 500, 20),
        smoothness: clampInt(parsed.smoothness, 0, 100, 0),
        mergeTolerance: clampInt(parsed.mergeTolerance, 0, 30, 5),
        enableArtisticMerge: Boolean(parsed.enableArtisticMerge),
        smartPalette: Boolean(parsed.smartPalette),
        paintEffect: asEnum(parsed.paintEffect, ["none", "watercolor", "brush"] as const, "none"),
        paintIntensity: clampInt(parsed.paintIntensity, 0, 100, 0),
        artisticEffect: asEnum(parsed.artisticEffect, ["none", "oil", "pencil"] as const, "none"),
        artisticIntensity: clampInt(parsed.artisticIntensity, 0, 100, 0),
      },
      summary: String(parsed.summary ?? "").slice(0, 400),
      rationale,
    };

    return new Response(JSON.stringify(suggestion), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("suggest-parameters failure", error);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
