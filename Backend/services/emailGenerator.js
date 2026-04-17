const { DEFAULT_TEMPLATE, renderTemplateString } = require("./templateManager");

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

const applySpecialityEmailLens = ({ subject, body }, lead, userContext = {}) => {
  const speciality = String(userContext.businessSpeciality || "").trim();

  if (!speciality || isGenericSpeciality(speciality)) {
    return {
      subject,
      body,
    };
  }

  const bodyText = String(body || "").trim();
  const includesSpeciality = bodyText.toLowerCase().includes(speciality.toLowerCase());

  const lensLine = `Because our focus is ${speciality}, I would tailor this plan for ${lead?.name || "your team"} around one measurable business result.`;

  if (includesSpeciality) {
    return {
      subject,
      body: bodyText,
    };
  }

  return {
    subject,
    body: `${bodyText}\n\n${lensLine}`.trim(),
  };
};

const buildFallbackEmail = ({ lead, analysis, template, userContext = {} }) => {
  const subject = renderTemplateString(template?.subject || DEFAULT_TEMPLATE.subject, { lead, analysis });
  const body = renderTemplateString(template?.body || DEFAULT_TEMPLATE.body, { lead, analysis });
  const refined = applySpecialityEmailLens({ subject, body }, lead, userContext);

  return {
    subject: refined.subject,
    body: refined.body,
    source: "fallback",
  };
};

const generateEmailForLead = async ({ lead, analysis = {}, template, userContext = {} }) => {
  const apiKey = process.env.GROQ_API_KEY;
  const renderedTemplate = {
    subject: renderTemplateString(template?.subject || DEFAULT_TEMPLATE.subject, { lead, analysis }),
    body: renderTemplateString(template?.body || DEFAULT_TEMPLATE.body, { lead, analysis }),
  };

  const speciality = String(userContext.businessSpeciality || analysis.speciality || "").trim();
  const userName = String(userContext.userName || "").trim();
  const requestedModel = process.env.GROQ_EMAIL_MODEL || process.env.GROQ_MODEL;
  const resolvedModel = resolveGroqModel(requestedModel);

  if (!apiKey) {
    return buildFallbackEmail({ lead, analysis, template, userContext });
  }

  const system = [
    "You are a direct-response sales copywriter for an AI agency.",
    "Write concise, personalized outreach emails that sound natural, human, and specific.",
    "Avoid spammy marketing language, urgency, hype, emojis, markdown, and excessive punctuation.",
    "Do not mention lead generation, automation, AI, or sales in the subject line.",
    "Keep the body short, plain, and easy to read in a normal inbox.",
    "Return valid JSON only with keys: subject, body.",
    "Subject must be one short line.",
    "Body must be plain text, 4-7 short paragraphs max, no markdown bullets.",
    speciality && !isGenericSpeciality(speciality)
      ? `At least one body sentence must connect the recommendation to this agency speciality: ${speciality}.`
      : "Keep recommendations specific to the lead's situation.",
  ].join(" ");

  const user = [
    `Lead name: ${lead.name || "Unknown"}`,
    `Lead location: ${lead.location || "Unknown"}`,
    `Lead website: ${lead.website || "Unknown"}`,
    `Lead email: ${lead.email || "Unknown"}`,
    `Agency owner: ${userName || "Unknown"}`,
    `Agency speciality: ${speciality || "Not provided"}`,
    `AI summary: ${analysis.summary || lead.aiAnalysis || "No AI summary available."}`,
    `AI gap: ${analysis.aiGap || lead.aiGap || "No AI gap available."}`,
    `Primary suggestion: ${analysis.primarySuggestion || analysis.suggestions?.[0] || "No suggestion available."}`,
    "",
    "Use this template as the style baseline:",
    `Subject baseline: ${renderedTemplate.subject}`,
    `Body baseline: ${renderedTemplate.body}`,
    "",
    "Write a stronger final email that stays aligned with the template but adapts to the lead details above.",
    "Use a calm, conversational tone that looks like a normal 1-to-1 business email.",
    speciality && !isGenericSpeciality(speciality)
      ? `You must include this exact speciality phrase at least once in the body: ${speciality}`
      : "",
  ].join("\n");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        temperature: 0.3,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Groq email generation failed, using fallback template: ${response.status} ${errorText}`);
      const refined = applySpecialityEmailLens(renderedTemplate, lead, userContext);
      return {
        ...refined,
        source: "fallback_groq_error",
      };
    }

    const data = await response.json();
    const content = Array.isArray(data.choices)
      ? data.choices.map((choice) => choice?.message?.content || "").join("\n")
      : "";

    const parsed = extractJsonObject(content);
    if (!parsed) {
      const refined = applySpecialityEmailLens(renderedTemplate, lead, userContext);
      return {
        ...refined,
        source: "fallback_parse",
      };
    }

    const subject = String(parsed.subject || renderedTemplate.subject).trim();
    const body = String(parsed.body || renderedTemplate.body).trim();
    const refined = applySpecialityEmailLens({ subject, body }, lead, userContext);

    return {
      subject: refined.subject || renderedTemplate.subject,
      body: refined.body || renderedTemplate.body,
      source: "groq",
    };
  } catch (error) {
    console.warn("Groq email generation threw, using fallback template:", error.message);
    const refined = applySpecialityEmailLens(renderedTemplate, lead, userContext);
    return {
      ...refined,
      source: "fallback_exception",
    };
  }
};

module.exports = {
  generateEmailForLead,
};
