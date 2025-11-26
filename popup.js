/**
 * Popup script for managing hourly wage settings
 */

// DOM Elements
const wageInput = document.getElementById("wage-input")
const currentWageDisplay = document.getElementById("current-wage-display")
const currentWageValue = document.getElementById("current-wage-value")
const errorMessage = document.getElementById("error-message")
const successMessage = document.getElementById("success-message")
const modeSideBySide = document.getElementById("mode-side-by-side")
const modeReplace = document.getElementById("mode-replace")
const toggleHours = document.getElementById("toggle-hours")

// Tier settings elements
const tierTypeMoney = document.getElementById("tier-type-money")
const tierTypeHours = document.getElementById("tier-type-hours")
const tierGreenInput = document.getElementById("tier-green-input")
const tierYellowInput = document.getElementById("tier-yellow-input")
const tierRedInput = document.getElementById("tier-red-input")
const tierSuccessMessage = document.getElementById("tier-success-message")

/**
 * Initialize popup
 */
async function init() {
  // Load current wage
  const wage = await getHourlyWage()

  if (wage > 0) {
    wageInput.value = wage.toFixed(2)
    updateCurrentWageDisplay(wage)
  }

  // Load display mode
  const displayMode = await getDisplayMode()
  if (displayMode === "replace") {
    modeReplace.checked = true
  } else {
    modeSideBySide.checked = true
  }

  // Update radio button styles after setting checked state
  setTimeout(() => {
    const sideBySideOption = document.getElementById("option-side-by-side")
    const replaceOption = document.getElementById("option-replace")
    if (sideBySideOption && replaceOption) {
      if (modeSideBySide.checked) {
        sideBySideOption.classList.add("checked")
        replaceOption.classList.remove("checked")
      } else {
        sideBySideOption.classList.remove("checked")
        replaceOption.classList.add("checked")
      }
    }
  }, 0)

  // Load toggle state
  const showHours = await getShowHours()
  toggleHours.checked = showHours

  // Load tier settings
  await loadTierSettings()

  // Set up event listeners
  setupEventListeners()
}

/**
 * Get hourly wage from storage
 */
async function getHourlyWage() {
  try {
    const result = await chrome.storage.local.get("hourlyWage")
    return result.hourlyWage || 0
  } catch (error) {
    console.error("Error getting hourly wage:", error)
    return 0
  }
}

/**
 * Set hourly wage in storage
 */
