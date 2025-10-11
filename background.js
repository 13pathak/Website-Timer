// background.js

// --- Initialization: Sets up the extension when installed ---
chrome.runtime.onInstalled.addListener(() => {
  // Initialize storage with default values if they aren't already set
  chrome.storage.local.get(['sites', 'nextRuleId']).then(result => {
    if (!result.sites) {
      chrome.storage.local.set({ sites: {} });
    }
    if (!result.nextRuleId) {
      // Rule IDs for blocking must be 1 or higher
      chrome.storage.local.set({ nextRuleId: 1 });
    }
  });

  // Create an alarm that will fire every minute to track time
  chrome.alarms.create('siteTimeTracker', {
    delayInMinutes: 1,
    periodInMinutes: 1
  });

  // Perform an initial sync to set up blocking rules for any existing sites
  updateBlockingRules();
});

// --- Alarm Listener: The core logic that runs every minute ---
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'siteTimeTracker') {
    const data = await chrome.storage.local.get('sites');
    if (!data.sites) return;

    // Don't track time if the user is idle (e.g., away from the computer)
    const idleState = await chrome.idle.queryState(30); // 30-second idle threshold
    if (idleState !== 'active') {
      console.log("User is idle. Pausing timer.");
      return;
    }

    // Get the currently active tab
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if (activeTab && activeTab.url) {
      const url = new URL(activeTab.url);
      const domain = url.hostname.replace(/^www\./, ''); // Clean domain

      const siteKey = Object.keys(data.sites).find(key => key === domain);

      if (siteKey) {
        const site = data.sites[siteKey];
        const today = new Date().toLocaleDateString();

        // Reset daily time if it's a new day
        if (site.lastResetDate !== today) {
          site.timeSpent = 0;
          site.lastResetDate = today;
        }

        // If the site isn't blocked, add 60 seconds to the time spent
        if (!site.isBlocked) {
          site.timeSpent += 60;
        }

        // If time limit is reached, block the site
        if (site.timeSpent >= site.timeLimit && !site.isBlocked) {
          site.isBlocked = true;
          // Calculate when the block should end
          site.blockedUntil = Date.now() + site.blockDuration * 1000;
          console.log(`Blocking ${siteKey} until ${new Date(site.blockedUntil)}`);

          // --- MODIFIED SECTION: Force-redirect open tabs ---
          // The URL pattern now includes a wildcard for subdomains (like www.) to make matching more reliable.
          const queryUrl = `*://*.${domain}/*`;
          console.log(`Time limit reached. Querying for tabs with URL: ${queryUrl}`);
          const tabsToBlock = await chrome.tabs.query({ url: queryUrl });
          
          console.log(`Found ${tabsToBlock.length} tabs to block.`);

          for (const tab of tabsToBlock) {
            if (tab.id) {
              await chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('block.html') });
              console.log(`Redirected tab ID: ${tab.id}`);
            }
          }
          // --- END MODIFIED SECTION ---
        }

        await chrome.storage.local.set({ sites: data.sites });
      }
    }

    // After any potential changes, update the blocking rules
    await updateBlockingRules();
  }
});

// --- Rule Management: Updates which sites are actively blocked ---
async function updateBlockingRules() {
  const data = await chrome.storage.local.get(['sites', 'nextRuleId']);
  if (!data.sites) return;

  let sites = data.sites;
  let nextRuleId = data.nextRuleId || 1;
  const rulesToAdd = [];
  const ruleIdsToRemove = [];

  // Get all existing rules to prepare for a clean update
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  if (existingRules.length > 0) {
    ruleIdsToRemove.push(...existingRules.map(rule => rule.id));
  }

  for (const domain in sites) {
    const site = sites[domain];

    // Check if any site's block duration has expired
    if (site.isBlocked && Date.now() > site.blockedUntil) {
      site.isBlocked = false;
      site.timeSpent = 0; // Reset time after block ends
      site.blockedUntil = null;
      console.log(`Unblocking ${domain}.`);
    }

    // If a site is marked as blocked, create a blocking rule for it
    if (site.isBlocked) {
      // Assign a unique ID for the rule if it doesn't have one
      if (!site.ruleId) {
        site.ruleId = nextRuleId++;
      }
      rulesToAdd.push({
        id: site.ruleId,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: { extensionPath: '/block.html' }
        },
        condition: {
          urlFilter: `||${domain}`, // Matches the domain and its subdomains
          resourceTypes: ['main_frame']
        }
      });
    } else {
      // If a site is not blocked, ensure its ruleId is cleared
      if (site.ruleId) {
        site.ruleId = null;
      }
    }
  }

  // Atomically update the rules: remove old ones and add new ones
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ruleIdsToRemove,
    addRules: rulesToAdd
  });

  // Save the updated site data and the next available rule ID
  await chrome.storage.local.set({ sites, nextRuleId });
  console.log("Blocking rules have been synchronized.");
}

// --- Communication: Listens for messages from the popup ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // If the popup asks to update, trigger an immediate rule sync
  if (request.action === 'updateRules') {
    updateBlockingRules().then(() => sendResponse({ status: 'success' }));
    return true; // Keep the message channel open for the async response
  }
});

