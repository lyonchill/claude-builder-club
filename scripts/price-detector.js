/**
 * Price detection logic for extracting prices from web pages
 */

// Common CSS selectors for price elements on various shopping sites
const PRICE_SELECTORS = [
  // Generic price selectors
  '[class*="price"]',
  '[class*="Price"]',
  '[id*="price"]',
  '[id*="Price"]',
  "[data-price]",
  '[data-testid*="price"]',

  // Amazon - more specific selectors for product prices
  ".a-price-whole",
  ".a-price .a-offscreen",
  '[data-a-color="price"]',
  ".a-price-symbol",
  ".a-price .a-price-whole",
  ".a-price-range .a-price-whole",
  // Exclude deal/timer elements
  '[class*="deal"]:not([class*="time"]):not([class*="timer"]):not([class*="countdown"])',

  // eBay
  ".notranslate",
  "#prcIsum",

  // Etsy
  ".currency-value",

  // Generic e-commerce
  ".product-price",
  ".item-price",
  ".cost",
  ".amount",
  ".value",
]

// Regex pattern to match price formats (must have currency symbol)
const PRICE_PATTERN = /[\$€£¥]\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g

// Patterns that indicate time values (to exclude)
const TIME_PATTERNS = [
  /\d+\s*(h|hour|hours|hr|hrs)\s*\d*\s*(m|min|minute|minutes)?/i, // "2h 30m", "1 hour 20 minutes"
  /\d+\s*(m|min|minute|minutes)\s*(remaining|left|until|to go)?/i, // "30 minutes", "5 min remaining"
  /\d+\s*(s|sec|second|seconds)/i, // "30 seconds"
  /\d+\s*(d|day|days)/i, // "2 days"
  /(remaining|left|until|expires?|ends?)/i, // Time-related keywords
]

// Keywords that indicate time/deal duration (to exclude)
const TIME_KEYWORDS = [
  "remaining",
  "left",
  "until",
  "expires",
  "ends",
  "deal",
  "duration",
  "countdown",
  "timer",
]

/**
 * Check if text contains time-related patterns
 * @param {string} text - The text to check
 * @returns {boolean} True if text appears to be a time value
 */
function isTimeValue(text) {
  if (!text || typeof text !== "string") {
    return false
  }

  const lowerText = text.toLowerCase()

  // Check for time patterns
  for (const pattern of TIME_PATTERNS) {
    if (pattern.test(text)) {
      return true
    }
  }

  // Check for time keywords
  for (const keyword of TIME_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return true
    }
  }

  // Check for common time formats without currency
  // Pattern: number followed by h/m/s without $ sign
  if (/^\d+\s*[hms]/.test(text.trim()) && !/[\$€£¥]/.test(text)) {
    return true
  }

  return false
}

/**
 * Check if element is likely a price element (not time/deal duration)
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} True if element appears to be a price
 */
function isPriceElement(element) {
  if (!element) return false

  // Exclude our own badge elements
  if (
    element.classList.contains("price-hours-badge") ||
    element.closest(".price-hours-badge")
  ) {
    return false
  }

  // Exclude offscreen/hidden elements (like aok-offscreen)
  const className = (element.className || "").toLowerCase()
  if (
    className.includes("offscreen") ||
    className.includes("sr-only") ||
    className.includes("visually-hidden") ||
    element.getAttribute("aria-hidden") === "true"
  ) {
    return false
  }

  // Exclude priceToPay elements - these are usually containers, not the actual price
  if (className.includes("pricetopay")) {
    return false
  }

  // Check if element is in sidebar/navigation (often contains time values)
  const isInSidebar =
    element.closest(
      "nav, aside, [role='navigation'], [class*='sidebar'], [class*='nav'], [id*='sidebar'], [id*='nav']"
    ) !== null

  const id = (element.id || "").toLowerCase()
  const text = (element.textContent || "").toLowerCase()

  // Exclude elements with time/deal-related classes
  const excludePatterns = [
    "time",
    "timer",
    "countdown",
    "duration",
    "deal",
    "remaining",
    "expires",
    "ends",
  ]

  for (const pattern of excludePatterns) {
    if (
      className.includes(pattern) ||
      id.includes(pattern) ||
      text.includes(pattern)
    ) {
      // But allow if it's clearly a price element
      if (
        !className.includes("price") &&
        !id.includes("price") &&
        !element.hasAttribute("data-price")
      ) {
        return false
      }
    }
  }

  // Exclude sidebar elements that contain time patterns (but allow product prices in sidebars)
  if (isInSidebar) {
    // Check if the text content looks like time
    if (isTimeValue(text)) {
      return false
    }
    // Allow if it has strong price indicators (product prices can be in sidebars)
    const hasPriceIndicator =
      className.includes("price") ||
      id.includes("price") ||
      element.hasAttribute("data-price") ||
      element.closest('[class*="price"]') !== null ||
      /[\$€£¥]/.test(text) // Has currency symbol

    if (!hasPriceIndicator && isTimeValue(text)) {
      return false
    }
  }

  return true
}

