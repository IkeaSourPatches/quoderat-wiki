import '@fontsource/stix-two-text/400.css';
import '@fontsource/stix-two-text/400-italic.css';
import '@fontsource/stix-two-text/600.css';
import { SaiGame } from './game/SaiGame';
import { AxiomMachine } from './game/AxiomMachine';
import { VeraDig } from './game/VeraDig';
import { GameShelf } from './game/GameShelf';
import { LoreHome } from './LoreHome';
import { TimelineTower } from './TimelineTower';
// =============================================================================
// QUODERAT WIKI — root entry file.
// This module builds the MUI theme, defines the <App /> component, and mounts
// the React tree into #root. Every line of code below is commented.
// =============================================================================

// Import React plus the two hooks used below: useEffect and useState.
import React, { useEffect, useState } from "react";

// Import createRoot, the React 18+ API that renders a tree into a DOM node.
import { createRoot } from "react-dom/client";

// Import the Material UI pieces used for theming, buttons, dialogs, and toasts.
import {
  ThemeProvider, // Makes the custom theme available to every child component.
  createTheme, // Creates a theme object from our design tokens.
  Button, // Material UI button used in the toolbar and dialog.
  Chip, // Small pill label used in the character dossier.
  TextField, // Multiline text area used in the Markdown editor.
  Dialog, // Modal container for the Markdown workspace.
  DialogTitle, // Heading row inside the dialog.
  DialogContent, // Scrollable body area inside the dialog.
  DialogActions, // Footer row holding the dialog buttons.
  Alert, // Colored banner for errors and informational messages.
  Snackbar, // Transient toast shown after a Markdown download.
} from "@mui/material";

// Import the Lucide icons used throughout the interface.
import {
  BookOpen, // Icon for the "All entries" navigation item.
  Search, // Magnifier shown inside the search box.
  ArrowUpRight, // Diagonal arrow shown on entry cards and related links.
  Feather, // Quill icon for the author line and the edit button.
  ChevronRight, // Chevron separator in the breadcrumb trail.
  Menu, // Hamburger icon that opens the mobile sidebar.
  X, // Close icon for the drawer and clear icon for search.
  Globe2, // Icon for the "World & laws" category.
  Scale, // Icon for "The pantheon" category.
  Gamepad2,
  Users, // Icon for the "Characters" category.
  Flame, // Icon for the "Creatures" category.
  Bookmark, // Icon for saved pages and the save toggle.
  Check, // Checkmark shown when the current page is already saved.
  ScrollText, // Icon for "Timeline" and for the source-note footer.
} from "lucide-react";

// Import the Markdown renderer that turns article bodies into React elements.
import Markdown from "react-markdown";

// Import the GitHub-Flavored Markdown plugin (tables, strikethrough, tasks).
import remarkGfm from "remark-gfm";

// Import the API helpers and the shared Article type from our local module.
import { getArticles, sourceMode, type Article } from "./api";

// Import the global stylesheet that defines the wiki layout.
import "./styles.css";
import { WorldHome } from "./WorldHome";
import { SuggestionBox } from "./SuggestionBox";
import { localizeArticle, translate, type Language } from "./i18n";

// Build the Material UI theme once, at module scope, so it stays stable.
const theme = createTheme({
  // Color palette for the whole application.
  palette: {
    // Primary brand color used by buttons and active elements.
    primary: { main: "#2d5548" }, // Deep archive green.
    // Background colors for surfaces and the page.
    background: { default: "#f7f5ef" }, // Warm paper tone.
  }, // End of the palette block.
  // Typography settings for all text.
  typography: {
    // Humanist sans-serif stack that falls back through common system fonts.
    fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
    // Button-specific typography overrides.
    button: {
      // Stop MUI from uppercasing button labels.
      textTransform: "none",
      // Use a semi-bold weight for button text.
      fontWeight: 600,
    }, // End of the button typography block.
  }, // End of the typography block.
  // Global shape settings.
  shape: {
    // Slightly rounded corners on cards, buttons, and dialogs.
    borderRadius: 5,
  }, // End of the shape block.
}); // End of the theme definition.

// Static sidebar categories; each item pairs a display label with a Lucide icon.
const categories = [
  // Category one: worldbuilding laws and physical rules.
  { name: "World & laws", icon: Globe2 },
  // Category two: gods and the pantheon.
  { name: "The pantheon", icon: Scale },
  // Category three: characters and law holders.
  { name: "Characters", icon: Users },
  // Category four: creatures that inhabit the world.
  { name: "Creatures", icon: Flame },
  // Category five: chronological history.
  { name: "Timeline", icon: ScrollText },
]; // End of the categories array.

// Decorative law emblems identify characters without inventing canonical appearances.
const emblems: Record<string, string> = {
  kalyan: '⊞', sai: '◈', akhil: '…', zaid: '⚘', vera: '≋',
  ersetu: '◇', imaq: '≈', salkhi: '↝', illapa: 'ϟ',
  'ilar-hesabu': 'ℕ', ensa: '∈', tertia: '∨', 'the-spear-and-shield': '¬',
  'the-open-question': '?', 'voss-halloran': 'Σ', 'rudolf-ludwig': 'Δ',
  rushd: '→', 'aldous-vane': '⋮', 'lian-xiu': '⇌', 'mattias-krane': '◎',
};

