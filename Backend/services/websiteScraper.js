const puppeteer = require("puppeteer");

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
  const phoneRegex = /\+?[\d()(\s.-]{8,24}\d/g;
  const matches = source.match(phoneRegex) || [];

  for (const match of matches) {
    const digitsOnly = match.replace(/\D/g, "");

    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      return match.trim();
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

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

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

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
