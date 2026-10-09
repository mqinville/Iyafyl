export const THEME_STORAGE_KEY = "theme"

// Runs before paint (inline in <head>) so the saved or system theme never flashes.
export const themeScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}`
