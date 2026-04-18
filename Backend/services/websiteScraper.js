const puppeteer = require("puppeteer-core");

const connectBrowser = async () => {
  if (!process.env.BROWSERLESS_API_KEY) {
    throw new Error("BROWSERLESS_API_KEY is not set.");
  }

  return puppeteer.connect({
    browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_API_KEY}`,
  });
};

const normalizeWebsiteUrl = (url) => {
  const trimmed = String(url || "").trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const extractPhoneFromText = (text) => {
  const source = String(text || "");
  const compactSource = source.replace(/\s+/g, " ");
  const patterns = [
    /\+91[\s-]?[6-9]\d{9}\b/g,
    /\b0?[6-9]\d{9}\b/g,
    /\(\d{3,5}\)\s*\d{5,8}\b/g,
    /\b\d{3,5}[\s-]\d{5,8}\b/g,
  ];

  for (const pattern of patterns) {
    const matches = compactSource.match(pattern) || [];

    for (const match of matches) {
    const digitsOnly = match.replace(/\D/g, "");
    const repeatedChunkMatch = digitsOnly.match(/^(\d{2,3})\1{2,}$/);

      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        continue;
      }

      if (/^(\d)\1+$/.test(digitsOnly)) {
        continue;
      }

      if (repeatedChunkMatch) {
        continue;
      }

      if (/\d\.\d/.test(match)) {
        continue;
      }

      const cleaned = match.trim();

      // Accept realistic numeric formats only.
      if (/^\+?\d{10,15}$/.test(cleaned) || /[\s()-]/.test(cleaned)) {
        return cleaned;
      }
    }
  }

  return "";
};

const scrapeWebsiteContactInfo = async (website) => {
  const normalizedUrl = normalizeWebsiteUrl(website);

  if (!normalizedUrl) {
    return {
      url: "",
      phone: "",
      email: "",
      contactPage: "",
    };
  }

  const browser = await connectBrowser();

  try {
    const page = await browser.newPage();
    await page.goto(normalizedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const contactInfo = await page.evaluate(() => {
      const textNodes = Array.from(document.querySelectorAll("body *"))
        .map((node) => (node.textContent || "").trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ");

      const telLink = document.querySelector('a[href^="tel:"]')?.getAttribute("href") || "";
      const mailLink = document.querySelector('a[href^="mailto:"]')?.getAttribute("href") || "";
      const contactAnchor = Array.from(document.querySelectorAll('a[href]')).find((anchor) => {
        const label = `${anchor.textContent || ""} ${anchor.getAttribute("href") || ""}`.toLowerCase();
        return label.includes("contact") || label.includes("about") || label.includes("support");
      });

      return {
        textNodes,
        telLink,
        mailLink,
        contactHref: contactAnchor?.getAttribute("href") || "",
      };
    });

    return {
      url: normalizedUrl,
      phone: extractPhoneFromText(contactInfo.telLink || contactInfo.textNodes),
      email: String(contactInfo.mailLink || "").replace(/^mailto:/i, "").trim(),
      contactPage: contactInfo.contactHref || "",
    };
  } catch (error) {
    return {
      url: normalizedUrl,
      phone: "",
      email: "",
      contactPage: "",
      error: error.message,
    };
  } finally {
    await browser.close();
  }
};

const scrapeWebsiteContent = async (website) => {
  const normalizedUrl = normalizeWebsiteUrl(website);

  if (!normalizedUrl) {
    return {
      url: "",
      title: "",
      textSnippet: "No website available for this lead.",
      hasContactForm: false,
      hasChatWidget: false,
    };
  }

  const browser = await connectBrowser();

  try {
    const page = await browser.newPage();
    await page.goto(normalizedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const snapshot = await page.evaluate(() => {
      const bodyText = Array.from(document.querySelectorAll("h1, h2, h3, p, li"))
        .map((node) => (node.textContent || "").trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .slice(0, 4500);

      const hasContactForm = Boolean(document.querySelector("form"));
      const hasChatWidget = Boolean(
        document.querySelector('[class*="chat" i], [id*="chat" i], iframe[src*="chat" i]')
      );

      return {
        title: document.title || "",
        textSnippet: bodyText,
        hasContactForm,
        hasChatWidget,
      };
    });

    return {
      url: normalizedUrl,
      ...snapshot,
    };
  } catch (error) {
    return {
      url: normalizedUrl,
      title: "",
      textSnippet: `Website could not be scraped: ${error.message}`,
      hasContactForm: false,
      hasChatWidget: false,
    };
  } finally {
    await browser.close();
  }
};

module.exports = {
  scrapeWebsiteContent,
  normalizeWebsiteUrl,
  scrapeWebsiteContactInfo,
  extractPhoneFromText,
};