/**
 * Extract numeric value from price string
 * @param {string} priceText - The price text to parse
 * @param {HTMLElement} element - Optional element for context
 * @returns {number|null} The numeric price value, or null if invalid
 */
function parsePrice(priceText, element = null) {
  if (!priceText || typeof priceText !== "string") {
    return null
  }

  // Check if this looks like a time value
  if (isTimeValue(priceText)) {
    return null
  }

  // Check element context if provided
  if (element && !isPriceElement(element)) {
    return null
  }

  // Must contain currency symbol for better accuracy
  const hasCurrency = /[\$€£¥]/.test(priceText)
  if (!hasCurrency) {
    // Only accept without currency if element has price-related attributes/classes
    if (
      element &&
      !element.className.match(/price|Price|cost|amount|value/i) &&
      !element.id.match(/price|Price|cost|amount|value/i) &&
      !element.hasAttribute("data-price")
    ) {
      return null
    }
  }

  // Remove currency symbols and whitespace
  const cleaned = priceText.trim().replace(/[\$€£¥,\s]/g, "")

  // Handle different decimal separators
  const normalized = cleaned.replace(/\.(?=\d{3})/g, "").replace(",", ".")

  const price = parseFloat(normalized)

  // Validate price is a reasonable number
  if (isNaN(price) || price < 0 || price > 10000000) {
    return null
  }

  // Additional validation: prices should typically be between $0.01 and $100,000
  // Very small numbers (< 0.01) or very large (> 100000) without currency context are suspicious
  if (price < 0.01 || price > 100000) {
    // Only accept if we have strong price context
    if (
      !hasCurrency &&
      (!element ||
        (!element.className.match(/price|Price/i) &&
          !element.id.match(/price|Price/i)))
    ) {
      return null
    }
  }

  return price
}

/**
 * Find all price elements on the page
 * @returns {Array<{element: HTMLElement, price: number, originalText: string}>} Array of price objects
 */
function detectPrices() {
  const prices = []
  const foundElements = new Set() // Avoid duplicates

  // Method 1: Use CSS selectors (preferred method - more accurate)
  for (const selector of PRICE_SELECTORS) {
    try {
      const elements = document.querySelectorAll(selector)
      elements.forEach((element) => {
        if (foundElements.has(element)) return

        // Skip if element is our own badge
        if (
          element.classList.contains("price-hours-badge") ||
          element.closest(".price-hours-badge")
        ) {
          return
        }

        // Skip if element is offscreen/hidden
        const className = (element.className || "").toLowerCase()
        if (
          className.includes("offscreen") ||
          className.includes("sr-only") ||
          className.includes("visually-hidden") ||
          element.getAttribute("aria-hidden") === "true"
        ) {
          return
        }

        // Skip priceToPay elements
        if (className.includes("pricetopay")) {
          return
        }

        // Skip if element is in a time/deal context
        if (!isPriceElement(element)) {
          return
        }

        const text = element.textContent || element.innerText || ""

        // Skip if text looks like time
        if (isTimeValue(text)) {
          return
        }

        const price = parsePrice(text, element)

        if (price !== null && price > 0) {
          foundElements.add(element)
          prices.push({
            element: element,
            price: price,
            originalText: text.trim(),
          })
        }
      })
    } catch (error) {
      // Invalid selector, skip
      continue
    }
  }

  // Method 2: Regex search on all text nodes (fallback - more conservative)
  // Only use this for elements that weren't found by selectors
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  )

  let node
  while ((node = walker.nextNode())) {
    const text = node.textContent

    // Skip if text looks like time
    if (isTimeValue(text)) {
      continue
    }

    const matches = text.match(PRICE_PATTERN)

    if (matches) {
      matches.forEach((match) => {
        // Find the parent element
        let parent = node.parentElement
        while (parent && parent !== document.body) {
          // Skip if already found or if it's a time element
          if (foundElements.has(parent) || !isPriceElement(parent)) {
            parent = parent.parentElement
            continue
          }

          const price = parsePrice(match, parent)
          if (price !== null && price > 0) {
            foundElements.add(parent)
            prices.push({
              element: parent,
              price: price,
              originalText: match.trim(),
            })
            break
          }
          parent = parent.parentElement
        }
      })
    }
  }

  // Remove duplicates and sort by price
  const uniquePrices = Array.from(
    new Map(prices.map((p) => [p.element, p])).values()
  )

  return uniquePrices
}

/**
 * Mark price elements with data attributes for later UI injection
 * @param {Array<{element: HTMLElement, price: number, originalText: string}>} prices - Array of price objects
 */
function markPriceElements(prices) {
  prices.forEach((priceObj, index) => {
    priceObj.element.setAttribute("data-price-detected", "true")
    priceObj.element.setAttribute("data-price-value", priceObj.price)
    priceObj.element.setAttribute("data-price-index", index)
  })
}
