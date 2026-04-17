const buildWebsiteAnalysisPrompt = ({ lead, websiteSnapshot, userContext = {} }) => {
  const websiteUrl = lead.website || websiteSnapshot.url || "Unknown";
  const content = websiteSnapshot.textSnippet || "No visible website text was extracted.";
  const businessSpeciality = String(userContext.businessSpeciality || "").trim();
  const userName = String(userContext.userName || "").trim();

  return {
    system: [
      "You are a B2B growth analyst for an AI agency.",
      "Review the business website snapshot and identify practical AI opportunities.",
      businessSpeciality
        ? `You MUST prioritize recommendations that are directly relevant to this agency speciality: ${businessSpeciality}.`
        : "Use general AI growth recommendations if no agency speciality is provided.",
      "Keep language natural and specific to this lead; avoid keyword stuffing.",
      "When speciality is provided, map recommendations to that speciality in practical terms.",
      businessSpeciality
        ? "At least one suggestion must explicitly connect the lead's gap to the agency speciality with a concrete next step."
        : "Suggestions should still include concrete next steps.",
      "Return valid JSON only with keys: summary, aiGap, suggestions.",
      "summary must be 1-2 short sentences.",
      "aiGap must be one concrete missing AI capability.",
      "suggestions must be an array of 2-4 concise bullet-like strings.",
    ].join(" "),
    user: [
      `Lead name: ${lead.name || "Unknown"}`,
      `Location: ${lead.location || "Unknown"}`,
      `Website: ${websiteUrl}`,
      `Agency owner: ${userName || "Unknown"}`,
      `Agency speciality: ${businessSpeciality || "Not provided"}`,
      "",
      "Website snapshot:",
      content,
      "",
      "Question: Does this business appear to be using AI today, and what high-impact AI recommendation should we send?",
    ].join("\n"),
  };
};

module.exports = {
  buildWebsiteAnalysisPrompt,
};
