const { buildWebsiteAnalysisPrompt } = require("./promptTemplates");

const extractJsonObject = (rawText) => {
  const text = String(rawText || "").trim();

  if (!text) {
    return null;
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  } catch (_error) {
    return null;
  }
};

const resolveGroqModel = (requestedModel) => {
  const normalized = String(requestedModel || "").trim();

  if (!normalized) {
    return "llama-3.1-8b-instant";
  }

  const deprecatedModelMap = {
    "llama3-8b-8192": "llama-3.1-8b-instant",
  };

  return deprecatedModelMap[normalized] || normalized;
};

const isGenericSpeciality = (value) => {
  const text = String(value || "").trim().toLowerCase();

  if (!text) {
    return true;
  }

  return ["general", "consulting", "service", "ai service", "ai consulting"].some((term) =>
    text === term || text.includes(`general ${term}`)
  );
};

const applySpecialityLens = (analysis, lead, userContext = {}) => {
  const speciality = String(userContext.businessSpeciality || "").trim();

  if (!speciality) {
    return analysis;
  }

  const currentSuggestions = Array.isArray(analysis.suggestions)
    ? analysis.suggestions.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  const genericSpeciality = isGenericSpeciality(speciality);

  const specialitySuggestion = genericSpeciality
    ? `Position a focused AI growth offer for ${lead.name || "this lead"} tied to one measurable business outcome.`
    : `Speciality lens (${speciality}): position a tailored offer for ${lead.name || "this lead"} with one clear expected business outcome and next step.`;

  const nextSuggestions = [specialitySuggestion, ...currentSuggestions].slice(0, 4);

  const summary = String(analysis.summary || "").trim();
  const nextSummary = summary || `AI opportunities identified for ${lead.name || "this lead"}.`;

  const aiGap = String(analysis.aiGap || "").trim();
  const nextAiGap = genericSpeciality
    ? aiGap || "The website lacks a clearly defined AI strategy."
    : `${aiGap || "The website lacks a clearly defined AI strategy."} From a ${speciality} perspective, the business has no clear offer-aligned AI journey.`;

  return {
    ...analysis,
    summary: nextSummary,
    aiGap: nextAiGap,
    suggestions: nextSuggestions,
  };
};

const buildFallbackAnalysis = (lead, websiteSnapshot, userContext = {}) => {
  const content = String(websiteSnapshot.textSnippet || "").toLowerCase();
  const hasChatSignals = /chatbot|live chat|drift|intercom|ai assistant/.test(content) || websiteSnapshot.hasChatWidget;
  const speciality = String(userContext.businessSpeciality || "").trim();
  const specialitySuffix = speciality ? ` for a ${speciality} provider` : "";

  const summary = hasChatSignals
    ? `The business appears to offer website chat, but there is room to improve AI-driven lead qualification for ${lead.name}${specialitySuffix}.`
    : `This ${lead.name || "business"} website shows no clear chatbot or AI assistant for inbound leads${specialitySuffix}.`;

  const aiGap = hasChatSignals
    ? "No visible AI-based qualification strategy after first contact."
    : "No clear AI-assisted lead response strategy is visible.";

  const suggestions = hasChatSignals
    ? [
        speciality
          ? `Add ${speciality}-focused AI lead scoring to prioritize high-intent prospects.`
          : "Add AI lead scoring to prioritize high-intent prospects.",
        speciality
          ? `Use AI summaries tailored to ${speciality} offers for faster follow-up handoffs.`
          : "Use AI summaries for faster follow-up handoffs.",
      ]
    : [
        speciality
          ? `Deploy a 24/7 chatbot for ${speciality} inquiries and instant lead capture.`
          : "Deploy a 24/7 website chatbot for instant inquiry capture.",
        speciality
          ? `Create personalized ${speciality} response journeys based on inquiry type.`
          : "Create personalized response journeys based on inquiry type.",
        "Route qualified leads directly to the right next step (calendar, demo, or consultation).",
      ];

  const base = {
    summary,
    aiGap,
    suggestions,
    source: "fallback",
  };

  return applySpecialityLens(base, lead, userContext);
};

const analyzeWebsiteForLead = async ({ lead, websiteSnapshot, userContext = {} }) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return buildFallbackAnalysis(lead, websiteSnapshot, userContext);
  }

  const { system, user } = buildWebsiteAnalysisPrompt({ lead, websiteSnapshot, userContext });
  const resolvedModel = resolveGroqModel(process.env.GROQ_MODEL);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        max_tokens: 600,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Groq website analysis failed, using fallback: ${response.status} ${errorText}`);
      return {
        ...buildFallbackAnalysis(lead, websiteSnapshot, userContext),
        source: "fallback_groq_error",
      };
    }

    const data = await response.json();
    const aiText = Array.isArray(data.choices)
      ? data.choices.map((choice) => choice?.message?.content || "").join("\n")
      : "";

    const parsed = extractJsonObject(aiText);
    if (!parsed) {
      return {
        ...buildFallbackAnalysis(lead, websiteSnapshot, userContext),
        source: "fallback_parse",
      };
    }

    const summary = String(parsed.summary || "").trim();
    const aiGap = String(parsed.aiGap || parsed.gap || "").trim();
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map((item) => String(item).trim()).filter(Boolean)
      : [];

    const output = {
      summary: summary || `AI opportunities identified for ${lead.name || "this lead"}${String(userContext.businessSpeciality || "").trim() ? ` based on your ${String(userContext.businessSpeciality || "").trim()} speciality` : ""}.`,
      aiGap: aiGap || "No clear AI capability was found in the available website snapshot.",
      suggestions,
      source: "groq",
    };

    return applySpecialityLens(output, lead, userContext);
  } catch (error) {
    console.warn("Groq website analysis threw, using fallback:", error.message);
    return {
      ...buildFallbackAnalysis(lead, websiteSnapshot, userContext),
      source: "fallback_exception",
    };
  }
};

module.exports = {
  analyzeWebsiteForLead,
};
