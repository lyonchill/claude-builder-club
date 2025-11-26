/**
 * Storage utilities for managing hourly wage data
 */

const STORAGE_KEY = "hourlyWage"
const DEFAULT_WAGE = 0

/**
 * Get the user's hourly wage from storage
 * @returns {Promise<number>} The hourly wage, or default if not set
 */
async function getHourlyWage() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return result[STORAGE_KEY] || DEFAULT_WAGE
  } catch (error) {
    console.error("Error getting hourly wage:", error)
    return DEFAULT_WAGE
  }
}

/**
 * Set the user's hourly wage in storage
 * @param {number} wage - The hourly wage to store
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function setHourlyWage(wage) {
  // Validate wage input
  if (typeof wage !== "number" || isNaN(wage) || wage < 0) {
    console.error("Invalid wage value:", wage)
    return false
  }

  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: wage })
    return true
  } catch (error) {
    console.error("Error setting hourly wage:", error)
    return false
  }
}

/**
 * Check if hourly wage is set
 * @returns {Promise<boolean>} True if wage is set and greater than 0
 */
async function isWageSet() {
  const wage = await getHourlyWage()
  return wage > 0
}

/**
 * Tier settings storage keys
 */
const TIER_SETTINGS_KEY = "tierSettings"
const DEFAULT_TIER_SETTINGS = {
  type: "money", // "money" or "hours"
  green: 0, // Threshold for green (OK tier) - below this value
  yellow: 50, // Threshold for yellow (medium tier) - up to this value
  red: 100, // Threshold for red (pricey tier) - above this value
}

/**
 * Get tier settings from storage
 * @returns {Promise<Object>} Tier settings object
 */
async function getTierSettings() {
  try {
    const result = await chrome.storage.local.get(TIER_SETTINGS_KEY)
    return result[TIER_SETTINGS_KEY] || DEFAULT_TIER_SETTINGS
  } catch (error) {
    console.error("Error getting tier settings:", error)
    return DEFAULT_TIER_SETTINGS
  }
}

/**
 * Set tier settings in storage
 * @param {Object} settings - Tier settings object
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function setTierSettings(settings) {
  // Validate settings
  if (typeof settings !== "object" || settings === null) {
    console.error("Invalid tier settings:", settings)
    return false
  }

  if (settings.type !== "money" && settings.type !== "hours") {
    console.error("Invalid tier type:", settings.type)
    return false
  }

  if (
    typeof settings.green !== "number" ||
    typeof settings.yellow !== "number" ||
    typeof settings.red !== "number" ||
    isNaN(settings.green) ||
    isNaN(settings.yellow) ||
    isNaN(settings.red) ||
    settings.green < 0 ||
    settings.yellow < 0 ||
    settings.red < 0
  ) {
    console.error("Invalid tier thresholds:", settings)
    return false
  }

  try {
    await chrome.storage.local.set({ [TIER_SETTINGS_KEY]: settings })
    return true
  } catch (error) {
    console.error("Error setting tier settings:", error)
    return false
  }
}
