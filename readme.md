# Website Time Blocker

Website Time Blocker is a Chrome extension for setting time limits on websites. When a site's limit is reached, the extension blocks it for a duration you choose.

## Features

- **Custom Time Limits:** Set a daily time allowance in minutes for each website.
- **Custom Block Durations:** Choose how long a site stays blocked, in hours.
- **Time Tracking:** Checks the active tab in the last-focused browser window once per minute. Tracking pauses when the computer is idle.
- **Site Blocking:** When a tracking check detects that the limit has been reached, matching open tabs redirect to the block page.
- **Time Resets:** A site's counter resets when it is next tracked on a new day, and when its block expires.
- **Site Management:** Add and remove websites from the toolbar popup, and view time spent or the scheduled unblock time.

## Installation

1. Clone this repository or download and extract its ZIP.
2. Open Chrome and visit `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the repository folder containing `manifest.json`.

## Usage

### Add a website

1. Click the extension's toolbar icon.
2. Enter a domain in **Website Domain**, such as `youtube.com` or `facebook.com`.
3. Set **Daily Time Limit** in minutes.
4. Set **Block Duration** in hours.
5. Click **Add Website**.

Tracking matches the entered domain after removing a leading `www.`. Add other subdomains separately if you want their browsing time counted. Once a domain is blocked, the blocking rule also covers its subdomains.

### Check time spent

Open the popup to view **Tracked Websites**. Each unblocked site shows its limit, block duration, and time spent. A blocked site shows its scheduled unblock time.

Time is sampled in one-minute increments, so the counter is an estimate rather than a second-by-second timer.

### Remove a website

Click the red **×** next to a site to stop tracking it and remove its block.
