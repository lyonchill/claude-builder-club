/**
 * Main content script that orchestrates price detection and conversion
 */

// Store detected prices and conversions
let detectedPrices = []
let conversions = []
let isActive = false
let injectedBadges = new Map() // Track injected badge elements
let replacedPrices = new Map() // Track replaced price elements (for replace mode)
let stylesInjected = false
let displayMode = "side-by-side" // Default display mode
let showHours = true // Default to showing hours

/**
 * Inject CSS styles for price badges
 */
function injectStyles() {
  if (stylesInjected) return

  const styleId = "price-hours-converter-styles"
  if (document.getElementById(styleId)) return

  const style = document.createElement("style")
  style.id = styleId
  style.textContent = `
    .price-hours-badge {
      display: inline-block;
      background-color: #fef3c7;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 6px;
      vertical-align: baseline;
      white-space: nowrap;
      z-index: 10000;
      pointer-events: none;
    }
    
    /* Ensure badge doesn't break layout */
    .price-hours-badge-container {
      display: inline-block;
      position: relative;
    }
    
    /* No additional styles needed - we preserve original element structure */
  `
  document.head.appendChild(style)
  stylesInjected = true
}

/**
 * Get display mode from storage
 */
async function getDisplayMode() {
  try {
    const result = await chrome.storage.local.get("displayMode")
    return result.displayMode || "side-by-side"
  } catch (error) {
    console.error("Error getting display mode:", error)
    return "side-by-side"
  }
}

/**
 * Get show hours toggle state from storage
 */
async function getShowHours() {
  try {
    const result = await chrome.storage.local.get("showHours")
    return result.showHours !== false // Default to true if not set
  } catch (error) {
    console.error("Error getting show hours state:", error)
    return true
  }
}

/**
 * Create a badge element for displaying hours (side-by-side mode)
 * Copies font styles from the price element to match appearance
 */
function createBadge(hoursFormatted, priceElement) {
  const badge = document.createElement("span")
  badge.className = "price-hours-badge"
  badge.textContent = hoursFormatted
  badge.setAttribute("aria-label", `Requires ${hoursFormatted} of work`)
  badge.setAttribute(
    "title",
    `This item costs ${hoursFormatted} of work at your hourly wage`
  )

  // Copy font styles from the price element to match appearance
  if (priceElement) {
    const computedStyle = window.getComputedStyle(priceElement)
    badge.style.fontSize = computedStyle.fontSize
    badge.style.fontWeight = computedStyle.fontWeight
    badge.style.fontFamily = computedStyle.fontFamily
    badge.style.fontStyle = computedStyle.fontStyle
    badge.style.lineHeight = computedStyle.lineHeight
    badge.style.letterSpacing = computedStyle.letterSpacing
    badge.style.color = computedStyle.color // Match text color
  }

  return badge
}

/**
 * Store original price content and styles for replace mode
 */
function storeOriginalPrice(element) {
  if (replacedPrices.has(element)) {
    return // Already stored
  }

  const computedStyle = window.getComputedStyle(element)
  const originalData = {
    textContent: element.textContent,
    innerHTML: element.innerHTML,
    backgroundColor: element.style.backgroundColor || "",
    padding: element.style.padding || "",
    borderRadius: element.style.borderRadius || "",
    display: element.style.display || computedStyle.display || "",
  }

  replacedPrices.set(element, originalData)
}

/**
 * Replace price text with hours (replace mode)
 * Applies same styling as side-by-side mode: yellow background, matching font styles
 */
function replacePriceWithHours(element, hoursFormatted) {
  // Store original if not already stored
  storeOriginalPrice(element)

  // Get original data
  const original = replacedPrices.get(element)

  // Replace the text content
  element.textContent = hoursFormatted

  // Apply same styling as side-by-side badge: yellow background, padding, border-radius
  element.style.backgroundColor = "#fef3c7"
  element.style.padding = "2px 6px"
  element.style.borderRadius = "4px"
  element.style.display = "inline-block"
  element.style.marginLeft = "0" // No left margin in replace mode since it replaces the price

  // Font styles are already preserved since we're replacing text in the same element
  // The element already has the correct font-size, font-weight, font-family, etc.

  // Add data attribute for tracking
  element.setAttribute("data-price-replaced", "true")
  element.setAttribute(
    "title",
    `Original price: ${original.textContent} | Work hours: ${hoursFormatted}`
  )
}

/**
 * Restore original price (for replace mode)
 * Restores text content and removes styling applied by replace mode
 */
function restoreOriginalPrice(element) {
  const original = replacedPrices.get(element)
  if (!original) return

  // Restore text content
  element.textContent = original.textContent
  element.innerHTML = original.innerHTML

  // Restore original styles
  element.style.backgroundColor = original.backgroundColor
  element.style.padding = original.padding
  element.style.borderRadius = original.borderRadius
  element.style.display = original.display || ""

  element.removeAttribute("data-price-replaced")
  element.removeAttribute("title")
}

