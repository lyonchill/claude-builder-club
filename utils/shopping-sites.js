/**
 * Shopping site detection patterns and utilities
 */

// List of known shopping site domains and patterns
const SHOPPING_SITES = [
  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "amazon.de",
  "ebay.com",
  "etsy.com",
  "walmart.com",
  "target.com",
  "bestbuy.com",
  "newegg.com",
  "shopify.com",
  "shop.com",
  "zappos.com",
  "overstock.com",
  "wayfair.com",
  "homedepot.com",
  "lowes.com",
  "macys.com",
  "nordstrom.com",
  "sephora.com",
  "ulta.com",
  "asos.com",
  "zara.com",
  "h&m.com",
  "gap.com",
  "oldnavy.com",
  "bananarepublic.com",
  "athleta.com",
  "adidas.com",
  "nike.com",
  "puma.com",
  "underarmour.com",
]

// Common shopping-related keywords in domain or path
const SHOPPING_KEYWORDS = [
  "shop",
  "store",
  "buy",
  "cart",
  "checkout",
  "product",
  "purchase",
  "merchandise",
]

/**
 * Check if the current site is a shopping/e-commerce site
 * @param {string} url - The URL to check (defaults to current page URL)
 * @returns {boolean} True if the site appears to be a shopping site
 */
function isShoppingSite(url = window.location.href) {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    const pathname = urlObj.pathname.toLowerCase()

    // Check against known shopping sites
    for (const site of SHOPPING_SITES) {
      if (hostname.includes(site)) {
        return true
      }
    }

    // Check for shopping keywords in domain or path
    for (const keyword of SHOPPING_KEYWORDS) {
      if (hostname.includes(keyword) || pathname.includes(keyword)) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error("Error checking shopping site:", error)
    return false
  }
}

/**
 * Get the current page URL
 * @returns {string} The current page URL
 */
function getCurrentUrl() {
  return window.location.href
}