// Display notation, not additional canon. Social-law formulas are visual summaries.
// Incompleteness assumes a consistent, effectively axiomatized arithmetic theory T.
const lawExpressions: Record<string, string> = {
  'ilar-hesabu': 'S(n) = n + 1',
  ensa: 'A = B ⇔ ∀x (x ∈ A ⇔ x ∈ B)',
  tertia: 'p ∨ ¬p',
  'the-spear-and-shield': '¬(p ∧ ¬p)',
  'the-open-question': '∃φ : T ⊬ φ ∧ T ⊬ ¬φ',
  'voss-halloran': 'ΔE = 0',
  // Rudolf claims strict increase in canon, rather than the usual weak inequality.
  'rudolf-ludwig': 'ΔS > 0',
  rushd: 't₁ < t₂ ∧ Q(t₂) := f(P(t₁), U)',
  'aldous-vane': '∀ O ∈ Organizations, ∃ E ⊂ O : |E| < ½|O| ∧ ◇Rules(E, O)',
  'lian-xiu': 'Qᴅ(P*) = Qˢ(P*)',
  'mattias-krane': '□∀X [Target(X) → ¬Reliable(X)]',
  // Finite sets A and B, with f mapping A to B.
  kalyan: '|A| > |B| ⇒ ∀f : A → B, ∃x ≠ y : f(x) = f(y)',
  sai: 'Planar(G) ⇒ χ(G) ≤ 4',
  // H ranges over total computable Boolean functions; P(x)↓ means it halts.
  akhil: '¬∃H ∈ TotalComputable ∀P, x : H(P, x) = 1 ⇔ P(x)↓',
  // A Mendelian segregation example, not a claim that all traits follow this ratio.
  zaid: 'Aa × Aa ⇒ P(AA) : P(Aa) : P(aa) = 1 : 2 : 1',
  vera: 'Undisturbed(L) ∧ Below(a, b) ⇒ Age(a) > Age(b)',
};