/**
 * Check if a badge already exists for this element
 * @param {HTMLElement} element - The price element
 * @returns {HTMLElement|null} Existing badge element or null
 */
function findExistingBadge(element) {
  // Check if we already have a badge tracked for this element
  if (injectedBadges.has(element)) {
    const existingBadge = injectedBadges.get(element)
    if (existingBadge && document.body.contains(existingBadge)) {
      return existingBadge
    }
  }

  // Check if a badge already exists as a sibling
  const parent = element.parentNode
  if (parent) {
    // Check next sibling
    let sibling = element.nextSibling
    while (sibling) {
      if (
        sibling.nodeType === Node.ELEMENT_NODE &&
        sibling.classList.contains("price-hours-badge")
      ) {
        return sibling
      }
      sibling = sibling.nextSibling
    }

    // Check if badge exists in price container
    const priceContainer = element.closest(
      '[class*="price"], [class*="Price"], [id*="price"], .a-price'
    )
    if (priceContainer && priceContainer !== element) {
      const existingBadge = priceContainer.querySelector(".price-hours-badge")
      if (existingBadge) {
        return existingBadge
      }
    }
  }

  return null
}

/**
 * Inject badges next to price elements (side-by-side mode)
 * IMPORTANT: Does not modify DOM structure - only inserts badge as sibling
 */
function injectBadgesSideBySide() {
  detectedPrices.forEach((priceObj, index) => {
    const element = priceObj.element
    const hoursFormatted = conversions[index]?.formatted

    if (!hoursFormatted || !element || !element.parentNode) {
      return
    }

    // Check if element is still in DOM
    if (!document.body.contains(element)) {
      return
    }

    // Check if badge already exists - skip if it does
    const existingBadge = findExistingBadge(element)
    if (existingBadge) {
      // Update existing badge if hours changed, otherwise skip
      const currentHours = element.getAttribute("data-hours-formatted")
      if (currentHours === hoursFormatted) {
        return // Same hours, no need to update
      }
      // Hours changed, update the badge text and styles
      existingBadge.textContent = hoursFormatted
      // Update font styles to match price element
      const computedStyle = window.getComputedStyle(element)
      existingBadge.style.fontSize = computedStyle.fontSize
      existingBadge.style.fontWeight = computedStyle.fontWeight
      existingBadge.style.fontFamily = computedStyle.fontFamily
      existingBadge.style.fontStyle = computedStyle.fontStyle
      existingBadge.style.lineHeight = computedStyle.lineHeight
      existingBadge.style.letterSpacing = computedStyle.letterSpacing
      existingBadge.style.color = computedStyle.color
      element.setAttribute("data-hours-formatted", hoursFormatted)
      return
    }

    try {
      // Skip if element is offscreen or hidden
      const className = (element.className || "").toLowerCase()
      if (
        className.includes("offscreen") ||
        className.includes("sr-only") ||
        className.includes("visually-hidden") ||
        element.getAttribute("aria-hidden") === "true"
      ) {
        return
      }

      // Skip priceToPay elements - these are containers, not the actual price
      if (className.includes("pricetopay")) {
        return
      }

      // Create badge with font styles matching the price element
      const badge = createBadge(hoursFormatted, element)

      const parent = element.parentNode

      // Always insert badge as sibling immediately after the price element
      // This ensures it appears to the right of the price
      // Don't append to containers - place it directly after the element
      if (element.nextSibling) {
        parent.insertBefore(badge, element.nextSibling)
      } else {
        parent.appendChild(badge)
      }

      // Store reference
      injectedBadges.set(element, badge)
    } catch (error) {
      console.error("Error injecting badge:", error)
    }
  })
}

/**
 * Replace prices with hours (replace mode)
 */
function injectBadgesReplace() {
  detectedPrices.forEach((priceObj, index) => {
    const element = priceObj.element
    const hoursFormatted = conversions[index]?.formatted

    if (!hoursFormatted || !element || !document.body.contains(element)) {
      return
    }

    // Skip if already replaced
    if (element.getAttribute("data-price-replaced") === "true") {
      return
    }

    // Skip if element is offscreen or hidden
    const className = (element.className || "").toLowerCase()
    if (
      className.includes("offscreen") ||
      className.includes("sr-only") ||
      className.includes("visually-hidden") ||
      element.getAttribute("aria-hidden") === "true"
    ) {
      return
    }

    // Skip priceToPay elements - these are containers, not the actual price
    if (className.includes("pricetopay")) {
      return
    }

    try {
      replacePriceWithHours(element, hoursFormatted)
    } catch (error) {
      console.error("Error replacing price:", error)
    }
  })
}

/**
 * Inject badges based on current display mode
 */
async function injectBadges() {
  // Check if hours should be shown
  showHours = await getShowHours()

  if (!showHours) {
    // Hide all badges if toggle is off
    removeBadges()
    return
  }

  // Remove old badges first
  removeBadges()

  // Get current display mode
  displayMode = await getDisplayMode()

  if (displayMode === "replace") {
    injectBadgesReplace()
  } else {
    injectBadgesSideBySide()
  }
}

