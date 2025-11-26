/**
 * Background service worker for extension lifecycle and storage management
 */

const STORAGE_KEY = "hourlyWage"
const DEFAULT_WAGE = 0

/**
 * Initialize extension on installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Set default wage on first install
    chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_WAGE }, () => {
      console.log("Extension installed. Default wage set.")
    })
  } else if (details.reason === "update") {
    console.log("Extension updated.")
  }
})

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getWage") {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      sendResponse({ wage: result[STORAGE_KEY] || DEFAULT_WAGE })
    })
    return true // Keep message channel open for async response
  }

  if (request.action === "setWage") {
    const wage = request.wage

    // Validate wage
    if (typeof wage !== "number" || isNaN(wage) || wage < 0) {
      sendResponse({ success: false, error: "Invalid wage value" })
      return
    }

    chrome.storage.local.set({ [STORAGE_KEY]: wage }, () => {
      // Notify all tabs to reprocess prices immediately
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          // Send reprocess message with a small delay to ensure storage is updated
          setTimeout(() => {
            chrome.tabs
              .sendMessage(tab.id, { action: "reprocess" })
              .catch(() => {
                // Ignore errors for tabs that don't have content script
              })
          }, 50)
        })
      })

      sendResponse({ success: true })
    })
    return true // Keep message channel open for async response
  }

  if (request.action === "getPrices") {
    // Forward to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "getPrices" },
          (response) => {
            sendResponse(response)
          }
        )
      } else {
        sendResponse({ prices: [] })
      }
    })
    return true // Keep message channel open for async response
  }

  if (request.action === "setDisplayMode") {
    const mode = request.mode

    // Validate mode
    if (mode !== "side-by-side" && mode !== "replace") {
      sendResponse({ success: false, error: "Invalid display mode" })
      return
    }

    chrome.storage.local.set({ displayMode: mode }, () => {
      // Notify all tabs to update display mode
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, { action: "setDisplayMode", mode: mode })
            .catch(() => {
              // Ignore errors for tabs that don't have content script
            })
        })
      })

      sendResponse({ success: true })
    })
    return true // Keep message channel open for async response
  }

  if (request.action === "setShowHours") {
    const show = request.show !== false

    chrome.storage.local.set({ showHours: show }, () => {
      // Notify all tabs to update show hours state
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, { action: "setShowHours", show: show })
            .catch(() => {
              // Ignore errors for tabs that don't have content script
            })
        })
      })

      sendResponse({ success: true })
    })
    return true // Keep message channel open for async response
  }

  if (request.action === "reprocessAll") {
    // Force reprocess all tabs immediately
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { action: "reprocess" }).catch(() => {
          // Ignore errors for tabs that don't have content script
        })
      })
    })

    sendResponse({ success: true })
    return true
  }
})

/**
 * Handle storage changes
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[STORAGE_KEY]) {
    console.log("Hourly wage updated:", changes[STORAGE_KEY].newValue)

    // Notify all tabs to reprocess with a small delay to ensure storage is ready
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, { action: "reprocess" }).catch(() => {
            // Ignore errors
          })
        }, 100)
      })
    })
  }

  if (areaName === "local" && changes.displayMode) {
    console.log("Display mode updated:", changes.displayMode.newValue)

    // Notify all tabs to update display mode
    const newMode = changes.displayMode.newValue || "side-by-side"
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs
          .sendMessage(tab.id, { action: "setDisplayMode", mode: newMode })
          .catch(() => {
            // Ignore errors
          })
      })
    })
  }

  if (areaName === "local" && changes.showHours) {
    console.log("Show hours updated:", changes.showHours.newValue)

    // Notify all tabs to update show hours state
    const newShow = changes.showHours.newValue !== false
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs
          .sendMessage(tab.id, { action: "setShowHours", show: newShow })
          .catch(() => {
            // Ignore errors
          })
      })
    })
  }
})
