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
