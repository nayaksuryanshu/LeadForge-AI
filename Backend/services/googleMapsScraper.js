const path = require("path");

if (!process.env.PUPPETEER_CACHE_DIR) {
  process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, "..", ".cache", "puppeteer");
}

const puppeteer = require("puppeteer");
const {
  normalizeWebsiteUrl,
  scrapeWebsiteContactInfo,
  extractPhoneFromText,
} = require("./websiteScraper");

const sanitizeUrl = (value) => {
  const normalized = normalizeWebsiteUrl(value);

  if (!normalized) {
    return "";
  }

  try {
    return new URL(normalized).toString();
  } catch (_error) {
    return normalized;
  }
};

const withTimeout = async (promise, timeoutMs, fallbackValue) => {
  let timeoutHandle;

  const timeoutPromise = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const mapWithConcurrency = async (items, limit, mapper) => {
  const safeLimit = Math.max(1, Math.min(limit, items.length || 1));
  const results = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: safeLimit }, async () => {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
};

const scrapeGoogleMapsPlaceDetails = async (browser, placeUrl) => {
  if (!placeUrl) {
    return {};
  }

  const detailPage = await browser.newPage();

  try {
    await detailPage.goto(placeUrl, {
      waitUntil: "networkidle2",
      timeout: 20000,
    });

    await new Promise((resolve) => setTimeout(resolve, 1800));

    return await detailPage.evaluate(() => {
      const getText = (selector) => document.querySelector(selector)?.textContent?.trim() || "";
      const metaButtons = Array.from(document.querySelectorAll('button[data-item-id], a[data-item-id]'));

      const websiteButton =
        metaButtons.find((el) => (el.getAttribute("data-item-id") || "").includes("authority")) ||
        metaButtons.find((el) => (el.getAttribute("data-item-id") || "").includes("website"));
      const phoneButton = metaButtons.find((el) => (el.getAttribute("data-item-id") || "").includes("phone"));

      return {
        name: getText("h1.DUwDvf"),
        location: getText('button[data-item-id="address"]'),
        phone: phoneButton?.textContent?.trim() || phoneButton?.getAttribute("aria-label") || "",
        website: websiteButton?.getAttribute("href") || websiteButton?.textContent?.trim() || "",
      };
    });
  } catch (_error) {
    return {};
  } finally {
    await detailPage.close();
  }
};

const scrapeGoogleMaps = async ({ query, maxResults = 20, headless = true, enrich = false }) => {
  const browser = await puppeteer.launch({
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  const leads = [];

  try {
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await page.waitForFunction(
      () => {
        const feed = document.querySelector('div[role="feed"]');
        const cards = document.querySelectorAll('div[role="article"]');
        const placeSheet = document.querySelector('h1.DUwDvf');
        return Boolean(feed || cards.length > 0 || placeSheet);
      },
      { timeout: 25000 }
    );

    await new Promise((resolve) => setTimeout(resolve, 1200));

    await page.evaluate(async (targetCount) => {
      const panel = document.querySelector('div[role="feed"]');
      if (!panel) {
        return;
      }

      let previousHeight = 0;
      let idleRounds = 0;

      while (idleRounds < 4) {
        panel.scrollBy(0, 1500);
        await new Promise((resolve) => setTimeout(resolve, 700));

        const cards = panel.querySelectorAll('div[role="article"]');
        const newHeight = panel.scrollHeight;

        if (cards.length >= targetCount) {
          break;
        }

        if (newHeight === previousHeight) {
          idleRounds += 1;
        } else {
          idleRounds = 0;
          previousHeight = newHeight;
        }
      }
    }, maxResults);

    const scrapedData = await page.evaluate((targetCount) => {
      const extractPhone = (text) => {
        const phoneRegex = /\+?[\d()\s.-]{8,24}\d/g;
        const matches = String(text || "").match(phoneRegex) || [];

        for (const rawMatch of matches) {
          const digitsOnly = rawMatch.replace(/\D/g, "");

          if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
            return rawMatch.trim();
          }
        }

        return "";
      };

      const cards = Array.from(document.querySelectorAll('div[role="article"]')).slice(0, targetCount);

      return cards.map((card) => {
        const name = card.querySelector(".qBF1Pd")?.textContent?.trim() || "";
        const detailText = Array.from(card.querySelectorAll(".W4Efsd"))
          .map((node) => node.textContent?.trim() || "")
          .filter(Boolean)
          .join(" ");
        const phone = extractPhone(detailText);
        const website = card.querySelector('a[data-value="Website"]')?.href || "";
        const placeUrl = card.querySelector('a.hfpxzc')?.href || card.querySelector('a[href*="google.com/maps/place"]')?.href || "";

        return {
          name,
          location: detailText,
          phone,
          email: "",
          website,
          placeUrl,
        };
      });
    }, maxResults);

    if (scrapedData.length === 0) {
      const singlePlace = await page.evaluate(() => {
        const name = document.querySelector("h1.DUwDvf")?.textContent?.trim() || "";
        const metaButtons = Array.from(document.querySelectorAll('button[data-item-id], a[data-item-id]'));

        const website =
          metaButtons.find((el) => (el.getAttribute("data-item-id") || "").includes("authority"))
            ?.getAttribute("href") || "";

        const phone =
          metaButtons.find((el) => (el.getAttribute("data-item-id") || "").includes("phone"))
            ?.textContent?.trim() || "";

        const location =
          document.querySelector('button[data-item-id="address"]')?.textContent?.trim() || "";

        return name
          ? [
              {
                name,
                location,
                phone,
                email: "",
                website,
                placeUrl: window.location.href,
              },
            ]
          : [];
      });

      scrapedData.push(...singlePlace);
    }

    if (!enrich) {
      return scrapedData
        .filter((lead) => Boolean(lead.name))
        .map((lead) => ({
          name: lead.name,
          location: lead.location || "",
          phone: lead.phone || "",
          email: lead.email || "",
          website: sanitizeUrl(lead.website) || "",
        }));
    }

    const enriched = await mapWithConcurrency(scrapedData, 4, async (lead, index) => {
      if (!lead.name) {
        return null;
      }

      const shouldFetchPlaceDetails = index < 20;
      const placeDetails = shouldFetchPlaceDetails
        ? await withTimeout(scrapeGoogleMapsPlaceDetails(browser, lead.placeUrl), 15000, {})
        : {};

      const normalizedWebsite = sanitizeUrl(lead.website || placeDetails.website);
      let resolvedPhone = lead.phone || placeDetails.phone || "";

      if (!resolvedPhone && normalizedWebsite && index < 10) {
        const websiteContact = await withTimeout(
          scrapeWebsiteContactInfo(normalizedWebsite),
          10000,
          { phone: "" }
        );
        resolvedPhone = websiteContact.phone || "";
      }

      return {
        name: lead.name,
        location: lead.location || placeDetails.location || "",
        phone: resolvedPhone,
        email: lead.email || "",
        website: normalizedWebsite || sanitizeUrl(placeDetails.website) || "",
      };
    });

    for (const entry of enriched) {
      if (entry) {
        leads.push(entry);
      }
    }

    return leads;
  } finally {
    await browser.close();
  }
};

module.exports = {
  scrapeGoogleMaps,
};
