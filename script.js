/* ==================================================================
   Tailor · AI CV Studio
   - Real extraction (pdf.js / mammoth, loaded via CDN)
   - Heuristic parse into a structured, EDITABLE CV
   - Real keyword match scoring against the job description
   - Live preview is the single source of truth
   - Downloads serialise the CURRENT preview state (never a sample)
   ================================================================== */

(function () {
  "use strict";

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  /* ----------------------------------------------------------------
     State.  cv === null until the user uploads + enhances.
     ---------------------------------------------------------------- */
  const state = {
    step: 1,
    cvText: "",
    cv: null,                // structured CV built from the REAL upload
    jdMode: "paste",
    jdText: "",
    selectedTheme: "exec",
    analysis: null,
    zoom: null,              // null = fit-to-width
    focusBind: null,         // re-focus this data-bind path after re-render
  };

  const STEPS = ["Upload CV", "Job Description", "Template", "Enhance & Export"];

  /* ----------------------------------------------------------------
     A small placeholder CV — shown ONLY in the template thumbnails on
     step 3 before a real CV exists.  It is NEVER used for download.
     ---------------------------------------------------------------- */
  const PLACEHOLDER_CV = {
    name: "Your Name",
    title: "Your Professional Title",
    location: "City, Country",
    phone: "+000 000 0000",
    email: "you@email.com",
    website: "yourportfolio.com",
    summary:
      "Your tailored professional summary appears here once you upload a CV and run the enhancement. Every field below becomes editable.",
    competencies: ["Core skill", "Core skill", "Core skill", "Core skill"],
    experience: [
      { role: "Most recent role", company: "Company", dates: "2021 – Present", location: "City", bullets: ["Achievement-led bullet with a measurable outcome.", "Second bullet aligned to the target role."] },
      { role: "Previous role", company: "Company", dates: "2018 – 2021", location: "City", bullets: ["Concise outcome statement with scope or metric."] },
    ],
    education: [{ degree: "Degree", school: "University", dates: "Year" }],
    skills: ["Tool", "Tool", "Tool", "Tool"],
    languages: ["English"],
    achievements: ["Notable recognition or achievement"],
  };

  /* ================================================================
     1.  FILE EXTRACTION (runs in the browser)
     ================================================================ */

  async function extractPdf(file) {
    if (!window.pdfjsLib) throw new Error("PDF reader failed to load. Check your connection and reload.");
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let out = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      // Rebuild lines using the y-coordinate of each text item.
      let lastY = null, line = "";
      const lines = [];
      content.items.forEach((it) => {
        const y = it.transform[5];
        if (lastY === null || Math.abs(y - lastY) < 3) {
          line += it.str + (it.hasEOL ? "" : " ");
        } else {
          lines.push(line.trim());
          line = it.str + " ";
        }
        lastY = y;
      });
      if (line.trim()) lines.push(line.trim());
      out += lines.join("\n") + "\n";
    }
    return out.trim();
  }

  async function extractDocx(file) {
    if (!window.mammoth) throw new Error("Word reader failed to load. Check your connection and reload.");
    const buf = await file.arrayBuffer();
    const res = await window.mammoth.extractRawText({ arrayBuffer: buf });
    return (res.value || "").trim();
  }

  async function extractText(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) return extractPdf(file);
    if (name.endsWith(".docx")) return extractDocx(file);
    if (name.endsWith(".txt")) return (await file.text()).trim();
    throw new Error("Unsupported file type.");
  }

  /* ================================================================
     2.  PARSE raw text -> structured CV  (best-effort, then editable)
     ================================================================ */

  const SECTION_KEYS = {
    summary: ["summary", "profile", "objective", "about", "professional summary"],
    experience: ["experience", "employment", "work history", "professional experience", "career"],
    education: ["education", "academic", "qualifications"],
    skills: ["skills", "technical skills", "tools", "competencies", "core competencies", "expertise"],
    languages: ["languages", "language"],
    achievements: ["achievements", "accomplishments", "awards", "recognition", "honors", "honours", "certifications"],
  };

  const isHeading = (line) => {
    const l = line.trim();
    if (!l || l.length > 42) return null;
    const low = l.toLowerCase().replace(/[:•\-–|]/g, "").trim();
    for (const key in SECTION_KEYS) {
      if (SECTION_KEYS[key].some((k) => low === k || low.startsWith(k + " ") || low === k + "s")) return key;
    }
    // ALL-CAPS short lines are likely headings too
    return null;
  };

  const DATE_RE = /(\b(19|20)\d{2}\b|\bpresent\b|\bcurrent\b|\bnow\b)/i;
  const BULLET_RE = /^\s*[•▪◦·\-–*]\s+/;

  function parseCV(text) {
    const rawLines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/g, ""));
    const lines = rawLines.map((l) => l.trim());

    const cv = {
      name: "", title: "", location: "", phone: "", email: "", website: "",
      summary: "", competencies: [], experience: [], education: [],
      skills: [], languages: [], achievements: [],
    };

    // ---- contact details (search whole text) ----
    const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (email) cv.email = email[0];
    const phone = text.match(/(\+?\d[\d\s().\-]{6,}\d)/);
    if (phone) cv.phone = phone[0].trim();
    const emailDom = cv.email ? cv.email.split("@")[1].toLowerCase() : "";
    const siteMatches = text.match(/((https?:\/\/)?(www\.)?(?:[a-z0-9-]+\.)+(?:com|net|io|me|dev|org|co|info))(\/[a-z0-9/.\-]*)?/gi) || [];
    for (const m of siteMatches) {
      const s = m.replace(/^https?:\/\//, "").replace(/^www\./, "");
      const low = s.toLowerCase();
      if (low === emailDom) continue;                       // skip the email's own domain
      if (cv.email && cv.email.toLowerCase().includes(low)) continue;
      cv.website = s; break;
    }

    // ---- name + title (first meaningful lines) ----
    const firstReal = lines.filter(Boolean);
    if (firstReal.length) {
      // name: first line that is short, has no @/digits, not a heading
      const nameLine = firstReal.find((l) =>
        l.length <= 40 && !/[@\d]/.test(l) && !isHeading(l) && l.split(/\s+/).length <= 5
      );
      cv.name = nameLine || firstReal[0];
      const idx = firstReal.indexOf(cv.name);
      // title: next non-contact, non-heading line
      for (let i = idx + 1; i < firstReal.length; i++) {
        const l = firstReal[i];
        if (isHeading(l)) break;
        if (/[@]/.test(l) || /\d{4}/.test(l)) continue;
        if (l === cv.phone || l === cv.email) continue;
        if (l.length <= 60) { cv.title = l; break; }
      }
    }

    // ---- location (look for a "City, Country" segment near the top) ----
    let loc = "";
    for (const l of firstReal.slice(0, 8)) {
      for (const seg of l.split("|").map((s) => s.trim())) {
        if (/^[A-Za-z][A-Za-z .'\-]+,\s*[A-Za-z][A-Za-z .'\-]+$/.test(seg) && seg.length < 40) { loc = seg; break; }
      }
      if (loc) break;
    }
    if (loc) cv.location = loc;

    // ---- split into sections ----
    const sections = {};
    let current = "header";
    sections[current] = [];
    for (let i = 0; i < lines.length; i++) {
      const h = isHeading(lines[i]);
      if (h) { current = h; sections[current] = sections[current] || []; continue; }
      (sections[current] = sections[current] || []).push(rawLines[i]);
    }

    const joinClean = (arr) => (arr || []).map((l) => l.trim()).filter(Boolean);

    // ---- summary ----
    if (sections.summary) {
      cv.summary = joinClean(sections.summary).join(" ").trim();
    }
    if (!cv.summary) {
      // fallback: first sizeable paragraph in header that isn't contact
      const para = joinClean(sections.header).filter(
        (l) => l.length > 60 && l !== cv.name && l !== cv.title && !/[@]/.test(l)
      );
      if (para.length) cv.summary = para.join(" ");
    }

    // ---- skills / competencies ----
    if (sections.skills) {
      const items = joinClean(sections.skills)
        .join(" ")
        .split(/[•▪◦·,|/]|\s{2,}|\u2022/)
        .map((s) => s.replace(BULLET_RE, "").trim())
        .filter((s) => s && s.length <= 40);
      cv.skills = dedupe(items).slice(0, 10);
    }
    cv.competencies = cv.skills.slice(0, 6);
    cv.skills = cv.skills.slice(0, 8);

    // ---- languages ----
    if (sections.languages) {
      cv.languages = dedupe(
        joinClean(sections.languages).join(" ").split(/[•▪·,|/]|\s{2,}/).map((s) => s.trim()).filter(Boolean)
      ).slice(0, 5);
    }

    // ---- achievements ----
    if (sections.achievements) {
      cv.achievements = joinClean(sections.achievements)
        .map((l) => l.replace(BULLET_RE, "").trim())
        .filter((l) => l.length > 3)
        .slice(0, 5);
    }

    // ---- education ----
    if (sections.education) {
      const eds = joinClean(sections.education);
      let buf = [];
      const flush = () => {
        if (!buf.length) return;
        const degree = buf[0];
        const rest = buf.slice(1).join(" · ");
        const dm = (degree + " " + rest).match(DATE_RE);
        let school = rest
          .replace(DATE_RE, "")
          .replace(/graduated\s*:?/i, "")          // drop "Graduated:" label
          .split("|")[0]                            // drop trailing "| Location"
          .replace(/[|·\s]+$/, "")
          .trim();
        cv.education.push({
          degree: degree.replace(DATE_RE, "").replace(/[|·]+$/, "").trim(),
          school,
          dates: dm ? matchDates(degree + " " + rest) : "",
        });
        buf = [];
      };
      eds.forEach((l) => {
        if (buf.length && (DATE_RE.test(l) === false) && buf.length >= 2) { flush(); }
        buf.push(l.replace(BULLET_RE, "").trim());
        if (DATE_RE.test(l)) flush();
      });
      flush();
      cv.education = cv.education.filter((e) => e.degree).slice(0, 3);
    }

    // ---- experience ----
    if (sections.experience) {
      cv.experience = parseExperience(joinClean(sections.experience));
    }

    // Final fallbacks so the preview is never empty
    if (!cv.name) cv.name = "Your Name";
    if (!cv.title) cv.title = "Professional Title";
    if (!cv.summary) cv.summary = "Add a 3–4 line professional summary tailored to the target role. Click here to edit.";
    if (!cv.experience.length) cv.experience = [{ role: "Role", company: "Company", dates: "", location: "", bullets: ["Click to add an achievement-led bullet."] }];
    if (!cv.education.length) cv.education = [{ degree: "Degree", school: "Institution", dates: "" }];
    if (!cv.competencies.length) cv.competencies = ["Add a skill"];
    if (!cv.skills.length) cv.skills = ["Add a tool"];

    return cv;
  }

  function matchDates(s) {
    const years = s.match(/\b(19|20)\d{2}\b/g) || [];
    const pres = /present|current|now/i.test(s);
    if (years.length >= 2) return `${years[0]} – ${years[1]}`;
    if (years.length === 1) return pres ? `${years[0]} – Present` : years[0];
    return pres ? "Present" : "";
  }

  function parseExperience(linesArr) {
    const entries = [];
    let cur = null;

    const splitRole = (line) => {
      // role/company on one line, separated by — – | or " at "
      const parts = line.split(/\s+[—–]\s+|\s+\|\s+|\s+at\s+/i);
      if (parts.length >= 2) return { role: parts[0].trim(), company: parts.slice(1).join(", ").trim() };
      return { role: line.trim(), company: "" };
    };

    const startEntry = (line) => {
      if (cur) entries.push(cur);
      const { role, company } = splitRole(line);
      cur = { role, company, location: "", dates: "", bullets: [] };
    };

    // A line that is essentially a date / date-range (optionally "… | Location")
    const isDateLine = (line) => {
      const head = line.split("|")[0].trim();
      return DATE_RE.test(head) && head.length <= 32 &&
        /(\b(19|20)\d{2}\b|present|current|now)/i.test(head) &&
        // mostly month/year tokens, not a sentence
        head.split(/\s+/).length <= 6 && !/[.;:]/.test(head);
    };

    for (const raw of linesArr) {
      const line = raw.trim();
      if (!line) continue;

      if (BULLET_RE.test(raw)) {                       // bullet
        if (!cur) startEntry("Role");
        cur.bullets.push(line.replace(BULLET_RE, "").trim());
        continue;
      }
      if (isDateLine(line)) {                          // date / location line
        if (!cur) startEntry("Role");
        const segs = line.split("|");
        cur.dates = matchDates(segs[0]);
        if (segs[1]) cur.location = segs[1].trim();
        continue;
      }
      // plain text line
      if (!cur || cur.bullets.length > 0 || (cur.dates && cur.company)) {
        startEntry(line);                              // begin a new role
      } else if (!cur.company) {
        cur.company = line;                            // 2nd line = company
      } else {
        cur.bullets.push(line);                        // anything else → bullet
      }
    }
    if (cur) entries.push(cur);

    return entries
      .map((e) => ({ ...e, bullets: e.bullets.filter(Boolean).slice(0, 6) }))
      .filter((e) => e.role && e.role !== "Role")
      .slice(0, 5);
  }

  const dedupe = (arr) => {
    const seen = new Set(); const out = [];
    arr.forEach((x) => { const k = x.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(x); } });
    return out;
  };

  /* ================================================================
     3.  REAL keyword analysis (CV vs JD)
     ================================================================ */

  const STOP = new Set("a an and the of to in for with on at by from as is are be will you your we our their they this that have has had can able role job description responsibilities requirements work team experience years strong excellent good ability across using use within into over more most than who what when where which while about per via etc including include provide ensure support help across also may must should would across other across".split(/\s+/));

  const tokenize = (t) =>
    (t.toLowerCase().match(/[a-z][a-z+#.\-]{2,}/g) || []).filter((w) => !STOP.has(w) && w.length >= 3);

  function analyze(cv, jdText) {
    const jdTokens = tokenize(jdText);
    // rank JD keywords by frequency
    const freq = {};
    jdTokens.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
    const ranked = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);

    // Pull capitalised multiword phrases from JD as candidate skills
    const phraseMatches = (jdText.match(/\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+){1,2})\b/g) || [])
      .map((p) => p.trim())
      .filter((p) => p.split(" ").length <= 3);
    const phrases = dedupe(phraseMatches).slice(0, 8);

    const cvText = JSON.stringify(cv).toLowerCase();
    const cvTokens = new Set(tokenize(cvText));

    const candidates = dedupe(ranked.slice(0, 28));
    const matched = candidates.filter((w) => cvTokens.has(w));
    const missing = candidates.filter((w) => !cvTokens.has(w));

    const relevant = candidates.length || 1;
    let score = Math.round((matched.length / relevant) * 100);
    score = Math.max(28, Math.min(96, score)); // keep within a believable band

    // Suggested improvements derived from real signals
    const improvements = [];
    if (missing.length) improvements.push(`Weave in role keywords you're missing: ${missing.slice(0, 5).join(", ")}.`);
    const summaryWords = (cv.summary || "").split(/\s+/).length;
    if (summaryWords < 40) improvements.push("Expand your summary to 3–4 lines that name the target role and its focus.");
    const hasMetric = cv.experience.some((e) => e.bullets.some((b) => /\d/.test(b)));
    if (!hasMetric) improvements.push("Add measurable results (%, $, counts) to at least two experience bullets.");
    improvements.push("Reorder competencies so the role's top keywords appear first.");
    improvements.push("Lead each bullet with an action verb (Led, Drove, Built, Delivered).");

    return {
      score,
      matched: matched.slice(0, 12),
      missing: missing.slice(0, 10),
      phrases,
      improvements: improvements.slice(0, 5),
    };
  }

  /* ================================================================
     4.  THEME RENDERERS  (every text node is editable + data-bound)
     ================================================================ */

  const esc = (s = "") =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // editable element
  const ed = (path, val, tag, cls) =>
    `<${tag || "span"}${cls ? ` class="${cls}"` : ""} contenteditable="true" data-bind="${path}" spellcheck="false">${esc(val)}</${tag || "span"}>`;

  const addBtn = (arrPath, label) =>
    `<span class="cv-add" data-add="${arrPath}">+ ${label || "add"}</span>`;

  const bulletList = (expIndex, bullets) =>
    `<ul class="bul">${bullets
      .map((b, j) => `<li>${ed(`exp.${expIndex}.bullets.${j}`, b)}</li>`)
      .join("")}</ul>${addBtn(`exp.${expIndex}.bullets`, "bullet")}`;

  /* ---- Theme 1: Executive Minimal ---- */
  function renderExec(cv) {
    return `
    <div class="cv-a4 t-exec">
      <div class="t-exec__head">
        <h1 class="t-exec__name">${ed("name", cv.name)}</h1>
        <div class="t-exec__title">${ed("title", cv.title)}</div>
        <div class="t-exec__contact">${ed("location", cv.location)} &nbsp;·&nbsp; ${ed("phone", cv.phone)} &nbsp;·&nbsp; ${ed("email", cv.email)}${cv.website ? ` &nbsp;·&nbsp; ${ed("website", cv.website)}` : ""}</div>
      </div>

      <div class="t-exec__sec">
        <div class="t-exec__sec-title">Profile</div>
        <p class="t-exec__summary">${ed("summary", cv.summary)}</p>
      </div>

      <div class="t-exec__sec">
        <div class="t-exec__sec-title">Experience</div>
        ${cv.experience.map((e, i) => `
          <div class="t-exec__job">
            <div class="t-exec__job-top">
              <div><span class="t-exec__role">${ed(`exp.${i}.role`, e.role)}</span> <span class="t-exec__co">${ed(`exp.${i}.company`, e.company)}</span></div>
              <div class="t-exec__date">${ed(`exp.${i}.dates`, e.dates)}</div>
            </div>
            ${bulletList(i, e.bullets)}
          </div>`).join("")}
        ${addBtn("exp", "role")}
      </div>

      <div class="t-exec__cols">
        <div class="t-exec__sec">
          <div class="t-exec__sec-title">Competencies</div>
          <div class="t-exec__inline">${cv.competencies.map((c, i) => `<span class="t-exec__pill">${ed(`competencies.${i}`, c)}</span>`).join("")}</div>
          ${addBtn("competencies", "skill")}
        </div>
        <div class="t-exec__sec">
          <div class="t-exec__sec-title">Tools</div>
          <div class="t-exec__inline">${cv.skills.map((c, i) => `<span class="t-exec__pill">${ed(`skills.${i}`, c)}</span>`).join("")}</div>
          ${addBtn("skills", "tool")}
        </div>
      </div>

      <div class="t-exec__cols">
        <div class="t-exec__sec">
          <div class="t-exec__sec-title">Education</div>
          ${cv.education.map((e, i) => `<div class="t-exec__edu"><div class="d">${ed(`education.${i}.degree`, e.degree)}</div><div class="s">${ed(`education.${i}.school`, e.school)} · ${ed(`education.${i}.dates`, e.dates)}</div></div>`).join("")}
        </div>
        ${cv.achievements.length ? `<div class="t-exec__sec">
          <div class="t-exec__sec-title">Recognition</div>
          <ul class="bul">${cv.achievements.map((a, i) => `<li>${ed(`achievements.${i}`, a)}</li>`).join("")}</ul>
          ${addBtn("achievements", "item")}
        </div>` : ""}
      </div>
    </div>`;
  }

  /* ---- Theme 2: Creative Professional ---- */
  function renderCreative(cv) {
    return `
    <div class="cv-a4 t-creative">
      <div class="t-creative__band">
        <h1 class="t-creative__name">${ed("name", cv.name)}</h1>
        <div class="t-creative__title">${ed("title", cv.title)}</div>
        <div class="t-creative__contact">
          <span>${ed("location", cv.location)}</span><span>${ed("phone", cv.phone)}</span><span>${ed("email", cv.email)}</span>${cv.website ? `<span>${ed("website", cv.website)}</span>` : ""}
        </div>
      </div>
      <div class="t-creative__body">
        <div class="t-creative__sec">
          <div class="t-creative__sec-title">Profile</div>
          <p class="t-creative__summary">${ed("summary", cv.summary)}</p>
        </div>
        <div class="t-creative__sec">
          <div class="t-creative__sec-title">Experience</div>
          ${cv.experience.map((e, i) => `
            <div class="t-creative__job">
              <div class="t-creative__job-top">
                <div><span class="t-creative__role">${ed(`exp.${i}.role`, e.role)}</span> — <span class="t-creative__co">${ed(`exp.${i}.company`, e.company)}</span></div>
                <div class="t-creative__date">${ed(`exp.${i}.dates`, e.dates)}</div>
              </div>
              ${bulletList(i, e.bullets)}
            </div>`).join("")}
          ${addBtn("exp", "role")}
        </div>
        <div class="t-creative__cols">
          <div>
            <div class="t-creative__sec">
              <div class="t-creative__sec-title">Education</div>
              ${cv.education.map((e, i) => `<div class="t-creative__edu"><div class="d">${ed(`education.${i}.degree`, e.degree)}</div><div class="s">${ed(`education.${i}.school`, e.school)} · ${ed(`education.${i}.dates`, e.dates)}</div></div>`).join("")}
            </div>
            ${cv.achievements.length ? `<div class="t-creative__sec">
              <div class="t-creative__sec-title">Recognition</div>
              <ul class="bul">${cv.achievements.map((a, i) => `<li>${ed(`achievements.${i}`, a)}</li>`).join("")}</ul>
              ${addBtn("achievements", "item")}
            </div>` : ""}
          </div>
          <div>
            <div class="t-creative__sec">
              <div class="t-creative__sec-title">Skills</div>
              <div class="t-creative__tags">${cv.competencies.map((c, i) => `<span class="t-creative__tag">${ed(`competencies.${i}`, c)}</span>`).join("")}</div>
              ${addBtn("competencies", "skill")}
            </div>
            <div class="t-creative__sec">
              <div class="t-creative__sec-title">Tools</div>
              <div class="t-creative__tags">${cv.skills.map((c, i) => `<span class="t-creative__tag">${ed(`skills.${i}`, c)}</span>`).join("")}</div>
              ${addBtn("skills", "tool")}
            </div>
            ${cv.languages.length ? `<div class="t-creative__sec">
              <div class="t-creative__sec-title">Languages</div>
              <div class="t-creative__tags">${cv.languages.map((c, i) => `<span class="t-creative__tag">${ed(`languages.${i}`, c)}</span>`).join("")}</div>
              ${addBtn("languages", "language")}
            </div>` : ""}
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ---- Theme 3: Premium Sidebar ---- */
  function renderSidebar(cv) {
    return `
    <div class="cv-a4 t-sidebar">
      <div class="t-sidebar__aside">
        <h1 class="t-sidebar__name">${ed("name", cv.name)}</h1>
        <div class="t-sidebar__title">${ed("title", cv.title)}</div>

        <div class="t-sidebar__sec">
          <div class="t-sidebar__sec-title">Contact</div>
          <div class="t-sidebar__contact">
            <div>${ed("location", cv.location)}</div>
            <div>${ed("phone", cv.phone)}</div>
            <div>${ed("email", cv.email)}</div>
            ${cv.website ? `<div>${ed("website", cv.website)}</div>` : ""}
          </div>
        </div>

        <div class="t-sidebar__sec">
          <div class="t-sidebar__sec-title">Skills</div>
          <ul class="side">${cv.competencies.map((c, i) => `<li>${ed(`competencies.${i}`, c)}</li>`).join("")}</ul>
          ${addBtn("competencies", "skill")}
        </div>

        <div class="t-sidebar__sec">
          <div class="t-sidebar__sec-title">Tools</div>
          <div class="t-sidebar__chips">${cv.skills.map((c, i) => `<span class="t-sidebar__chip">${ed(`skills.${i}`, c)}</span>`).join("")}</div>
          ${addBtn("skills", "tool")}
        </div>

        ${cv.languages.length ? `<div class="t-sidebar__sec">
          <div class="t-sidebar__sec-title">Languages</div>
          <ul class="side">${cv.languages.map((c, i) => `<li>${ed(`languages.${i}`, c)}</li>`).join("")}</ul>
          ${addBtn("languages", "language")}
        </div>` : ""}

        <div class="t-sidebar__sec">
          <div class="t-sidebar__sec-title">Education</div>
          ${cv.education.map((e, i) => `<div class="t-sidebar__edu"><div class="d">${ed(`education.${i}.degree`, e.degree)}</div><div class="s">${ed(`education.${i}.school`, e.school)}</div><div class="y">${ed(`education.${i}.dates`, e.dates)}</div></div>`).join("")}
        </div>
      </div>

      <div class="t-sidebar__main">
        <div class="t-sidebar__sec-main">
          <div class="t-sidebar__main-title">Profile</div>
          <p class="t-sidebar__summary">${ed("summary", cv.summary)}</p>
        </div>
        <div class="t-sidebar__sec-main">
          <div class="t-sidebar__main-title">Experience</div>
          ${cv.experience.map((e, i) => `
            <div class="t-sidebar__job">
              <div class="t-sidebar__job-top">
                <div class="t-sidebar__role">${ed(`exp.${i}.role`, e.role)}</div>
                <div class="t-sidebar__date">${ed(`exp.${i}.dates`, e.dates)}</div>
              </div>
              <div class="t-sidebar__co">${ed(`exp.${i}.company`, e.company)}${e.location ? `, ${ed(`exp.${i}.location`, e.location)}` : ""}</div>
              ${bulletList(i, e.bullets)}
            </div>`).join("")}
          ${addBtn("exp", "role")}
        </div>
        ${cv.achievements.length ? `<div class="t-sidebar__sec-main">
          <div class="t-sidebar__main-title">Recognition</div>
          <ul class="bul">${cv.achievements.map((a, i) => `<li>${ed(`achievements.${i}`, a)}</li>`).join("")}</ul>
          ${addBtn("achievements", "item")}
        </div>` : ""}
      </div>
    </div>`;
  }

  /* ---- Theme 4: Modern Timeline ---- */
  function renderTimeline(cv) {
    return `
    <div class="cv-a4 t-timeline">
      <div class="t-timeline__head">
        <h1 class="t-timeline__name">${ed("name", cv.name)}</h1>
        <div class="t-timeline__title">${ed("title", cv.title)}</div>
        <div class="t-timeline__rule"></div>
        <div class="t-timeline__contact">
          <span>${ed("location", cv.location)}</span><span>${ed("phone", cv.phone)}</span><span>${ed("email", cv.email)}</span>${cv.website ? `<span>${ed("website", cv.website)}</span>` : ""}
        </div>
      </div>

      <div class="t-timeline__sec">
        <div class="t-timeline__sec-title">Profile</div>
        <p class="t-timeline__summary">${ed("summary", cv.summary)}</p>
      </div>

      <div class="t-timeline__sec">
        <div class="t-timeline__sec-title">Experience</div>
        <div class="t-timeline__track">
          ${cv.experience.map((e, i) => `
            <div class="t-timeline__node">
              <div class="t-timeline__node-top">
                <div><span class="t-timeline__role">${ed(`exp.${i}.role`, e.role)}</span> · <span class="t-timeline__co">${ed(`exp.${i}.company`, e.company)}</span></div>
                <div class="t-timeline__date">${ed(`exp.${i}.dates`, e.dates)}</div>
              </div>
              ${bulletList(i, e.bullets)}
            </div>`).join("")}
        </div>
        ${addBtn("exp", "role")}
      </div>

      <div class="t-timeline__cols">
        <div>
          <div class="t-timeline__sec-title">Competencies</div>
          <div class="t-timeline__tags">${cv.competencies.map((c, i) => `<span class="t-timeline__tag">${ed(`competencies.${i}`, c)}</span>`).join("")}</div>
          ${addBtn("competencies", "skill")}
        </div>
        <div>
          <div class="t-timeline__sec-title">Tools</div>
          <div class="t-timeline__tags">${cv.skills.map((c, i) => `<span class="t-timeline__tag">${ed(`skills.${i}`, c)}</span>`).join("")}</div>
          ${addBtn("skills", "tool")}
        </div>
      </div>

      <div class="t-timeline__cols" style="margin-top:6px;">
        <div>
          <div class="t-timeline__sec-title">Education</div>
          ${cv.education.map((e, i) => `<div class="t-timeline__edu"><div class="d">${ed(`education.${i}.degree`, e.degree)}</div><div class="s">${ed(`education.${i}.school`, e.school)} · ${ed(`education.${i}.dates`, e.dates)}</div></div>`).join("")}
        </div>
        ${cv.achievements.length ? `<div>
          <div class="t-timeline__sec-title">Recognition</div>
          <ul class="bul">${cv.achievements.map((a, i) => `<li>${ed(`achievements.${i}`, a)}</li>`).join("")}</ul>
          ${addBtn("achievements", "item")}
        </div>` : ""}
      </div>
    </div>`;
  }

  const THEMES = [
    { id: "exec", name: "Executive Minimal", sub: "Corporate · Centered", render: renderExec },
    { id: "creative", name: "Creative Professional", sub: "Accent band · Bold", render: renderCreative },
    { id: "sidebar", name: "Premium Sidebar", sub: "Left rail · Polished", render: renderSidebar },
    { id: "timeline", name: "Modern Timeline", sub: "Timeline · Modern", render: renderTimeline },
  ];

  const renderTheme = (id, cv) => {
    const t = THEMES.find((x) => x.id === id) || THEMES[0];
    return t.render(cv);
  };

  /* ================================================================
     5.  DATA BINDING — edits flow straight back into state.cv
     ================================================================ */

  function setByPath(obj, path, value) {
    const parts = path.split(".");
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      let k = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
      if (o[k] == null) o[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      o = o[k];
    }
    let last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) last = Number(last);
    o[last] = value;
  }

  function getByPath(obj, path) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[/^\d+$/.test(k) ? Number(k) : k]), obj);
  }

  /* ================================================================
     6.  STEP NAVIGATION + STEPPER
     ================================================================ */

  function renderStepper() {
    document.getElementById("stepper").innerHTML = STEPS.map((label, i) => {
      const n = i + 1;
      const done = n < state.step, active = n === state.step;
      const num = done
        ? `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`
        : n;
      const sep = i < STEPS.length - 1 ? `<div class="stepper__line"></div>` : "";
      return `<div class="stepper__item">
          <div class="stepper__num ${done ? "stepper__num--done" : ""} ${active ? "stepper__num--active" : ""}">${num}</div>
          <span class="stepper__label ${active ? "stepper__label--active" : ""}">${label}</span>
        </div>${sep}`;
    }).join("");
  }

  function showStep(n) {
    state.step = n;
    for (let i = 1; i <= 4; i++) {
      document.getElementById("step-" + i).classList.toggle("step--hidden", i !== n);
    }
    renderStepper();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ================================================================
     7.  ERROR BANNER
     ================================================================ */
  const showError = (m) => { document.getElementById("error-text").textContent = m; document.getElementById("error-banner").classList.remove("banner--hidden"); };
  const hideError = () => document.getElementById("error-banner").classList.add("banner--hidden");
  document.getElementById("error-close").addEventListener("click", hideError);

  /* ================================================================
     8.  DROPZONES
     ================================================================ */
  function setupDropzone(zoneId, innerId, inputId, accepts, onText, extractIds) {
    const zone = document.getElementById(zoneId);
    const inner = document.getElementById(innerId);
    const input = document.getElementById(inputId);

    const fileTpl = (file, loading) => `
      <div class="dropzone__file">
        ${loading ? `<div class="dropzone__spin"></div>` :
        `<svg viewBox="0 0 24 24" class="dropzone__file-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`}
        <div>
          <div class="dropzone__file-name">${esc(file.name)}</div>
          <div class="dropzone__file-meta">${loading ? "Reading…" : (file.size / 1024).toFixed(1) + " KB · click to replace"}</div>
        </div>
      </div>`;

    const handle = async (file) => {
      if (!file) return;
      const name = file.name.toLowerCase();
      if (!accepts.some((ext) => name.endsWith(ext))) { showError(`Unsupported file. Use ${accepts.join(", ")}.`); return; }
      hideError();
      zone.classList.add("dropzone--has-file");
      inner.innerHTML = fileTpl(file, true);
      try {
        const text = await extractText(file);
        inner.innerHTML = fileTpl(file, false);
        if (extractIds && text) {
          const body = document.getElementById(extractIds.body);
          const count = document.getElementById(extractIds.count);
          body.textContent = text.slice(0, 1400) + (text.length > 1400 ? "\n…" : "");
          count.textContent = `${text.length.toLocaleString()} chars`;
          document.getElementById(extractIds.wrap).classList.remove("extract--hidden");
        }
        onText(text, file);
      } catch (e) {
        inner.innerHTML = fileTpl(file, false);
        showError(e.message || "Could not read that file. Try another, or paste the text.");
      }
    };

    input.addEventListener("change", (e) => e.target.files[0] && handle(e.target.files[0]));
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("dropzone--drag"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("dropzone--drag"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault(); zone.classList.remove("dropzone--drag");
      if (e.dataTransfer.files[0]) { input.files = e.dataTransfer.files; handle(e.dataTransfer.files[0]); }
    });
  }

  // CV dropzone — builds the REAL structured CV immediately on upload
  setupDropzone("cv-dropzone", "cv-dropzone-inner", "cv-input", [".pdf", ".docx"],
    (text) => {
      state.cvText = text;
      state.cv = parseCV(text);     // <-- real content becomes the working CV
      document.getElementById("to-step-2").disabled = !text;
    },
    { wrap: "cv-extract", body: "cv-extract-body", count: "cv-extract-count" });

  // JD dropzone
  setupDropzone("jd-dropzone", "jd-dropzone-inner", "jd-input", [".pdf", ".docx", ".txt"],
    (text) => {
      state.jdText = text;
      document.getElementById("to-step-3").disabled = text.trim().length < 20;
    },
    { wrap: "jd-extract", body: "jd-extract-body", count: "jd-extract-count" });

  /* ================================================================
     9.  JD paste + tabs
     ================================================================ */
  const jdTextarea = document.getElementById("jd-text");
  jdTextarea.addEventListener("input", (e) => {
    state.jdText = e.target.value;
    document.getElementById("to-step-3").disabled = state.jdText.trim().length < 20;
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.getAttribute("data-jd-mode");
      state.jdMode = mode;
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("tab--active"));
      tab.classList.add("tab--active");
      document.getElementById("jd-paste-pane").classList.toggle("hidden", mode !== "paste");
      document.getElementById("jd-upload-pane").classList.toggle("hidden", mode !== "upload");
      document.getElementById("to-step-3").disabled = state.jdText.trim().length < 20;
    });
  });

  /* ================================================================
     10.  TEMPLATE THUMBNAILS (step 3) + switcher (step 4)
     ================================================================ */
  function renderThemeGrid() {
    const grid = document.getElementById("theme-grid");
    const cv = state.cv || PLACEHOLDER_CV;
    grid.innerHTML = THEMES.map((t) => `
      <button class="theme-thumb ${state.selectedTheme === t.id ? "theme-thumb--selected" : ""}" data-theme="${t.id}">
        <div class="theme-thumb__frame"><div class="theme-thumb__scaler" data-scaler>${t.render(cv)}</div></div>
        <div class="theme-thumb__meta">
          <div><div class="theme-thumb__name">${t.name}</div><div class="theme-thumb__sub">${t.sub}</div></div>
          <div class="theme-thumb__check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
        </div>
      </button>`).join("");

    grid.querySelectorAll(".theme-thumb").forEach((btn) =>
      btn.addEventListener("click", () => { state.selectedTheme = btn.getAttribute("data-theme"); renderThemeGrid(); }));

    // disable editing inside thumbnails + scale to fit
    requestAnimationFrame(() => {
      grid.querySelectorAll(".theme-thumb__frame").forEach((frame) => {
        const scaler = frame.querySelector("[data-scaler]");
        scaler.querySelectorAll("[contenteditable]").forEach((n) => n.setAttribute("contenteditable", "false"));
        scaler.querySelectorAll(".cv-add").forEach((n) => (n.style.display = "none"));
        scaler.style.transform = `scale(${frame.clientWidth / 794})`;
      });
    });
  }

  function renderThemeSwitcher() {
    const el = document.getElementById("theme-switcher");
    el.innerHTML = THEMES.map((t) =>
      `<button class="theme-switch ${state.selectedTheme === t.id ? "theme-switch--active" : ""}" data-theme="${t.id}">${t.name}</button>`).join("");
    el.querySelectorAll(".theme-switch").forEach((btn) =>
      btn.addEventListener("click", () => { state.selectedTheme = btn.getAttribute("data-theme"); renderThemeSwitcher(); renderPreview(); }));
  }

  /* ================================================================
     11.  ENHANCE (run analysis) -> dashboard
     ================================================================ */
  function runAnalysis() {
    hideError();
    if (!state.cv) { showError("Upload a CV first."); return; }
    document.getElementById("loader").classList.remove("loader--hidden");
    document.getElementById("run-analysis").disabled = true;

    setTimeout(() => {
      state.analysis = analyze(state.cv, state.jdText);
      document.getElementById("loader").classList.add("loader--hidden");
      document.getElementById("run-analysis").disabled = false;
      paintDashboard();
      showStep(4);
      requestAnimationFrame(() => { renderPreview(); animateScore(); });
    }, 1500);
  }

  function paintDashboard() {
    const a = state.analysis;

    const matched = document.getElementById("matched-keywords");
    matched.innerHTML = a.matched.length
      ? a.matched.map((k) => `<span class="chip chip--ok">${esc(k)}</span>`).join("")
      : `<span class="chips__empty">No direct matches yet — add the role's keywords.</span>`;

    const missing = document.getElementById("missing-keywords");
    missing.innerHTML = a.missing.length
      ? a.missing.map((k) => `<span class="chip">${esc(k)}</span>`).join("")
      : `<span class="chips__empty">Great — your CV already covers the brief.</span>`;

    document.getElementById("improvements-list").innerHTML =
      a.improvements.map((g) => `<li>${esc(g)}</li>`).join("");

    document.getElementById("score-label").textContent =
      a.score >= 75 ? "Strong fit" : a.score >= 55 ? "Good fit" : a.score >= 40 ? "Partial fit" : "Needs work";
    document.getElementById("score-note").textContent =
      `${a.matched.length} of ${a.matched.length + a.missing.length} key terms present. Edit the preview to raise it.`;

    renderThemeSwitcher();
  }

  function animateScore() {
    const a = state.analysis; if (!a) return;
    const c = 2 * Math.PI * 40; // r=40
    const circle = document.getElementById("score-circle");
    circle.setAttribute("stroke-dasharray", c.toFixed(1));
    circle.setAttribute("stroke-dashoffset", c.toFixed(1));
    setTimeout(() => circle.setAttribute("stroke-dashoffset", (c - (c * a.score) / 100).toFixed(1)), 80);

    const val = document.getElementById("score-value");
    const start = performance.now(), dur = 900;
    const tick = (ts) => {
      const t = Math.min(1, (ts - start) / dur);
      val.textContent = Math.round(a.score * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // "Add all" missing keywords -> append into competencies, then refresh
  document.getElementById("apply-keywords").addEventListener("click", () => {
    if (!state.cv || !state.analysis) return;
    const add = state.analysis.missing.map((k) => k.charAt(0).toUpperCase() + k.slice(1));
    state.cv.competencies = dedupe(state.cv.competencies.concat(add)).slice(0, 10);
    // recompute analysis against updated CV
    state.analysis = analyze(state.cv, state.jdText);
    paintDashboard();
    renderPreview();
    animateScore();
  });

  /* ================================================================
     12.  LIVE PREVIEW (single source of truth for downloads)
     ================================================================ */
  function rescalePreview() {
    const scaler = document.getElementById("preview-stage-scaler");
    const root = document.getElementById("cv-print-root");
    if (!scaler || !state.cv) return;
    const stage = scaler.parentElement;
    const stageW = stage.clientWidth - 64;
    const a4W = 794, a4H = 1123;
    const fit = Math.min(1, stageW / a4W);
    const scale = state.zoom || fit;
    scaler.style.transform = `scale(${scale})`;
    scaler.style.width = a4W * scale + "px";
    scaler.style.height = a4H * scale + "px";
    document.getElementById("zoom-label").textContent = state.zoom ? Math.round(scale * 100) + "%" : "Fit";
  }

  function renderPreview() {
    if (!state.cv) return;
    document.getElementById("cv-print-root").innerHTML = renderTheme(state.selectedTheme, state.cv);
    rescalePreview();
    if (state.focusBind) { restoreFocus(state.focusBind); state.focusBind = null; }
  }

  function restoreFocus(path) {
    const el = document.querySelector(`#cv-print-root [data-bind="${CSS.escape(path)}"]`);
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el); range.collapse(false);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  }

  // Delegated editing — write edits straight back into state.cv (no re-render -> caret kept)
  const printRoot = document.getElementById("cv-print-root");
  printRoot.addEventListener("input", (e) => {
    const node = e.target.closest("[data-bind]");
    if (!node) return;
    setByPath(state.cv, node.getAttribute("data-bind"), node.textContent);
  });

  // Backspace on an empty array item removes it
  printRoot.addEventListener("keydown", (e) => {
    const node = e.target.closest("[data-bind]");
    if (!node) return;
    if (e.key === "Backspace" && node.textContent.trim() === "") {
      const path = node.getAttribute("data-bind");
      const parts = path.split(".");
      const last = parts[parts.length - 1];
      if (/^\d+$/.test(last)) {
        const arrPath = parts.slice(0, -1).join(".");
        const arr = getByPath(state.cv, arrPath);
        if (Array.isArray(arr) && arr.length > 1) {
          e.preventDefault();
          arr.splice(Number(last), 1);
          renderPreview();
        }
      }
    }
  });

  // "+ add" buttons
  printRoot.addEventListener("click", (e) => {
    const add = e.target.closest(".cv-add");
    if (!add) return;
    const arrPath = add.getAttribute("data-add");
    if (arrPath === "exp") {
      state.cv.experience.push({ role: "New role", company: "Company", dates: "", location: "", bullets: ["New achievement"] });
      state.focusBind = `exp.${state.cv.experience.length - 1}.role`;
    } else {
      const arr = getByPath(state.cv, arrPath);
      if (Array.isArray(arr)) {
        arr.push("");
        state.focusBind = `${arrPath}.${arr.length - 1}`;
      }
    }
    renderPreview();
  });

  /* ================================================================
     13.  ZOOM
     ================================================================ */
  document.getElementById("zoom-in").addEventListener("click", () => {
    const cur = state.zoom || fitScale();
    state.zoom = Math.min(1.6, cur + 0.1); rescalePreview();
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    const cur = state.zoom || fitScale();
    const next = cur - 0.1;
    state.zoom = next <= fitScale() ? null : next; rescalePreview();
  });
  function fitScale() {
    const stage = document.getElementById("preview-stage");
    return Math.min(1, (stage.clientWidth - 64) / 794);
  }

  /* ================================================================
     14.  DOWNLOADS — always serialise the LIVE preview node
     ================================================================ */
  function liveCloneHtml() {
    // Clone the rendered CV, strip editing affordances, return outerHTML
    const root = document.getElementById("cv-print-root");
    const clone = root.cloneNode(true);
    clone.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
    clone.querySelectorAll(".cv-add").forEach((n) => n.remove());
    return clone.innerHTML;
  }

  function collectCss() {
    return Array.from(document.styleSheets).map((sheet) => {
      try { return Array.from(sheet.cssRules).map((r) => r.cssText).join("\n"); }
      catch (e) { return ""; }
    }).join("\n");
  }

  function downloadPdf() {
    if (!state.cv) return;
    // Temporarily un-scale so print captures the page at 100%
    const scaler = document.getElementById("preview-stage-scaler");
    const t = scaler.style.transform, w = scaler.style.width, h = scaler.style.height;
    scaler.style.transform = "none"; scaler.style.width = "auto"; scaler.style.height = "auto";
    setTimeout(() => {
      window.print();
      setTimeout(() => { scaler.style.transform = t; scaler.style.width = w; scaler.style.height = h; }, 300);
    }, 60);
  }

  function downloadWord() {
    if (!state.cv) return;
    const css = collectCss();
    const body = liveCloneHtml(); // <- the ACTUAL enhanced + edited CV
    const fontFix = `
      .cv-a4{font-family:Calibri,Arial,sans-serif;}
      .t-exec__name,.t-creative__name,.t-sidebar__name,.t-timeline__name,
      .t-exec__sec-title,.t-creative__sec-title,.t-sidebar__role,.t-timeline__sec-title{font-family:Georgia,'Times New Roman',serif;}
      .cv-a4{box-shadow:none !important;}
      body{margin:0;}
    `;
    const html = `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${esc(state.cv.name)} CV</title>
<style>${css}\n${fontFix}</style></head><body>${body}</body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(state.cv.name || "CV").replace(/\s+/g, "_")}_Tailored.doc`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  document.getElementById("download-pdf").addEventListener("click", downloadPdf);
  document.getElementById("download-word").addEventListener("click", downloadWord);

  /* ================================================================
     15.  RESET
     ================================================================ */
  function resetDropzone(zoneId, innerId, inputId, title, hint) {
    document.getElementById(inputId).value = "";
    document.getElementById(zoneId).classList.remove("dropzone--has-file");
    document.getElementById(innerId).innerHTML = `
      <svg viewBox="0 0 24 24" class="dropzone__icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <div class="dropzone__title">${title}</div><div class="dropzone__hint">${hint}</div>`;
  }

  document.getElementById("reset-all").addEventListener("click", () => {
    Object.assign(state, { step: 1, cvText: "", cv: null, jdMode: "paste", jdText: "", selectedTheme: "exec", analysis: null, zoom: null, focusBind: null });
    document.getElementById("jd-text").value = "";
    document.getElementById("cv-extract").classList.add("extract--hidden");
    document.getElementById("jd-extract").classList.add("extract--hidden");
    resetDropzone("cv-dropzone", "cv-dropzone-inner", "cv-input", "Drop your file here, or click to browse", "PDF · DOCX");
    resetDropzone("jd-dropzone", "jd-dropzone-inner", "jd-input", "Drop the job description, or click to browse", "PDF · DOCX · TXT");
    document.getElementById("to-step-2").disabled = true;
    document.getElementById("to-step-3").disabled = true;
    document.querySelectorAll(".tab").forEach((t, i) => t.classList.toggle("tab--active", i === 0));
    document.getElementById("jd-paste-pane").classList.remove("hidden");
    document.getElementById("jd-upload-pane").classList.add("hidden");
    showStep(1);
  });

  /* ================================================================
     16.  WIRE NAV + INIT
     ================================================================ */
  document.getElementById("to-step-2").addEventListener("click", () => showStep(2));
  document.getElementById("back-step-1").addEventListener("click", () => showStep(1));
  document.getElementById("to-step-3").addEventListener("click", () => { showStep(3); requestAnimationFrame(renderThemeGrid); });
  document.getElementById("back-step-2").addEventListener("click", () => showStep(2));
  document.getElementById("run-analysis").addEventListener("click", runAnalysis);

  window.addEventListener("resize", () => {
    if (state.step === 3) renderThemeGrid();
    if (state.step === 4) rescalePreview();
  });

  renderStepper();
})();
