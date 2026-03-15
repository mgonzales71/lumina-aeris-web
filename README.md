# Lumina Aeris Web & Worker

This project is a self-contained **Cloudflare Worker** that serves two functions:
1.  **Web App:** A beautiful, single-file PWA for generating wallpapers manually in your browser.
2.  **Shortcuts API:** A backend endpoint that allows Siri Shortcuts to generate context-aware wallpapers.

## 1. Deployment (Cloudflare Workers)

You can deploy this in seconds using the Cloudflare Dashboard:

1.  Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  Go to **Workers & Pages** -> **Create Application** -> **Create Worker**.
3.  Name it `lumina-aeris` (or similar).
4.  Click **Deploy**.
5.  Once deployed, click **Edit Code**.
6.  **Copy the entire content of `worker.js`** from this project and paste it into the editor, replacing the default code.
7.  Click **Save and Deploy**.

Your app is now live at `https://lumina-aeris.<your-subdomain>.workers.dev`.

## 2. Siri Shortcut Setup

To create the "Generate Wallpaper" shortcut that uses your new Worker:

1.  Open the **Shortcuts** app on iOS.
2.  Create a **New Shortcut**.
3.  Add action: **Get Current Location**.
4.  Add action: **Get Contents of URL**.
    *   **URL:** `https://your-worker-url.workers.dev/api/context?lat=`**Latitude**`&lon=`**Longitude**`&city=`**City**
        *   *Tip:* Use the "Select Variable" feature to insert the Latitude/Longitude from the previous location step.
    *   **Method:** GET
5.  Add action: **Get Dictionary from Input**.
6.  Add action: **Get Value for Key** `imageUrl` from the Dictionary.
7.  Add action: **Get Contents of URL** (using the Image URL).
8.  Add action: **Get Value for Key** `poiLabel` from the Dictionary.
9.  Add action: **Overlay Text**.
    *   **Text:** The `poiLabel` variable.
    *   **Image:** The image from step 7.
    *   **Position:** Custom (Bottom Center).
10. Add action: **Set Wallpaper**.

## 3. Web App Usage

Simply visit your Worker's URL in Safari (iOS) or Chrome (Desktop).
*   **Generate:** Tapping "Generate" uses your browser's GPS (or custom city) to create a wallpaper.
*   **Settings:** Customize quality, style, and toggle the POI label overlay.
*   **Save:** After generation, tap "Save Image" to download the result (with the label baked in).
