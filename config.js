/**
 * Google Sheet wiring
 * 1) EDIT_SHEET_URL: the editable sheet link (Share -> Anyone with the link can EDIT)
 * 2) PUBLISHED_CSV_URL: File -> Share -> Publish to web -> CSV link (read-only)
 */
const EDIT_SHEET_URL = "PASTE_YOUR_EDITABLE_GOOGLE_SHEET_LINK_HERE";
const PUBLISHED_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXRa9t1KwcU64FC4DxcUgyiQdN2G-XCXnrvIjKQicoRwrUFCCyi0E7B8_GjaA-dkjFdhiZ_1n7xjbf/pub?output=csv";

// Optional display timezone (IANA). Leave blank to use viewer's local timezone.
const DISPLAY_TZ = "America/Phoenix";

window.CALENDAR_CONFIG = { EDIT_SHEET_URL, PUBLISHED_CSV_URL, DISPLAY_TZ };
