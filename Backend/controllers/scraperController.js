const Lead = require("../models/Lead");
const { scrapeGoogleMaps } = require("../services/googleMapsScraper");

const startScraper = async (req, res) => {
  try {
    const { query, maxResults = 20, headless = true, enrich = false } = req.body;
    const normalizedQuery = typeof query === "string" ? query.trim() : "";
    const parsedMaxResults = Number(maxResults);
    const effectiveMaxResults = Number.isFinite(parsedMaxResults)
      ? Math.max(1, Math.min(50, Math.trunc(parsedMaxResults)))
      : 20;
    const useEnrichment = Boolean(enrich);

    if (!normalizedQuery) {
      return res.status(400).json({
        success: false,
        message: "A valid 'query' string is required.",
      });
    }

    let scrapedLeads = [];

    try {
      scrapedLeads = await scrapeGoogleMaps({
        query: normalizedQuery,
        maxResults: effectiveMaxResults,
        headless: Boolean(headless),
        enrich: useEnrichment,
      });
    } catch (scrapeError) {
      console.error("Scraper provider failed:", scrapeError.message);

      return res.status(200).json({
        success: false,
        message: `Scraper could not fetch data right now: ${scrapeError.message}`,
        query: normalizedQuery,
        maxResults: effectiveMaxResults,
        enrichmentEnabled: useEnrichment,
        totalScraped: 0,
        totalStored: 0,
        leads: [],
      });
    }

    const upsertedLeads = [];

    for (const lead of scrapedLeads) {
      if (!lead.name) {
        continue;
      }

      const savedLead = await Lead.findOneAndUpdate(
        {
          ownerId: req.user._id,
          name: lead.name,
          location: lead.location || "",
          scrapeQuery: normalizedQuery,
        },
        {
          $set: {
            phone: lead.phone || "",
            email: lead.email || "",
            website: lead.website || "",
          },
          $setOnInsert: {
            ownerId: req.user._id,
            name: lead.name,
            location: lead.location || "",
            scrapeQuery: normalizedQuery,
            status: "new",
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
        }
      );

      upsertedLeads.push(savedLead);
    }

    const leadsWithPhone = upsertedLeads.filter((lead) => String(lead.phone || "").trim()).length;
    const leadsWithWebsite = upsertedLeads.filter((lead) => String(lead.website || "").trim()).length;

    return res.status(200).json({
      success: true,
      message: "Scraper completed successfully.",
      query: normalizedQuery,
      maxResults: effectiveMaxResults,
      enrichmentEnabled: useEnrichment,
      totalScraped: scrapedLeads.length,
      totalStored: upsertedLeads.length,
      quality: {
        leadsWithPhone,
        leadsWithWebsite,
      },
      leads: upsertedLeads,
    });
  } catch (error) {
    console.error("Error in startScraper:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to run scraper.",
      error: error.message,
    });
  }
};

module.exports = {
  startScraper,
};