async function setHourlyWage(wage) {
  try {
    await chrome.storage.local.set({ hourlyWage: wage })
    return true
  } catch (error) {
    console.error("Error setting hourly wage:", error)
    return false
  }
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
 * Set display mode in storage
 */
async function setDisplayMode(mode) {
  try {
    await chrome.storage.local.set({ displayMode: mode })
    return true
  } catch (error) {
    console.error("Error setting display mode:", error)
    return false
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
 * Set show hours toggle state in storage
 */
async function setShowHours(show) {
  try {
    await chrome.storage.local.set({ showHours: show })
    return true
  } catch (error) {
    console.error("Error setting show hours state:", error)
    return false
  }
}

/**
 * Update current wage display
 */
function updateCurrentWageDisplay(wage) {
  if (wage > 0) {
    currentWageValue.textContent = `$${wage.toFixed(2)}/ hour`
    currentWageDisplay.style.display = "flex"
  } else {
    currentWageDisplay.style.display = "none"
  }
}

/**
 * Validate wage input
 */
function validateWage(value) {
  const numValue = parseFloat(value)

  if (isNaN(numValue) || numValue <= 0) {
    return {
      valid: false,
      error: "Please enter a valid hourly wage greater than 0",
    }
  }

  if (numValue > 10000) {
    return { valid: false, error: "Please enter a reasonable hourly wage" }
  }

  return { valid: true, error: null }
}

/**
 * Show error message
 */
function showError(message) {
  errorMessage.textContent = message
  errorMessage.style.display = "block"
  const inputField = document.querySelector(".input-field")
  if (inputField) {
    inputField.style.borderColor = "#ea4335"
  }
}

/**
 * Hide error message
 */
function hideError() {
  errorMessage.style.display = "none"
  const inputField = document.querySelector(".input-field")
  if (inputField) {
    inputField.style.borderColor = "#a7cab6"
  }
}

/**
 * Show success message
 */
function showSuccess() {
  successMessage.style.display = "block"
  setTimeout(() => {
    successMessage.style.display = "none"
  }, 2000)
}

/**
 * Calculate hours for a price
 */
function calculateHours(price, hourlyWage) {
  if (hourlyWage <= 0) return null
  return price / hourlyWage
}

/**
 * Format hours into readable string
 * Rounds to nearest half hour (0, 0.5, 1, 1.5, 2, etc.)
 * Returns format: "Xh" or "X.5h"
 */
function formatHours(hours) {
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
 * Handle wage save (auto-save on blur)
 */
async function handleSave() {
  const inputValue = wageInput.value.trim()

  // Validate
  const validation = validateWage(inputValue)
  if (!validation.valid) {
    showError(validation.error)
    return
  }

  hideError()

  const wage = parseFloat(inputValue)

  // Save wage
  const success = await setHourlyWage(wage)

  if (success) {
    // Update UI
    updateCurrentWageDisplay(wage)
    showSuccess()

    // Notify background script to update all tabs immediately
    try {
      chrome.runtime.sendMessage({ action: "setWage", wage: wage })
    } catch (error) {
      console.error("Error notifying background script:", error)
    }
  } else {
    showError("Failed to save wage. Please try again.")
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Auto-save on blur (when user finishes editing)
  wageInput.addEventListener("blur", () => {
    const value = wageInput.value.trim()
    if (value) {
      handleSave()
    }
  })

  // Enter key in input
  wageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      wageInput.blur() // Trigger blur to save
    }
  })

  // Real-time validation on input
  wageInput.addEventListener("input", () => {
    hideError()
    const value = wageInput.value.trim()

    if (value) {
      const validation = validateWage(value)
      const inputField = document.querySelector(".input-field")
      if (!validation.valid) {
        // Don't show error while typing, only on blur or submit
        if (inputField) {
          inputField.style.borderColor = "#ea4335"
        }
      } else {
        if (inputField) {
          inputField.style.borderColor = "#a7cab6"
        }
      }
    } else {
      const inputField = document.querySelector(".input-field")
      if (inputField) {
        inputField.style.borderColor = "#a7cab6"
      }
    }
  })

  // Toggle hours display
  toggleHours.addEventListener("change", async () => {
    const show = toggleHours.checked
    await setShowHours(show)
    notifyShowHoursChange(show)
  })

  // Display mode radio buttons
  const updateRadioStyles = () => {
    const sideBySideOption = document.getElementById("option-side-by-side")
    const replaceOption = document.getElementById("option-replace")

    if (modeSideBySide.checked) {
      sideBySideOption.classList.add("checked")
      replaceOption.classList.remove("checked")
    } else {
      sideBySideOption.classList.remove("checked")
      replaceOption.classList.add("checked")
    }
  }

  modeSideBySide.addEventListener("change", async () => {
    if (modeSideBySide.checked) {
      await setDisplayMode("side-by-side")
      notifyDisplayModeChange("side-by-side")
      updateRadioStyles()
    }
  })

  modeReplace.addEventListener("change", async () => {
    if (modeReplace.checked) {
      await setDisplayMode("replace")
      notifyDisplayModeChange("replace")
      updateRadioStyles()
    }
  })

  // Initialize radio styles
  updateRadioStyles()

  // Tier type radio buttons
  tierTypeMoney.addEventListener("change", async () => {
    if (tierTypeMoney.checked) {
      updateTierCurrencySymbol("money")
      updateTierTypeRadioStyles()
      await saveTierSettings()
    }
  })

  tierTypeHours.addEventListener("change", async () => {
    if (tierTypeHours.checked) {
      updateTierCurrencySymbol("hours")
      updateTierTypeRadioStyles()
      await saveTierSettings()
    }
  })

  // Tier input fields - save on blur
  tierGreenInput.addEventListener("blur", saveTierSettings)
  tierYellowInput.addEventListener("blur", saveTierSettings)
  tierRedInput.addEventListener("blur", saveTierSettings)

  // Tier input fields - validate on input
  tierGreenInput.addEventListener("input", () => {
    tierGreenInput.style.borderColor = "#a7cab6"
  })
  tierYellowInput.addEventListener("input", () => {
    tierYellowInput.style.borderColor = "#a7cab6"
  })
  tierRedInput.addEventListener("input", () => {
    tierRedInput.style.borderColor = "#a7cab6"
  })

  // Listen for storage changes (in case wage is updated elsewhere)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.hourlyWage) {
      const newWage = changes.hourlyWage.newValue || 0
      if (newWage > 0) {
        wageInput.value = newWage.toFixed(2)
        updateCurrentWageDisplay(newWage)
      }
    }
    if (areaName === "local" && changes.displayMode) {
      const newMode = changes.displayMode.newValue || "side-by-side"
      if (newMode === "replace") {
        modeReplace.checked = true
      } else {
        modeSideBySide.checked = true
      }
    }
    if (areaName === "local" && changes.showHours) {
      const newShow = changes.showHours.newValue !== false
      toggleHours.checked = newShow
    }
    if (areaName === "local" && changes.tierSettings) {
      const newSettings = changes.tierSettings.newValue
      if (newSettings) {
        if (newSettings.type === "hours") {
          tierTypeHours.checked = true
        } else {
          tierTypeMoney.checked = true
        }
        updateTierCurrencySymbol(newSettings.type)
        tierGreenInput.value = newSettings.green || 0
        tierYellowInput.value = newSettings.yellow || 50
        tierRedInput.value = newSettings.red || 100
        updateTierTypeRadioStyles()
      }
    }
  })
}

