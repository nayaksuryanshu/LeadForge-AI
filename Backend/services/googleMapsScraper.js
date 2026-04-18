const puppeteer = require("puppeteer-core");
const {
  normalizeWebsiteUrl,
  scrapeWebsiteContactInfo,
  extractPhoneFromText,
} = require("./websiteScraper");

const sanitizeResolvedPhone = (value) => {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  // Ratings often look like "4.2 4.2 4.2" and should never be stored as phone.
  if (/\d\.\d/.test(raw)) {
    return "";
  }

  const digitsOnly = raw.replace(/\D/g, "");

  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return "";
  }

  if (/^(\d)\1+$/.test(digitsOnly)) {
    return "";
  }

  if (/^(\d{2,3})\1{2,}$/.test(digitsOnly)) {
    return "";
  }

  const uniqueDigitCount = new Set(digitsOnly.split("")).size;
  if (uniqueDigitCount < 4) {
    return "";
  }

  return raw;
};

const toValidPhone = (...values) => {
  for (const value of values) {
    const extracted = extractPhoneFromText(String(value || ""));
    const sanitized = sanitizeResolvedPhone(extracted);

    if (sanitized) {
      return sanitized;
    }
  }

  return "";
};

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

const launchBrowserWithRecovery = async () => {
  const browserWSEndpoint = `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_API_KEY}`;

  if (!process.env.BROWSERLESS_API_KEY) {
    throw new Error("BROWSERLESS_API_KEY is not set.");
  }

  return puppeteer.connect({
    browserWSEndpoint,
  });
};

const isRetryableScrapeError = (error) => {
  const message = String(error?.message || "");

  return (
    /Navigating frame was detached/i.test(message) ||
    /Execution context was destroyed/i.test(message) ||
    /Target closed/i.test(message) ||
    /detached frame/i.test(message)
  );
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
      const extraPhoneNodes = Array.from(
        document.querySelectorAll(
          'a[href^="tel:"], button[aria-label*="call" i], a[aria-label*="call" i], button[aria-label*="phone" i], a[aria-label*="phone" i]'
        )
      );

      const websiteButton =
        metaButtons.find((el) => (el.getAttribute("data-item-id") || "").includes("authority")) ||
        metaButtons.find((el) => (el.getAttribute("data-item-id") || "").includes("website"));
      const phoneButton = metaButtons.find((el) => (el.getAttribute("data-item-id") || "").includes("phone"));
      const extraPhoneText = extraPhoneNodes
        .map((el) => {
          const href = el.getAttribute("href") || "";
          const aria = el.getAttribute("aria-label") || "";
          const txt = el.textContent || "";
          return `${href} ${aria} ${txt}`.trim();
        })
        .filter(Boolean)
        .join(" ");

      return {
        name: getText("h1.DUwDvf"),
        location: getText('button[data-item-id="address"]'),
        phone:
          phoneButton?.textContent?.trim() ||
          phoneButton?.getAttribute("aria-label") ||
          extraPhoneText ||
          "",
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
  const maxAttempts = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const browser = await launchBrowserWithRecovery(headless);
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
        const cards = Array.from(document.querySelectorAll('div[role="article"]')).slice(0, targetCount);

        return cards.map((card) => {
          const name = card.querySelector(".qBF1Pd")?.textContent?.trim() || "";
          const detailText = Array.from(card.querySelectorAll(".W4Efsd, .W4Efsd *"))
            .map((node) => node.textContent?.trim() || "")
            .filter(Boolean)
            .join(" ");
          const cardText = String(card.innerText || "").replace(/\s+/g, " ").trim();
          const ariaText = [
            card.getAttribute("aria-label") || "",
            card.querySelector('a[aria-label*="Call" i]')?.getAttribute("aria-label") || "",
            card.querySelector('button[aria-label*="Call" i]')?.getAttribute("aria-label") || "",
            card.querySelector('a[aria-label*="Phone" i]')?.getAttribute("aria-label") || "",
            card.querySelector('button[aria-label*="Phone" i]')?.getAttribute("aria-label") || "",
            card.querySelector('a[href^="tel:"]')?.getAttribute("href") || "",
          ]
            .filter(Boolean)
            .join(" ");

          const phoneCandidates = `${ariaText} ${cardText} ${detailText}`.trim();
          const website = card.querySelector('a[data-value="Website"]')?.href || "";
          const placeUrl =
            card.querySelector("a.hfpxzc")?.href ||
            card.querySelector('a[href*="google.com/maps/place"]')?.href ||
            "";

          return {
            name,
            location: detailText,
            phoneCandidates,
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
        const baseFast = scrapedData
          .filter((lead) => Boolean(lead.name))
          .map((lead) => ({
            name: lead.name,
            location: lead.location || "",
            phone: toValidPhone(lead.phoneCandidates),
            email: lead.email || "",
            website: sanitizeUrl(lead.website) || "",
            placeUrl: lead.placeUrl || "",
          }));

        // Fast mode fallback: fetch place details for entries missing phone/website.
        const fastFixed = await mapWithConcurrency(baseFast, 3, async (lead, index) => {
          const needsRecovery = !lead.phone || !lead.website;
          if (!needsRecovery || index >= 15) {
            return lead;
          }

          const placeDetails = await withTimeout(scrapeGoogleMapsPlaceDetails(browser, lead.placeUrl), 7000, {});

          const recoveredWebsite = sanitizeUrl(lead.website || placeDetails.website);
          const recoveredPhone = toValidPhone(lead.phone, placeDetails.phone);

          return {
            name: lead.name,
            location: lead.location || placeDetails.location || "",
            phone: recoveredPhone,
            email: lead.email || "",
            website: recoveredWebsite || "",
            placeUrl: lead.placeUrl,
          };
        });

        return fastFixed.map(({ placeUrl, ...lead }) => lead);
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
        let resolvedPhone = toValidPhone(lead.phoneCandidates, placeDetails.phone);

        if (!resolvedPhone && normalizedWebsite && index < 20) {
          const websiteContact = await withTimeout(scrapeWebsiteContactInfo(normalizedWebsite), 12000, {
            phone: "",
          });
          resolvedPhone = toValidPhone(websiteContact.phone);
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
    } catch (error) {
      const shouldRetry = isRetryableScrapeError(error) && attempt < maxAttempts;

      if (!shouldRetry) {
        throw error;
      }

      lastError = error;
      console.warn(`[scraper] Retry attempt ${attempt + 1}/${maxAttempts} after transient error: ${error.message}`);
    } finally {
      await browser.close();
    }
  }

  throw lastError || new Error("Scraper failed after retry attempts.");
};

module.exports = {
  scrapeGoogleMaps,
};
