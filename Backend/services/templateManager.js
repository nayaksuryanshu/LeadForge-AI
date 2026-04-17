const EmailTemplate = require("../models/EmailTemplate");

const DEFAULT_TEMPLATE = {
  name: "Default Outreach Template",
  subject: "Quick idea for {{lead.name}}",
  body: [
    "Hi {{lead.name}},",
    "",
    "I reviewed {{lead.name}}'s website and noticed {{analysis.summary}}",
    "",
    "{{analysis.aiGap}}",
    "",
    "A simple next step would be: {{analysis.primarySuggestion}}",
    "",
    "If useful, I can send over a 2-minute plan showing exactly how this would work for {{lead.name}}.",
    "",
    "Best,",
    "LeadForge AI",
  ].join("\n"),
  description: "Default personalized outreach message for new leads.",
  isDefault: true,
};

const renderTemplateString = (input, data = {}) => {
  const text = String(input || "");

  return text.replace(/{{\s*([^}]+)\s*}}/g, (_match, rawPath) => {
    const path = String(rawPath || "").trim();
    const value = path.split(".").reduce((current, key) => {
      if (current && typeof current === "object" && key in current) {
        return current[key];
      }

      return "";
    }, data);

    if (value === null || value === undefined) {
      return "";
    }

    return String(value);
  });
};

const getDefaultTemplate = async () => {
  const existing = await EmailTemplate.findOne({ isDefault: true }).sort({ updatedAt: -1 });

  if (existing) {
    return existing;
  }

  return EmailTemplate.create(DEFAULT_TEMPLATE);
};

const getTemplates = async () => {
  const templates = await EmailTemplate.find().sort({ isDefault: -1, updatedAt: -1 });

  if (templates.length > 0) {
    return templates;
  }

  const defaultTemplate = await getDefaultTemplate();
  return [defaultTemplate];
};

const saveDefaultTemplate = async ({ name, subject, body, description, isDefault = true }, userId = null) => {
  const currentDefault = await EmailTemplate.findOne({ isDefault: true });

  if (!currentDefault) {
    return EmailTemplate.create({
      name: name || DEFAULT_TEMPLATE.name,
      subject: subject || DEFAULT_TEMPLATE.subject,
      body: body || DEFAULT_TEMPLATE.body,
      description: description || DEFAULT_TEMPLATE.description,
      isDefault: Boolean(isDefault),
      createdBy: userId,
    });
  }

  currentDefault.name = name || currentDefault.name;
  currentDefault.subject = subject || currentDefault.subject;
  currentDefault.body = body || currentDefault.body;
  currentDefault.description = description ?? currentDefault.description;
  currentDefault.isDefault = true;
  if (userId) {
    currentDefault.createdBy = userId;
  }

  await currentDefault.save();
  return currentDefault;
};

module.exports = {
  DEFAULT_TEMPLATE,
  getDefaultTemplate,
  getTemplates,
  renderTemplateString,
  saveDefaultTemplate,
};