/**
 * Notify all tabs about display mode change
 */
function notifyDisplayModeChange(mode) {
  try {
    chrome.runtime.sendMessage({ action: "setDisplayMode", mode: mode })
  } catch (error) {
    console.error("Error notifying background script:", error)
  }
}

/**
 * Notify all tabs about show hours toggle change
 */
function notifyShowHoursChange(show) {
  try {
    chrome.runtime.sendMessage({ action: "setShowHours", show: show })
  } catch (error) {
    console.error("Error notifying background script:", error)
  }
}

/**
 * Get tier settings from storage
 */
async function getTierSettings() {
  try {
    const result = await chrome.storage.local.get("tierSettings")
    return (
      result.tierSettings || {
        type: "money",
        green: 0,
        yellow: 50,
        red: 100,
      }
    )
  } catch (error) {
    console.error("Error getting tier settings:", error)
    return {
      type: "money",
      green: 0,
      yellow: 50,
      red: 100,
    }
  }
}

/**
 * Set tier settings in storage
 */
async function setTierSettings(settings) {
  try {
    await chrome.storage.local.set({ tierSettings: settings })
    return true
  } catch (error) {
    console.error("Error setting tier settings:", error)
    return false
  }
}

/**
 * Load tier settings into UI
 */
async function loadTierSettings() {
  const settings = await getTierSettings()

  // Set tier type
  if (settings.type === "hours") {
    tierTypeHours.checked = true
  } else {
    tierTypeMoney.checked = true
  }

  // Update currency symbol based on type
  updateTierCurrencySymbol(settings.type)

  // Set tier values
  tierGreenInput.value = settings.green || 0
  tierYellowInput.value = settings.yellow || 50
  tierRedInput.value = settings.red || 100

  // Update radio button styles
  updateTierTypeRadioStyles()
}

/**
 * Update currency symbol based on tier type
 */
function updateTierCurrencySymbol(type) {
  const currencySymbols = document.querySelectorAll(".tier-currency")
  const descriptions = document.querySelectorAll(".tier-description")

  if (type === "hours") {
    currencySymbols.forEach((el) => {
      el.textContent = "h"
    })
    // Update descriptions for hours
    if (descriptions.length >= 3) {
      descriptions[0].textContent = "Below this amount"
      descriptions[1].textContent = "Up to this amount"
      descriptions[2].textContent = "Above this amount"
    }
  } else {
    currencySymbols.forEach((el) => {
      el.textContent = "$"
    })
    // Update descriptions for money
    if (descriptions.length >= 3) {
      descriptions[0].textContent = "Below this amount"
      descriptions[1].textContent = "Up to this amount"
      descriptions[2].textContent = "Above this amount"
    }
  }
}

/**
 * Update tier type radio button styles
 */
function updateTierTypeRadioStyles() {
  const moneyOption = document.getElementById("option-tier-money")
  const hoursOption = document.getElementById("option-tier-hours")

  if (tierTypeMoney.checked) {
    moneyOption.classList.add("checked")
    hoursOption.classList.remove("checked")
  } else {
    moneyOption.classList.remove("checked")
    hoursOption.classList.add("checked")
  }
}

/**
 * Save tier settings
 */
async function saveTierSettings() {
  const type = tierTypeMoney.checked ? "money" : "hours"
  const green = parseFloat(tierGreenInput.value) || 0
  const yellow = parseFloat(tierYellowInput.value) || 50
  const red = parseFloat(tierRedInput.value) || 100

  // Validate: yellow should be >= green, red should be >= yellow
  if (yellow < green) {
    tierYellowInput.style.borderColor = "#ea4335"
    return
  }
  if (red < yellow) {
    tierRedInput.style.borderColor = "#ea4335"
    return
  }

  // Reset border colors
  tierGreenInput.style.borderColor = "#a7cab6"
  tierYellowInput.style.borderColor = "#a7cab6"
  tierRedInput.style.borderColor = "#a7cab6"

  const settings = {
    type: type,
    green: green,
    yellow: yellow,
    red: red,
  }

  const success = await setTierSettings(settings)

  if (success) {
    // Show success message
    tierSuccessMessage.style.display = "block"
    setTimeout(() => {
      tierSuccessMessage.style.display = "none"
    }, 2000)

    // Notify background script
    try {
      chrome.runtime.sendMessage({
        action: "setTierSettings",
        settings: settings,
      })
    } catch (error) {
      console.error("Error notifying background script:", error)
    }
  }
}

/**
 * Show tier success message
 */
function showTierSuccess() {
  tierSuccessMessage.style.display = "block"
  setTimeout(() => {
    tierSuccessMessage.style.display = "none"
  }, 2000)
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}