/**
 * Remove all injected badges and restore replaced prices
 */
function removeBadges() {
  // Remove side-by-side badges - use querySelector to find all badges
  // This ensures we catch any badges that might not be in our map
  const allBadges = document.querySelectorAll(".price-hours-badge")
  allBadges.forEach((badge) => {
    try {
      if (badge && badge.parentNode) {
        badge.parentNode.removeChild(badge)
      }
    } catch (error) {
      // Element may have been removed
    }
  })
  injectedBadges.clear()

  // Restore replaced prices
  replacedPrices.forEach((original, element) => {
    try {
      if (document.body.contains(element)) {
        restoreOriginalPrice(element)
      }
    } catch (error) {
      // Element may have been removed
    }
  })
  replacedPrices.clear()
}

/**
 * Initialize the content script
 */
async function init() {
  // Inject styles first
  injectStyles()

  // Load display mode and show hours state
  displayMode = await getDisplayMode()
  showHours = await getShowHours()

  // Check if this is a shopping site
  if (!isShoppingSite()) {
    return
  }

  // Check if wage is set
  const wage = await getHourlyWage()
  if (wage <= 0) {
    console.log("Hourly wage not set. Extension will not convert prices.")
    return
  }

  isActive = true
  processPage()

  // Set up mutation observer for dynamic content
  setupMutationObserver()
}

/**
 * Process the current page for prices
 */
async function processPage() {
  if (!isActive) return

  const wage = await getHourlyWage()
  if (wage <= 0) return

  // Detect prices on the page
  detectedPrices = detectPrices()

  if (detectedPrices.length === 0) {
    return
  }

  // Mark price elements with data attributes
  markPriceElements(detectedPrices)

  // Convert prices to hours
  const prices = detectedPrices.map((p) => p.price)
  conversions = convertPricesToHours(prices, wage)

  // Store conversion data with elements for future UI injection
  detectedPrices.forEach((priceObj, index) => {
    priceObj.element.setAttribute("data-hours-value", conversions[index].hours)
    priceObj.element.setAttribute(
      "data-hours-formatted",
      conversions[index].formatted
    )
  })

  // Inject UI badges (await to ensure it completes)
  await injectBadges()

  console.log(
    `Detected ${detectedPrices.length} prices and converted to hours.`
  )
}

/**
 * Set up mutation observer to handle dynamically loaded content
 */
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldReprocess = false

    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        // Check if any added nodes might contain prices
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the node or its children might have price-related classes/attributes
            const hasPriceIndicator =
              node.querySelector &&
              (node.querySelector('[class*="price"]') ||
                node.querySelector("[data-price]") ||
                node.textContent.match(/[\$€£¥]\s*\d/))

            if (hasPriceIndicator) {
              shouldReprocess = true
            }
          }
        })
      }
    })

    if (shouldReprocess) {
      // Debounce reprocessing
      clearTimeout(window.priceConversionTimeout)
      window.priceConversionTimeout = setTimeout(() => {
        processPage()
      }, 500)
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

/**
 * Get all detected prices and their conversions
 * @returns {Array} Array of price objects with conversions
 */
function getDetectedPrices() {
  return detectedPrices.map((priceObj, index) => ({
    ...priceObj,
    conversion: conversions[index] || null,
  }))
}

/**
 * Toggle extension activation
 * @param {boolean} active - Whether to activate the extension
 */
async function setActive(active) {
  isActive = active
  if (active) {
    await processPage()
  } else {
    // Remove badges
    removeBadges()

    // Clear data attributes when deactivated
    detectedPrices.forEach((priceObj) => {
      priceObj.element.removeAttribute("data-price-detected")
      priceObj.element.removeAttribute("data-price-value")
      priceObj.element.removeAttribute("data-price-index")
      priceObj.element.removeAttribute("data-hours-value")
      priceObj.element.removeAttribute("data-hours-formatted")
    })
    detectedPrices = []
    conversions = []
  }
}

// Listen for messages from background script or popup
if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPrices") {
      sendResponse({ prices: getDetectedPrices() })
    } else if (request.action === "setActive") {
      setActive(request.active)
      sendResponse({ success: true })
    } else if (request.action === "reprocess") {
      // Ensure extension is active and reprocess page immediately
      if (!isActive) {
        // Re-initialize if not active
        init()
          .then(() => {
            sendResponse({ success: true })
          })
          .catch(() => {
            sendResponse({ success: true })
          })
      } else {
        // Reprocess page and update badges immediately
        processPage()
          .then(() => {
            sendResponse({ success: true })
          })
          .catch(() => {
            sendResponse({ success: true }) // Still send success even if there's an error
          })
      }
      return true // Keep channel open for async
    } else if (request.action === "setDisplayMode") {
      displayMode = request.mode || "side-by-side"
      injectBadges()
      sendResponse({ success: true })
    } else if (request.action === "setShowHours") {
      showHours = request.show !== false
      injectBadges()
      sendResponse({ success: true })
    }
    return true // Keep message channel open for async response
  })
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}
