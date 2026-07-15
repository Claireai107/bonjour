const PRIMARY_TABS = {
  "/home": "home",
  "/routine": "routine",
  "/local": "local",
  "/report": "report",
  "/mypage": "my",
};

const AUXILIARY_TABS = {
  "/onboarding": "home",
  "/checkup": "home",
  "/analysis": "home",
  "/simulator": "report",
  "/favorites": "my",
  "/profile-add": "my",
};

/** @param {string} pathname */
function activeTabForPath(pathname) {
  return PRIMARY_TABS[pathname] ?? AUXILIARY_TABS[pathname] ?? null;
}

module.exports = { activeTabForPath };
