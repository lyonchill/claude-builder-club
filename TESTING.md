# Testing Guide

## Step 1: Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the `claude-builder-club` directory
5. The extension should now appear in your extensions list

## Step 2: Set Your Hourly Wage

Since the UI hasn't been implemented yet, you'll need to set the hourly wage using the browser console:

### Option A: Using Chrome DevTools Console

1. Open any webpage
2. Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux) to open DevTools
3. Go to the **Console** tab
4. Run this command:

```javascript
chrome.storage.local.set({ hourlyWage: 25 }, () => {
  console.log("Hourly wage set to $25")
})
```

Replace `25` with your desired hourly wage.

### Option B: Using the Extension's Background Script

1. Go to `chrome://extensions/`
2. Find your extension "Price to Hours Converter"
3. Click **"service worker"** link (this opens the background script console)
4. Run:

```javascript
chrome.storage.local.set({ hourlyWage: 25 }, () => {
  console.log("Hourly wage set to $25")
})
```

### Verify Wage is Set

In the console, run:

```javascript
chrome.storage.local.get("hourlyWage", (result) => {
  console.log("Current wage:", result.hourlyWage)
})
```

## Step 3: Test on a Shopping Site

1. Navigate to a shopping website (e.g., Amazon, eBay, Etsy)
2. Open DevTools (`F12` or `Cmd+Option+I`)
3. Go to the **Console** tab
4. Look for log messages like:
   - `"Detected X prices and converted to hours."`

## Step 4: Verify Price Detection

In the console, run:

```javascript
// Get all detected prices
document.querySelectorAll('[data-price-detected="true"]').forEach((el) => {
  const price = el.getAttribute("data-price-value")
  const hours = el.getAttribute("data-hours-formatted")
  console.log(`Price: $${price} = ${hours}`, el)
})
```

This will show you:

- Which elements were detected as prices
- The price values
- The converted hours

## Step 5: Test Dynamic Content

1. On a shopping site, scroll to load more products
2. The extension should automatically detect new prices (check console for messages)
3. Or manually trigger reprocessing:

```javascript
// Send message to content script to reprocess
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { action: "reprocess" })
})
```

## Troubleshooting

### Extension not loading

- Check the console at `chrome://extensions/` for errors
- Make sure all file paths in `manifest.json` are correct

### Prices not detected

- Verify you're on a shopping site (check console for shopping site detection)
- Make sure hourly wage is set (should be > 0)
- Check browser console for any JavaScript errors

### Check if content script is running

In the page console, run:

```javascript
console.log("Content script loaded:", typeof detectPrices !== "undefined")
```

### View all detected prices with conversions

In the page console, run:

```javascript
// This requires the content script to expose the function
// For now, check data attributes on elements
Array.from(document.querySelectorAll('[data-price-detected="true"]')).map(
  (el) => ({
    price: el.getAttribute("data-price-value"),
    hours: el.getAttribute("data-hours-formatted"),
    element: el,
  })
)
```

## Example Test Scenario

1. Set wage to $20/hour: `chrome.storage.local.set({ hourlyWage: 20 })`
2. Visit Amazon product page
3. Check console for "Detected X prices..."
4. Inspect price elements - they should have `data-price-detected`, `data-price-value`, and `data-hours-formatted` attributes
5. A $40 item should show as "2h 0m" (2 hours of work)
