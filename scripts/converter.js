/**
 * Price-to-hours conversion logic
 */

/**
 * Calculate hours of work needed for a given price
 * @param {number} price - The item price
 * @param {number} hourlyWage - The user's hourly wage
 * @returns {number|null} Hours needed, or null if invalid input
 */
function calculateHours(price, hourlyWage) {
  if (typeof price !== "number" || typeof hourlyWage !== "number") {
    return null
  }

  if (isNaN(price) || isNaN(hourlyWage) || price < 0 || hourlyWage <= 0) {
    return null
  }

  return price / hourlyWage
}

/**
 * Format hours into a human-readable string
 * Rounds to nearest half hour (0, 0.5, 1, 1.5, 2, etc.)
 * @param {number} hours - The number of hours
 * @param {Object} options - Formatting options (kept for compatibility, but not used)
 * @returns {string} Formatted hours string (e.g., "2h", "2.5h", "3h")
 */
function formatHours(hours, options = {}) {
  if (hours === null || isNaN(hours) || hours < 0) {
    return "N/A"
  }

  // Round to nearest half hour (0.5 increments)
  // Multiply by 2, round, then divide by 2
  const roundedToHalfHour = Math.round(hours * 2) / 2

  // Handle very small values (< 0.25 hours = 15 minutes)
  if (roundedToHalfHour < 0.25) {
    return "< 0.5h"
  }

  // Format: show as "Xh" for whole hours, "X.5h" for half hours
  if (roundedToHalfHour % 1 === 0) {
    // Whole hour
    return `${roundedToHalfHour}h`
  } else {
    // Half hour
    return `${roundedToHalfHour}h`
  }
}

/**
 * Convert price to hours and format the result
 * @param {number} price - The item price
 * @param {number} hourlyWage - The user's hourly wage
 * @param {Object} formatOptions - Formatting options for formatHours
 * @returns {string} Formatted hours string
 */
function convertPriceToHours(price, hourlyWage, formatOptions = {}) {
  const hours = calculateHours(price, hourlyWage)
  return formatHours(hours, formatOptions)
}

/**
 * Batch convert multiple prices to hours
 * @param {Array<number>} prices - Array of prices
 * @param {number} hourlyWage - The user's hourly wage
 * @param {Object} formatOptions - Formatting options
 * @returns {Array<{price: number, hours: number, formatted: string}>} Array of conversion results
 */
function convertPricesToHours(prices, hourlyWage, formatOptions = {}) {
  return prices.map((price) => {
    const hours = calculateHours(price, hourlyWage)
    return {
      price: price,
      hours: hours,
      formatted: formatHours(hours, formatOptions),
    }
  })
}

/**
 * Determine tier color based on value and tier settings
 * @param {number} value - The value to check (price or hours)
 * @param {Object} tierSettings - Tier settings object with type, green, yellow, red
 * @returns {string} Tier color: "green", "yellow", or "red"
 */
function getTierColor(value, tierSettings) {
  if (!tierSettings || typeof value !== "number" || isNaN(value)) {
    return "yellow" // Default to yellow if no settings
  }

  const { green, yellow, red } = tierSettings

  // Green: value is below green threshold (or 0 if green is 0)
  if (green === 0 && value === 0) {
    return "green"
  }
  if (value < green) {
    return "green"
  }

  // Yellow: value is between green and yellow thresholds
  if (value >= green && value <= yellow) {
    return "yellow"
  }

  // Red: value is above yellow threshold
  if (value > yellow) {
    return "red"
  }

  // Default to yellow
  return "yellow"
}

/**
 * Get background color for a tier
 * @param {string} tier - Tier color: "green", "yellow", or "red"
 * @returns {string} Background color hex code
 */
function getTierBackgroundColor(tier) {
  switch (tier) {
    case "green":
      return "#d4edda" // Light green
    case "yellow":
      return "#fef3c7" // Light yellow (existing color)
    case "red":
      return "#f8d7da" // Light red
    default:
      return "#fef3c7" // Default to yellow
  }
}
