// Shared handles to the app shell. app.js fills these in; views import them without circular imports.
export const shell = {
  stage: null, // <div id="stage"> — views render here
  page: null,
  toc: null,
  dock: null,
  setCrumbs: () => {},
  setDock: () => {},
  toggleDock: () => {},
  focusStage: () => {},
  openNotes: () => {},
};
