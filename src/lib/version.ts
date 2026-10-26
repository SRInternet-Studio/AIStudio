import pkg from "../../package.json";

// Single source of truth for the app version shown in the UI: package.json.
// Any component that displays the version (currently the Sidebar settings
// popover) must import these constants instead of hardcoding a version
// string, so bumping package.json is always reflected after a rebuild.
export const APP_VERSION = pkg.version;
export const APP_RELEASE_URL = `https://github.com/SRInternet-Studio/AIStudio/releases/tag/v${APP_VERSION}`;
