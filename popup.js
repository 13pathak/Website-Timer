// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const addSiteBtn = document.getElementById('addSiteBtn');
    const domainInput = document.getElementById('domain');
    const timeLimitInput = document.getElementById('timeLimit');
    const blockDurationInput = document.getElementById('blockDuration');
    const sitesList = document.getElementById('sitesList');

    // --- Load and Display Sites ---
    function loadSites() {
        chrome.storage.local.get('sites').then(data => {
            const sites = data.sites || {};
            sitesList.innerHTML = ''; // Clear current list to re-render

            if (Object.keys(sites).length === 0) {
                sitesList.innerHTML = '<li class="empty-state">No websites are being tracked.</li>';
                return;
            }

            for (const domain in sites) {
                const site = sites[domain];
                const listItem = document.createElement('li');
                listItem.className = 'site-item';

                const timeLimitMinutes = Math.floor(site.timeLimit / 60);
                const blockDurationHours = Math.floor(site.blockDuration / 3600);
                const timeSpentMinutes = Math.floor(site.timeSpent / 60);

                let detailsText;
                if (site.isBlocked) {
                    const unblockTime = new Date(site.blockedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    detailsText = `<span style="color: #dc3545; font-weight: bold;">Blocked until ${unblockTime}</span>`;
                } else {
                    detailsText = `Limit: ${timeLimitMinutes}m &nbsp;&bull;&nbsp; Block for: ${blockDurationHours}h &nbsp;&bull;&nbsp; Spent: ${timeSpentMinutes}m`;
                }

                listItem.innerHTML = `
                    <div class="site-info">
                        <span class="site-domain">${domain}</span>
                        <span class="site-details">${detailsText}</span>
                    </div>
                    <button class="remove-btn" data-domain="${domain}" title="Remove ${domain}">&times;</button>
                `;
                sitesList.appendChild(listItem);
            }
        });
    }

    // --- Add a New Site ---
    addSiteBtn.addEventListener('click', () => {
        let domain = domainInput.value.trim();
        const timeLimit = parseInt(timeLimitInput.value, 10) * 60; // Convert to seconds
        const blockDuration = parseInt(blockDurationInput.value, 10) * 3600; // Convert to seconds

        // Validate input
        if (!domain || isNaN(timeLimit) || isNaN(blockDuration) || timeLimit <= 0 || blockDuration <= 0) {
            domainInput.style.borderColor = 'red';
            setTimeout(() => { domainInput.style.borderColor = '#ced4da'; }, 2000);
            return;
        }

        // Clean the domain to a standard format (e.g., "https://www.youtube.com/watch..." -> "youtube.com")
        try {
            const url = new URL(domain.startsWith('http') ? domain : `http://${domain}`);
            domain = url.hostname.replace(/^www\./, '');
        } catch (error) {
            domainInput.style.borderColor = 'red';
            return;
        }

        chrome.storage.local.get('sites').then(data => {
            const sites = data.sites || {};
            sites[domain] = {
                timeLimit: timeLimit,
                blockDuration: blockDuration,
                timeSpent: 0,
                isBlocked: false,
                blockedUntil: null,
                ruleId: null,
                lastResetDate: new Date().toLocaleDateString()
            };

            chrome.storage.local.set({ sites }).then(() => {
                domainInput.value = '';
                chrome.runtime.sendMessage({ action: 'updateRules' }); // Ask background to update rules
                loadSites(); // Refresh the popup list
            });
        });
    });

    // --- Remove a Site (using event delegation for efficiency) ---
    sitesList.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-btn')) {
            const domainToRemove = event.target.dataset.domain;
            chrome.storage.local.get('sites').then(data => {
                const sites = data.sites || {};
                delete sites[domainToRemove];
                chrome.storage.local.set({ sites }).then(() => {
                    chrome.runtime.sendMessage({ action: 'updateRules' }); // Ask background to update rules
                    loadSites(); // Refresh the popup list
                });
            });
        }
    });

    // --- Initial Load ---
    loadSites();
});