// Root component that holds all application state and renders the UI.
function App() {
  // All articles returned by the API; starts empty until the fetch resolves.
  const [rawArticles, setArticles] = useState<Article[]>([]);
  // Persist a display preference without changing article IDs or bookmarks.
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem('quoderat-language') === 'zh' ? 'zh' : 'en'; }
    catch { return 'en'; }
  });
  const t = (text: string) => translate(language, text);
  const articles = rawArticles.map((entry) => localizeArticle(entry, language));
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = language === 'zh' ? '证毕 — 一个力量源于法则的世界' : 'Quoderat — A World of Living Laws';
    try { localStorage.setItem('quoderat-language', language); } catch { /* Preference still works in memory. */ }
  }, [language]);

  // Human-readable error message shown when loading fails.
  const [error, setError] = useState("");

  // Slug of the open article, initialised from the URL hash.
  const [slug, setSlug] = useState(
    // Decode the hash without its leading "#"; fall back to the default article.
    decodeURIComponent(location.hash.slice(1)) || "home",
  ); // End of the slug state declaration.

  // Current text typed into the search box.
  const [query, setQuery] = useState("");

  // Currently selected sidebar category.
  const [category, setCategory] = useState(location.hash === "#saved" ? "Saved pages" : location.hash.startsWith("#lore/") ? decodeURIComponent(location.hash.slice(6)) : location.hash === "#browse" ? "All entries" : "Characters");

  // Whether the mobile navigation drawer is open.
  const [mobile, setMobile] = useState(false);

  // Whether the Markdown editing dialog is open.
  const [editing, setEditing] = useState(false);

  // Working copy of the article body inside the editor dialog.
  const [draft, setDraft] = useState("");

  // Message rendered by the transient Snackbar toast.
  const [notice, setNotice] = useState("");

  // False renders Markdown; true shows the raw Markdown source.
  const [source, setSource] = useState(false);

  // Slugs of bookmarked pages, restored lazily from localStorage.
  const [saved, setSaved] = useState<string[]>(() => {
    // Guard against malformed or missing stored data.
    try {
      // Parse the stored JSON array, or default to an empty array.
      return JSON.parse(localStorage.getItem("quoderat-bookmarks") || "[]");
    } catch { // Recover from malformed or missing stored data.
      // If parsing fails, start with no bookmarks instead of crashing.
      return [];
    } // End of the try/catch body.
  }); // End of the lazy saved-state initialiser.

  // Load the articles once on mount and keep the slug in sync with the hash.
  useEffect(() => {
    // Fetch every article, store the result, and surface failures as an error.
    getArticles()
      // Success: replace the empty article list with the fetched data.
      .then(setArticles)
      // Failure: store the error message so the Alert can display it.
      .catch((e) => setError(e.message));

    // Read the current hash (minus "#"), falling back to the default article.
    const onHash = () =>
      { const next = decodeURIComponent(location.hash.slice(1)) || "home";
        setSlug(next);
        if (next === 'characters') setCategory('Characters');
        if (next.startsWith('lore/')) setCategory(next.slice(5));
        if (next === 'saved') setCategory('Saved pages');
        if (next === 'browse') setCategory('All entries');
      }; // Store the decoded slug, falling back to the default article.

    // Listen for back/forward navigation and manual hash edits.
    addEventListener("hashchange", onHash);

    // Remove the listener when the component unmounts.
    return () => removeEventListener("hashchange", onHash);
  }, []); // Empty dependency array: run this effect only once.

  // The article that matches the current slug, or undefined if none matches.
  const article = articles.find((a) => a.slug === slug);
  const characterList = articles.filter(a => a.category === 'Characters');
  const characterIndex = characterList.findIndex(a => a.slug === slug);
  const loreActive = slug === 'lore' || slug.startsWith('lore/') || (!!article && article.category !== 'Characters');

  // Articles that satisfy both the category filter and the search query.
  const filtered = articles.filter(
    (a) => // For each article, evaluate the category and search conditions.
      // Category condition: "All entries" passes everything.
      ((category === "All lore" ? a.category !== "Characters" : category === "All entries") ||
        // "Saved pages" passes only bookmarked slugs.
        (category === "Saved pages"
          ? saved.includes(a.slug) // Saved pages: keep only bookmarked slugs.
          : // Every other category matches the article's category field.
            a.category === category)) &&
      // Search condition: title or body contains the query, case-insensitively.
      [a.title, a.body, rawArticles.find((entry) => entry.slug === a.slug)?.title,
        rawArticles.find((entry) => entry.slug === a.slug)?.body, a.translations?.zh?.title,
        a.translations?.zh?.body].join(' ').toLowerCase().includes(query.toLowerCase()),
  ); // End of the filtered-articles computation.

  // Switch to a category listing and clear the open article.
  const browse = (cat: string) => {
    // Remember which category the user picked.
    setCategory(cat);
    // Clear the slug so the list view renders instead of an article.
    setSlug("");
    // Reflect the list view in the URL hash.
    location.hash = cat === "Characters" ? "characters" : cat === "Saved pages" ? "saved" : cat === "All entries" ? "browse" : `lore/${encodeURIComponent(cat)}`;
    setQuery("");
    window.scrollTo(0, 0);
    // Close the mobile drawer after choosing a category.
    setMobile(false);
  }; // End of the browse helper.

  // Open a specific article and reset transient view state.
  const navigate = (s: string) => {
    // Update the URL hash so the article is deep-linkable.
    location.hash = s;
    // Set the slug that drives which article renders.
    setSlug(s);
    // Clear any active search so it does not hide the chosen article.
    setQuery("");
    // Close the mobile drawer after navigation.
    setMobile(false);
    // Switch back to rendered Markdown from source view.
    setSource(false);
    // Scroll to the top of the new article.
    window.scrollTo(0, 0);
  }; // End of the navigate helper.

  // Add or remove the currently open article from the saved list.
  const toggleSave = () => {
    // Do nothing when no article is open.
    if (!article) return;
    // Build the next saved list: remove the slug if present, otherwise add it.
    const next = saved.includes(slug)
      ? // Already saved: filter it out.
        saved.filter((x) => x !== slug)
      : // Not saved yet: append it.
        [...saved, slug];
    // Update React state so the UI re-renders.
    setSaved(next);
    // Persist the new list so bookmarks survive a reload.
    localStorage.setItem("quoderat-bookmarks", JSON.stringify(next));
  }; // End of the toggleSave helper.

  // Extract level-2 and level-3 Markdown headings for the contents list.
  const headings =
    article?.body // Only compute headings when an article is open.
      // Split the body into individual lines.
      .split("\n")
      // Keep only lines that start with "## " or "### ".
      .filter((x) => /^#{2,3} /.test(x))
      // Strip the leading "#" characters and space from each heading.
      .map((x) => x.replace(/^#+ /, "")) || []; // Fall back to an empty list.

  // Convert heading text into a URL-safe id used by anchor links.
  const headingId = (s: string) =>
    // Lowercase the text and collapse every non-alphanumeric run into a dash.
    s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-");

  // Render the complete application UI.
  return (
    <>{/* Fragment: groups the sidebar, workspace, and footer without a wrapper. */}
      {/* ========================== SIDEBAR ========================== */}
      <aside
        // Add the "visible" class only while the mobile drawer is open.
        className={`navigation ${mobile ? "visible" : ""}`}
      >{/* Sidebar content starts here. */}
        {/* Brand link that always returns to the default article. */}
        <a
          // Styling hook for the wordmark block.
          className="brand"
          // Native anchor target, useful before React handles the click.
          href="#home"
          // Navigate through React instead of reloading the page.
          onClick={() => navigate("home")}
        >{/* Brand link content starts here. */}
          {/* Decorative Q monogram with a sparkle inside it. */}
          <span className="brand-symbol">
            Q{/* The letter Q is the main glyph. */}<span>✦</span>{/* Sparkle accent. */}
          </span>
          {/* Wordmark plus the small "THE LIVING ARCHIVE" subtitle. */}
          <span>
            {t("QUODERAT")}{/* Main wordmark text. */}
            <small>{language === "zh" ? "原创奇幻世界" : "A WORLD OF LIVING LAWS"}</small>{/* Subtitle under the wordmark. */}
          </span>
        </a>{/* End of the brand link. */}

        {/* Close button shown only on mobile screens. */}
        <button
          // Styling hooks for positioning and the icon-button look.
          className="mobile-close icon-button"
          // Close the drawer when tapped.
          onClick={() => setMobile(false)}
          // Accessible name for screen readers.
          aria-label={t("Close navigation")}
        >{/* Close button content starts here. */}
          <X size={20} />{/* 20px close icon. */}
        </button>

        {/* Thin separator line under the brand block. */}
        <div className="nav-divider" />

        {/* Section label above the archive entries. */}
        <p className="nav-label">{language === "zh" ? "走进证毕" : "ENTER QUODERAT"}</p>
        <button className={`nav-item ${slug === "home" ? "active" : ""}`} onClick={() => navigate("home")}><Globe2 size={18}/>{language === "zh" ? "世界首页" : "The world"}<span>↗</span></button>

        <button className={`nav-item ${slug === 'characters' || article?.category === 'Characters' ? 'active' : ''}`} onClick={() => browse('Characters')}><Users size={18}/>{t('Characters')}<span>{characterList.length}</span></button>
        <button className={`nav-item ${slug.startsWith('play') ? 'active' : ''}`} onClick={() => navigate('play')}><Gamepad2 size={18}/>{language === 'zh' ? '游玩' : 'Play'}</button>
        <button className={`nav-item ${loreActive ? 'active' : ''}`} onClick={() => navigate('lore')}><BookOpen size={18}/>{t('Lore')}<span>↗</span></button>
        {loreActive && <div className="lore-subnav">
          <p className="nav-label">{t('LORE SECTIONS')}</p>
          {categories.filter(({name}) => name !== 'Characters').map(({name, icon: Icon}) => <button key={name} className={`nav-item ${article?.category === name || (!article && slug.startsWith('lore/') && category === name) ? 'active' : ''}`} onClick={() => browse(name)}><Icon size={16}/>{t(name)}</button>)}
        </div>}

        {/* Separator before the saved-pages entry. */}
        <div className="nav-divider" />

        {/* Saved pages listing. */}
        <button
          // Standard navigation-item styling.
          className="nav-item"
          // Show only bookmarked articles.
          onClick={() => browse("Saved pages")}
        >{/* Saved-pages button content starts here. */}
          <Bookmark size={18} />{/* 18px bookmark icon. */}
          {t("Saved pages")}{/* Visible button label. */}
          <span>{saved.length}</span>{/* Number of bookmarked articles. */}
        </button>

        <button className={`nav-item ${slug === "suggestions" ? "active" : ""}`} onClick={() => navigate("suggestions")}><Feather size={18}/>{language === "zh" ? "提问与建议" : "Questions & suggestions"}</button>

        {/* Decorative footer block at the bottom of the sidebar. */}
        <div className="nav-bottom">
          <div className="orbit">✧</div>{/* Floating sparkle ornament. */}
          <p>{/* Two-line tagline. */}
            {t("A world built on proof.")}{/* First tagline line. */}
            <br />{/* Manual line break. */}
            {t("An archive still unfolding.")}{/* Second tagline line. */}
          </p>
          <small>QUOD ERAT DEMONSTRANDUM</small>{/* Latin motto. */}
          <div className="edition">
            <span /> {t(sourceMode)}{/* Dot plus the active data source name. */}
          </div>
        </div>{/* End of the sidebar footer block. */}
      </aside>{/* End of the sidebar. */}

      {/* ========================= WORKSPACE ========================= */}
      <div className="workspace">
        {/* Sticky top bar: menu, breadcrumb, search, and avatar. */}
        <header className="topbar">
          {/* Hamburger button that opens the mobile drawer. */}
          <button
            // Styling hooks for mobile visibility and icon-button look.
            className="mobile-menu icon-button"
            // Open the drawer.
            onClick={() => setMobile(true)}
            // Accessible name for screen readers.
            aria-label={t("Open navigation")}
          >{/* Hamburger button content starts here. */}
            <Menu size={21} />{/* 21px hamburger icon. */}
          </button>

          {/* Breadcrumb showing "Archive" plus the active category. */}
          <div className="breadcrumb">Quoderat <ChevronRight size={13} /> {(slug === "home" ? (language === "zh" ? "世界首页" : "The world") : slug.startsWith("play") ? (language === "zh" ? "游玩" : "Play") : slug === "lore" ? t("Lore") : slug === "suggestions" ? (language === "zh" ? "提问与建议" : "Questions & suggestions") : t(article?.category || category))}</div>

          {/* Search input wrapped with its icon and clear button. */}
          <div className="search-wrap">
            <Search size={17} />{/* 17px magnifier icon. */}
            <input
              // Accessible name for screen readers.
              aria-label={t("Search the archive")}
              // Hint text shown when the field is empty.
              placeholder={t("Search the archive…")}
              // Controlled value bound to the query state.
              value={query}
              // Update state on every keystroke and leave article view.
              onChange={(e) => {
                // Store the latest text.
                setQuery(e.target.value);
                // Only leave the article when the user actually typed something.
                if (e.target.value) {
                  // Clear the slug so the results list renders.
                  setSlug("");
                  // Search across every category.
                  setCategory("All entries");
                } // End of the non-empty check.
              }} // End of the onChange handler.
            />
            {/* Clear button appears only while a query is present. */}
            {query && (
              <button // Conditional clear button.
                // Icon-button styling.
                className="icon-button"
                // Accessible name for screen readers.
                aria-label={t("Clear search")}
                // Wipe the query and return to the full list.
                onClick={() => setQuery("")}
              >{/* Close icon content starts here. */}
                <X size={14} />{/* 14px clear icon. */}
              </button>
            )}{/* End of the conditional clear button. */}
          </div>{/* End of the search wrapper. */}

          <div className="language-toggle" role="group" aria-label="Language / 语言">
            <button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
            <button type="button" lang="zh-CN" aria-pressed={language === 'zh'} onClick={() => setLanguage('zh')}>中文</button>
          </div>
        </header>{/* End of the top bar. */}

        {/* Error banner, loading message, or the main page layout. */}
        {error ? (
          // Show the stored error message in a red alert.
          <Alert severity="error">{t(error)}</Alert>
        ) : !articles.length ? ( // Otherwise, decide between loading and the page.
          // Show a loading message while the article list is still empty.
          <p className="loading">{t("Opening the archive…")}</p>
        ) : ( // Articles are loaded: render the page layout.
          // Articles are loaded: render the two-column page.
          <div className={`page ${!article || (slug === "timeline" && !query) ? "catalogue-page" : "reading-page"}`}>
            {/* Main column: either an article reader or the entry list. */}
            <main>
              {slug === "play" && !query ? <GameShelf language={language} open={navigate}/> : slug === "play/sai" && !query ? <SaiGame language={language} open={navigate}/> : slug === "play/axiom" && !query ? <AxiomMachine language={language} open={navigate}/> : slug === "play/vera" && !query ? <VeraDig language={language} open={navigate}/> : slug === "suggestions" && !query ? <SuggestionBox language={language}/> : slug === "home" && !query ? <WorldHome language={language} articles={articles} open={navigate} browse={browse} emblems={emblems} lawExpressions={lawExpressions}/> : slug === "lore" && !query ? <LoreHome language={language} articles={articles} browse={browse}/> : slug === "timeline" && !query && article ? <TimelineTower language={language} article={article}/> : article ? ( // Article view when a slug matches.
                <>{/* Fragment for the article view. */}
                  {/* Eyebrow line above the title. */}
                  <div className="eyebrow">
                    <span /> {t(article.category)} <span className="eyebrow-line" /> {t("SOURCE NOTES")}{/* Dash, category, rule, and label. */}
                  </div>

                  {language === 'zh' && !article.translations?.zh && <Alert severity="info">{t('Chinese translation unavailable; showing English.')}</Alert>}
                  {/* Article title. */}
                  <h1>{article.title}</h1>

                  {/* Subtitle pulled from the article stats, with a fallback. */}
                  <p className="subtitle">{article.stats.Title || t("From the world of Quoderat")}</p>

                  {/* Author, collection, and estimated reading time. */}
                  <div className="article-meta">
                    <span>{/* Author line container starts here. */}
                      <Feather size={14} /> Axiom{/* Quill icon plus the author name. */}
                    </span>
                    <span>{t("Worldbuilding archive")}</span>{/* Collection label. */}
                    <span>{/* Reading-time container. */}
                      {Math.max(1, Math.ceil(language === 'zh' ? article.body.length / 400 : article.body.split(/\s+/).length / 200))} {t("min read")}
                    </span>{/* End of the author line. */}
                  </div>{/* End of the article metadata row. */}

                  {/* Toolbar with Read/Markdown tabs and page actions. */}
                  <div className="article-toolbar">
                    <div>{/* Tab group. */}
                      {/* "Read" tab: highlights when source view is off. */}
                      <button
                        // Pick the selected style based on the source flag.
                        className={!source ? "tab selected" : "tab"}
                        // Show rendered Markdown.
                        onClick={() => setSource(false)}
                      >{/* Read tab content starts here. */}
                        {t("Read")}{/* Visible label for the rendered view. */}
                      </button>{/* End of the Read tab. */}
                      {/* "Markdown" tab: highlights when source view is on. */}
                      <button
                        // Pick the selected style based on the source flag.
                        className={source ? "tab selected" : "tab"}
                        // Show the raw Markdown body.
                        onClick={() => setSource(true)}
                      >{/* Markdown tab content starts here. */}
                        Markdown{/* Visible label for the raw view. */}
                      </button>{/* End of the Markdown tab. */}
                    </div>{/* End of the tab group. */}

                    {/* Save toggle and edit button. */}
                    <div className="toolbar-actions">
                      <button // Save/bookmark toggle.
                        // Icon-button styling.
                        className="icon-button"
                        // Accessible label changes with the saved state.
                        aria-label={
                          saved.includes(slug) ? t("Unsave page") : t("Save page") // Choose the accessible label from the saved state.
                        } // End of the aria-label expression.
                        // Add or remove this slug from bookmarks.
                        onClick={toggleSave}
                      >{/* Save toggle content starts here. */}
                        {saved.includes(slug) ? ( // Saved? show a checkmark, otherwise a bookmark.
                          <Check size={17} /> // Checkmark: page is saved.
                        ) : (
                          <Bookmark size={17} /> // Bookmark: page is not saved.
                        )}
                      </button>{/* End of the save toggle. */}
                      <Button // Edit button.
                        // Compact Material UI button size.
                        size="small"
                        // Quill icon rendered before the label.
                        startIcon={<Feather size={14} />}
                        // Seed the editor with the article and open the dialog.
                        onClick={() => {
                          // Copy the body into the draft state.
                          setDraft(article.body);
                          // Open the Markdown workspace dialog.
                          setEditing(true);
                        }} // End of the edit click handler.
                      >{/* Edit button content starts here. */}
                        {t("Try editing")}{/* Visible edit button label. */}
                      </Button>{/* End of the edit button. */}
                    </div>{/* End of the toolbar actions. */}
                  </div>{/* End of the article toolbar. */}

                  {/* Quote block shown only on the Ila-hesabu article. */}
                  {article.slug === "ilar-hesabu" && (
                    <div className="intro-callout">{/* Intro quote content starts here. */}
                      <span>“</span>{/* Decorative opening quotation mark. */}
                      <p>{/* Two-line quote. */}
                        {t("His law operates everywhere,")}{/* First quote line. */}
                        <br />{/* Manual line break. */}
                        {t("yet no one knows where he is.")}{/* Second quote line. */}
                      </p>
                      <div className="callout-mark">ℕ</div>{/* Decorative symbol. */}
                    </div>
                  )}{/* End of the intro quote condition. */}

                  {/* Raw Markdown view or rendered Markdown view. */}
                  {source ? (
                    // Preserve whitespace in the raw source.
                    <pre className="source-view">{article.body}</pre>
                  ) : ( // Otherwise render the Markdown view.
                    // Render Markdown with GFM support and custom heading ids.
                    <article className="prose">
                      <Markdown // Markdown renderer configuration begins.
                        // Enable tables, strikethrough, and other GFM features.
                        remarkPlugins={[remarkGfm]}
                        // Override h2 and h3 so the contents links can target them.
                        components={{
                          // Level-2 heading renderer.
                          h2: ({ children }) => (
                            <h2 id={headingId(String(children))}>{children}</h2> // Level-2 heading with a generated anchor id.
                          ), // End of the level-2 heading renderer.
                          // Level-3 heading renderer.
                          h3: ({ children }) => (
                            <h3 id={headingId(String(children))}>{children}</h3> // Level-3 heading with a generated anchor id.
                          ), // End of the level-3 heading renderer.
                        }} // End of the components override object.
                      // Close the Markdown opening tag.
                      >
                        {article.body /* The Markdown text being rendered. */}
                      </Markdown>
                    </article> // End of the rendered Markdown article.
                  )}{/* End of the source/render conditional. */}

                  {article.category === 'Characters' && <nav className="character-pager" aria-label={t('Character navigation')}>
                    <button disabled={characterIndex <= 0} onClick={() => navigate(characterList[characterIndex - 1].slug)}><small>← {t('Previous')}</small><strong>{characterList[characterIndex - 1]?.title || t('Start of the list')}</strong></button>
                    <button className="pager-index" onClick={() => browse('Characters')}>{t('All characters')}<small>{characterIndex + 1} / {characterList.length}</small></button>
                    <button disabled={characterIndex === characterList.length - 1} onClick={() => navigate(characterList[characterIndex + 1].slug)}><small>{t('Next')} →</small><strong>{characterList[characterIndex + 1]?.title || t('End of the list')}</strong></button>
                  </nav>}

                  {/* Footer noting where the article came from. */}
                  <div className="source-note">
                    <ScrollText size={17} />{/* 17px scroll icon. */}
                    <span>{/* Source text block. */}
                      {t("From")} <strong>{article.source}</strong>{/* Source file name. */}
                      <br />{/* Manual line break. */}
                      {t("Original notes preserved. Unresolved details remain unresolved.")}
                    </span>{/* End of the source text block. */}
                  </div>{/* End of the source note. */}

                  {/* Two related articles shown beneath every entry. */}
                  <div className="related">
                    <p className="eyebrow">{t("CONTINUE EXPLORING")}</p>{/* Section label. */}
                    <div className="related-grid">
                      {articles // Related-article query begins.
                        // Exclude the current article and keep a curated set.
                        .filter(
                          (a) => // For each candidate related article.
                            a.slug !== slug && // Exclude the article already open.
                            ["ensa", "dragons", "law-holders"].includes(a.slug), // Keep only the curated related slugs.
                        ) // End of the filter callback arguments.
                        // Show at most two related links.
                        .slice(0, 2)
                        // Render one button per related article.
                        .map((a) => (
                          <button key={a.slug} onClick={() => navigate(a.slug)}>{/* Related link content starts here. */}
                            <small>{t(a.category)}</small>{/* Category label. */}
                            <span>{/* Title plus arrow. */}
                              {a.title}{/* Related article title. */}
                              <ArrowUpRight size={18} />{/* Link arrow. */}
                            </span>
                          </button> // End of the related link button.
                        ))}{/* End of the related map. */}
                    </div>{/* End of the related grid. */}
                  </div>{/* End of the related section. */}
                </> // End of the article-view fragment.
              ) : ( // Otherwise render the list/search view.
                <>{/* Fragment for the list/search view. */}
                  <div className="eyebrow">{t("THE LIVING ARCHIVE")}</div>{/* Section label. */}
                  {/* Heading switches between search results and the category name. */}
                  <h1>{query ? t("Search results") : t(category)}</h1>
                  {/* Subtitle explains the current listing. */}
                  <p className="subtitle">
                    {query // Pick the subtitle based on search mode.
                      ? `${t("Entries matching")} “${query}”` // Search mode.
                      : t("Laws, lives, and the world between them.")}{/* Browse mode. */}
                  </p>
                  {/* Number of entries left after filtering. */}
                  <p className="results-count">{filtered.length} {t("entries")}</p>

                  {/* One row per matching article. */}
                  <div className={category === "Characters" ? "entry-list character-gallery" : "entry-list"}>
                    {filtered.map((a, index) => ( // Render one list button per filtered article.
                      <button key={a.slug} onClick={() => navigate(a.slug)}>{/* Entry row content starts here. */}
                        {category === 'Characters' && <div className={`character-art tone-${index % 4}`} aria-hidden="true">
                          <span className="folio-number">{String(index + 1).padStart(3, '0')} / QUODERAT</span>
                          <div className="engraving-orbit" /><div className="engraving-diamond" />
                          <span className="character-emblem">{emblems[a.slug] || '✧'}</span>
                          <span className="art-law">{a.stats['Held law'] || a.stats['Elemental power']}</span>
                        </div>}
                        <span>{/* Text column. */}
                          <small>{category === "Characters" ? `No. ${String(index + 1).padStart(3, "0")} · ${["ersetu", "imaq", "salkhi", "illapa"].includes(a.slug) ? t("Dragon") : "Folio"}` : t(a.category)}</small>{/* Category label. */}
                          <h2>{a.title}</h2>{/* Article title. */}
                          <p>{/* Short preview text. */}
                            {category === "Characters" ? (lawExpressions[a.slug] || a.stats["Held law"] || a.stats["Elemental power"]) : `${a.body.replace(/[#*]/g, "").slice(0, 125)}…`}
                          </p>{/* End of the preview paragraph. */}
                        </span>{/* End of the text column. */}
                        <ArrowUpRight size={21} />{/* Open-link arrow. */}
                      </button>
                    ))}{/* End of the entry-list map. */}
                  </div>{/* End of the entry list. */}

                  {/* Message shown when no article matches the filters. */}
                  {!filtered.length && (
                    <p>{t("No entries found. Try a different search or category.")}</p> // Empty state when nothing matched.
                  )}{/* End of the empty-state condition. */}
                </> // End of the list-view fragment.
              )}{/* End of the article/list conditional. */}
            </main>{/* End of the main column. */}

            {/* Right-hand detail column. */}
            <aside className="details">
              {/* Label switches between dossier and notes wording. */}
              <div className="details-label">
                {article?.category === "Characters" // Choose the detail-column label.
                  ? t("CHARACTER DOSSIER") // Character view.
                  : t("ARCHIVE NOTES")}{/* Every other view. */}
                <span>↗</span>{/* Decorative arrow. */}
              </div>

              {article?.category === "Characters" ? ( // Character articles get a dossier.
                // Character dossier card.
                <div className="dossier">
                  <div className="sigil">{/* Sigil artwork starts here. */}
                    <div className="sigil-ring" />{/* Outer ring. */}
                    <div className="sigil-ring inner" />{/* Inner ring. */}
                    <span>{/* Center symbol chosen per character. */}
                      {emblems[article.slug] || '✧'}{/* Fallback symbol. */}
                    </span>
                    <i>✧</i>{/* Sparkle ornament. */}
                    <small>{(article.stats["Held law"] || article.stats["Elemental power"])?.toUpperCase()}</small>{/* Held law, uppercased. */}
                  </div>
                  <div className="dossier-title">{/* Dossier title block starts here. */}
                    <h2>{article.title}</h2>{/* Character name. */}
                    <p>{article.stats.Title || article.stats["Held law"] || article.stats["Elemental power"]}</p>{/* Title or law fallback. */}
                    <Chip size="small" variant="outlined" label={article.stats.Role || t("Law holder")} />{/* Role chip. */}
                  </div>
                  <dl>{/* Definition list of every stat. */}
                    {Object.entries(article.stats).map(([k, v]) => (
                      <div key={k}>{/* One stat row. */}
                        <dt>{t(k)}</dt>{/* Stat name. */}
                        <dd>{v}</dd>{/* Stat value. */}
                      </div>
                    ))}{/* End of the stats map. */}
                  </dl>{/* End of the stats list. */}
                  <div className="dossier-footer">{/* Dossier footer starts here. */}
                    <span /> {t("Source-backed profile")}{/* Dot plus the footer note. */}
                  </div>
                </div> // End of the dossier card.
              ) : ( // Otherwise show the generic note card.
                // Generic note card shown for non-character articles.
                <div className="note-card">
                  <Scale size={26} />{/* 26px scales icon. */}
                  <h3>{t("Power follows proof.")}</h3>{/* Card heading. */}
                  <p>{t("Laws are unique. Physical powers are shared. Every claim has a consequence.")}</p>{/* Card body. */}
                </div>
              )}{/* End of the dossier/note conditional. */}

              {/* "On this page" contents list. */}
              <div className="contents">
                <p className="eyebrow">{t("ON THIS PAGE")}</p>{/* Section label. */}
                {/* Overview link scrolls smoothly back to the top. */}
                <a
                  href="#" // Placeholder target; the click handler does the work.
                  onClick={(e) => {
                    // Stop the browser from jumping via the "#" href.
                    e.preventDefault();
                    // Smooth-scroll to the top of the document.
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }} // End of the overview click handler.
                >{/* Overview link content starts here. */}
                  {t("Overview")}{/* Visible overview label. */}
                </a>{/* End of the overview link. */}
                {/* One anchor per extracted heading. */}
                {headings.map((h) => (
                  <a // One anchor per heading.
                    href={`#${headingId(h)}`} // Deep link to the heading id.
                    key={h} // Stable React key.
                    onClick={(e) => {
                      // Stop the default hash jump.
                      e.preventDefault();
                      // Smooth-scroll to the matching heading if it exists.
                      document
                        .getElementById(headingId(h)) // Look up the heading element by its id.
                        ?.scrollIntoView({ behavior: "smooth" }); // Scroll to it smoothly when found.
                    }} // End of the heading click handler.
                  >{/* Heading link content starts here. */}
                    {h}{/* Visible heading text. */}
                  </a> // End of the heading link.
                ))}{/* End of the heading links map. */}
                <p className="margin-note">{/* Margin note content starts here. */}
                  “{t("Which was to be demonstrated.")}”{/* Closing motto. */}
                  <span>{t("— THE NAME QUODERAT")}</span>{/* Attribution. */}
                </p>
              </div>{/* End of the contents list. */}
            </aside>{/* End of the details column. */}
          </div> // End of the page layout.
        )}{/* End of the loaded-articles branch. */}

        {/* Site footer shown below the page content. */}
        <footer>
          {t("QUODERAT")} <span>{t("A living world. An unfinished record.")}</span>{/* Tagline. */}
          <span>{(language === "zh" ? "Axiom 的原创世界 · 2026" : "An original world by Axiom · 2026")}</span>{/* Copyright line. */}
        </footer>
      </div>{/* End of the workspace. */}

      {/* Markdown editing dialog, rendered only when `editing` is true. */}
      <Dialog
        // Control visibility with the editing state.
        open={editing}
        // Close the dialog when the backdrop or Escape key is used.
        onClose={() => setEditing(false)}
        // Stretch to the dialog container's full width.
        fullWidth
        // Cap the width at the medium breakpoint.
        maxWidth="md"
      >{/* Dialog content starts here. */}
        <DialogTitle>{t("Markdown workspace")}</DialogTitle>{/* Dialog heading. */}
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>{/* Informational banner with bottom margin. */}
            {t("Experiment here, then download your Markdown. This does not change the source archive.")}
          </Alert>{/* End of the info banner. */}
          <TextField // Text field configuration begins.
            // Take the full dialog width.
            fullWidth
            // Render as a multiline text area.
            multiline
            // Show at least twelve rows.
            minRows={12}
            // Bind the field to the draft state.
            value={draft}
            // Update the draft on every keystroke.
            onChange={(e) => setDraft(e.target.value)}
            // Pass accessibility and styling props to the inner input.
            inputProps={{
              "aria-label": t("Markdown editor"), // Accessible name.
              style: { fontFamily: "monospace", fontSize: 13 }, // Monospace look.
            }}
          />{/* End of the text field. */}
          <h3>{t("Live preview")}</h3>{/* Preview heading. */}
          <div className="prose">{/* Reuse article typography for the preview. */}
            <Markdown remarkPlugins={[remarkGfm]}>{draft}</Markdown>{/* Render the draft. */}
          </div>
        </DialogContent>{/* End of the dialog content. */}
        <DialogActions>{/* Dialog action buttons start here. */}
          <Button onClick={() => setEditing(false)}>{t("Close")}</Button>{/* Dismiss the dialog. */}
          <Button
            // Emphasized Material UI button style.
            variant="contained"
            // Build and download a Markdown file, then show a toast.
            onClick={() => {
              // Create an in-memory URL for a Markdown blob.
              const url = URL.createObjectURL(
                new Blob([draft], { type: "text/markdown" }), // Wrap the draft text in a Markdown blob.
              ); // End of the blob URL creation.
              // Create a temporary anchor element to trigger the download.
              const link = document.createElement("a");
              // Point the anchor at the blob URL.
              link.href = url;
              // Name the downloaded file after the current slug.
              link.download = `${slug}.${language}.md`;
              // Programmatically click the anchor.
              link.click();
              // Release the blob URL to free memory.
              URL.revokeObjectURL(url);
              // Tell the user the download succeeded.
              setNotice(t("Markdown downloaded"));
            }} // End of the download click handler.
          >{/* Download button content starts here. */}
            {t("Download Markdown")}{/* Visible download button label. */}
          </Button>{/* End of the download button. */}
        </DialogActions>{/* End of the dialog actions. */}
      </Dialog>{/* End of the dialog. */}

      {/* Toast confirming a Markdown download. */}
      <Snackbar
        // Show whenever a notice message exists.
        open={!!notice}
        // Hide automatically after 3.5 seconds.
        autoHideDuration={3500}
        // Clear the notice when the toast closes.
        onClose={() => setNotice("")}
        // Text displayed inside the toast.
        message={notice}
      />{/* End of the toast. */}
    </> // End of the returned fragment.
  ); // End of the App component's returned tree.
} // End of the App component.

// Mount the app into the element with id "root" and enable strict-mode checks.
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{/* Enable extra development-time checks. */}
    <ThemeProvider theme={theme}>{/* Supply the custom MUI theme. */}
      <App />{/* Render the root component. */}
    </ThemeProvider>
  </React.StrictMode>, // End of the strict-mode wrapper.
); // End of the createRoot render call.
