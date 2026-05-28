/* ==================================================================
   Tailor · CV Atelier — vanilla JS
   Static demo: simulated AI analysis, real PDF/Word downloads.
   ================================================================== */

(function () {
  "use strict";

  /* ----------------------------------------------------------------
     State
     ---------------------------------------------------------------- */

  const state = {
    step: 1,
    cvFile: null,
    jdMode: "paste",          // 'paste' | 'upload'
    jdText: "",
    jdFile: null,
    selectedTheme: "editorial",
    analysis: null,           // {score, missingKeywords, gaps, improvements}
    cv: null,                 // the displayed tailored CV
  };

  const STEPS = ["Upload CV", "Job Description", "Choose Theme", "Tailor & Preview"];

  /* ----------------------------------------------------------------
     Sample tailored CV — used after the simulated analysis runs.
     Generic but realistic so the demo isn't tied to one person.
     ---------------------------------------------------------------- */

  const SAMPLE_TAILORED_CV = {
    name: "Sarah Mitchell",
    title: "Senior Product Marketing Manager",
    location: "London, UK",
    phone: "+44 7700 900123",
    email: "sarah.mitchell@email.com",
    website: "sarahmitchell.work",
    summary:
      "Product marketing leader with 8+ years driving go-to-market strategy for SaaS and consumer tech. Proven record translating complex products into clear positioning, partnering with cross-functional teams, and delivering measurable revenue impact. Skilled in B2B narrative development, customer research, and integrated launch campaigns aligned to growth-stage commercial goals.",
    competencies: [
      "Go-to-Market Strategy",
      "Positioning & Messaging",
      "Cross-Functional Leadership",
      "Customer Research",
      "Launch Campaign Management",
      "Sales Enablement",
    ],
    experience: [
      {
        role: "Senior Product Marketing Manager",
        company: "Northwind SaaS",
        dates: "2021 – Present",
        location: "London, UK",
        bullets: [
          "Led GTM strategy for three product launches, contributing $4.2M in pipeline within 12 months.",
          "Built positioning framework adopted by sales, marketing and product, lifting demo conversion 38%.",
          "Established competitive intelligence program informing roadmap and sales enablement at scale.",
        ],
      },
      {
        role: "Product Marketing Manager",
        company: "Vantage Cloud",
        dates: "2018 – 2021",
        location: "London, UK",
        bullets: [
          "Owned messaging for enterprise tier; partnered with sales to close $1.8M in expansion ARR.",
          "Ran 40+ customer discovery interviews shaping persona work used across the marketing org.",
        ],
      },
      {
        role: "Marketing Associate",
        company: "Brightline Studio",
        dates: "2016 – 2018",
        location: "Manchester, UK",
        bullets: [
          "Executed integrated campaigns across paid, organic and lifecycle, growing MQLs 62% YoY.",
        ],
      },
    ],
    education: [
      {
        degree: "BA (Hons) Marketing & Business",
        school: "University of Manchester",
        dates: "Graduated 2016",
      },
    ],
    skills: ["Notion", "HubSpot", "Figma", "Looker", "Webflow", "Pendo"],
    achievements: [
      "Speaker, SaaStock 2024 — 'Positioning that survives a re-launch'",
      "Marketing Week '30 Under 30' — Product Marketing, 2022",
    ],
  };

  /* ----------------------------------------------------------------
     Themes — render fns return HTML strings
     ---------------------------------------------------------------- */

  const escapeHtml = (s = "") =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const renderEditorial = (cv) => `
    <div class="cv-a4 cv-editorial">
      <div class="cv-editorial__head">
        <div>
          <h1 class="cv-editorial__name">${escapeHtml(cv.name)}</h1>
          <p class="cv-editorial__title">${escapeHtml(cv.title)}</p>
        </div>
        <div class="cv-editorial__contact">
          <div>${escapeHtml(cv.email)}</div>
          <div>${escapeHtml(cv.phone)}</div>
          <div>${escapeHtml(cv.location)}</div>
          ${cv.website ? `<div>${escapeHtml(cv.website)}</div>` : ""}
        </div>
      </div>

      <p class="cv-editorial__summary">${escapeHtml(cv.summary)}</p>

      <div class="cv-editorial__cols">
        <div>
          <div class="cv-section-title">Experience</div>
          ${cv.experience
            .map(
              (e) => `
            <div class="cv-editorial__job">
              <div class="cv-editorial__job-head">
                <div class="cv-editorial__role">${escapeHtml(e.role)}</div>
                <div class="cv-meta">${escapeHtml(e.dates)}</div>
              </div>
              <div class="cv-editorial__company">${escapeHtml(e.company)} · ${escapeHtml(e.location)}</div>
              <ul class="cv-editorial__bullets">
                ${e.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
              </ul>
            </div>`
            )
            .join("")}
        </div>

        <div>
          <div class="cv-section-title">Core Competencies</div>
          <ul class="cv-editorial__sidebar-list">
            ${cv.competencies.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}
          </ul>

          <div class="cv-section-title">Education</div>
          ${cv.education
            .map(
              (ed) => `
            <div style="margin-bottom:8px;">
              <div class="cv-editorial__edu-degree">${escapeHtml(ed.degree)}</div>
              <div class="cv-editorial__edu-school">${escapeHtml(ed.school)} · ${escapeHtml(ed.dates)}</div>
            </div>`
            )
            .join("")}

          <div class="cv-section-title">Tools & Skills</div>
          <div class="cv-editorial__skills">
            ${cv.skills.map((s) => `<span class="cv-editorial__skill">${escapeHtml(s)}</span>`).join("")}
          </div>

          ${
            cv.achievements && cv.achievements.length
              ? `<div class="cv-section-title">Recognition</div>
                 <ul class="cv-editorial__achievements">
                   ${cv.achievements.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}
                 </ul>`
              : ""
          }
        </div>
      </div>
    </div>
  `;

  const renderMinimal = (cv) => `
    <div class="cv-a4 cv-minimal">
      <h1 class="cv-minimal__name">${escapeHtml(cv.name)}</h1>
      <div class="cv-minimal__rule">
        <div class="line"></div>
        <p class="cv-minimal__title">${escapeHtml(cv.title)}</p>
        <div class="line"></div>
      </div>
      <div class="cv-minimal__contact">
        ${escapeHtml(cv.location)} · ${escapeHtml(cv.phone)} · ${escapeHtml(cv.email)}${
    cv.website ? " · " + escapeHtml(cv.website) : ""
  }
      </div>

      <p class="cv-minimal__summary">${escapeHtml(cv.summary)}</p>

      <div class="cv-minimal__section">
        <div class="cv-minimal__section-title">Experience</div>
        ${cv.experience
          .map(
            (e) => `
          <div class="cv-minimal__job">
            <div class="cv-minimal__job-head">
              <div>
                <span class="cv-minimal__role">${escapeHtml(e.role)}</span>
                <span class="cv-minimal__role-co"> · ${escapeHtml(e.company)}</span>
              </div>
              <div class="cv-minimal__job-date">${escapeHtml(e.dates)}</div>
            </div>
            <ul class="cv-minimal__bullets">
              ${e.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
            </ul>
          </div>`
          )
          .join("")}
      </div>

      <div class="cv-minimal__cols">
        <div>
          <div class="cv-minimal__section-title">Competencies</div>
          <div class="cv-minimal__compgrid">
            ${cv.competencies.map((c) => `<div>${escapeHtml(c)}</div>`).join("")}
          </div>
        </div>
        <div>
          <div class="cv-minimal__section-title">Skills & Tools</div>
          <div>
            ${cv.skills.map((s) => `<span class="cv-minimal__skill-pill">${escapeHtml(s)}</span>`).join("")}
          </div>
        </div>
      </div>

      <div class="cv-minimal__section">
        <div class="cv-minimal__section-title">Education</div>
        ${cv.education
          .map(
            (ed) => `
          <div style="display:flex; justify-content:space-between; font-size:10px;">
            <div>
              <span style="font-weight:600;">${escapeHtml(ed.degree)}</span>
              <span style="color: var(--muted);"> · ${escapeHtml(ed.school)}</span>
            </div>
            <span class="cv-meta">${escapeHtml(ed.dates)}</span>
          </div>`
          )
          .join("")}
      </div>

      ${
        cv.achievements && cv.achievements.length
          ? `<div class="cv-minimal__section">
               <div class="cv-minimal__section-title">Recognition</div>
               ${cv.achievements
                 .map((a) => `<div style="font-size:9.5px; color: var(--ink-soft);">· ${escapeHtml(a)}</div>`)
                 .join("")}
             </div>`
          : ""
      }
    </div>
  `;

  const renderExecutive = (cv) => `
    <div class="cv-a4 cv-executive">
      <div class="cv-executive__sidebar">
        <div class="cv-executive__kicker">Curriculum Vitae</div>
        <h1 class="cv-executive__name">${escapeHtml(cv.name)}</h1>
        <p class="cv-executive__title">${escapeHtml(cv.title)}</p>

        <div class="cv-executive__side-section">
          <div class="cv-executive__side-title">Contact</div>
          <div class="cv-executive__contact">
            <div>${escapeHtml(cv.location)}</div>
            <div>${escapeHtml(cv.phone)}</div>
            <div>${escapeHtml(cv.email)}</div>
            ${cv.website ? `<div>${escapeHtml(cv.website)}</div>` : ""}
          </div>
        </div>

        <div class="cv-executive__side-section">
          <div class="cv-executive__side-title">Competencies</div>
          <ul class="cv-executive__side-list">
            ${cv.competencies.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}
          </ul>
        </div>

        <div class="cv-executive__side-section">
          <div class="cv-executive__side-title">Education</div>
          ${cv.education
            .map(
              (ed) => `
            <div class="cv-executive__edu-block">
              <div class="d">${escapeHtml(ed.degree)}</div>
              <div class="s">${escapeHtml(ed.school)}</div>
              <div class="y">${escapeHtml(ed.dates)}</div>
            </div>`
            )
            .join("")}
        </div>

        <div class="cv-executive__side-section">
          <div class="cv-executive__side-title">Skills</div>
          <div class="cv-executive__chips">
            ${cv.skills.map((s) => `<span class="cv-executive__chip">${escapeHtml(s)}</span>`).join("")}
          </div>
        </div>
      </div>

      <div class="cv-executive__main">
        <div class="cv-executive__section-title">Profile</div>
        <p class="cv-executive__summary">${escapeHtml(cv.summary)}</p>

        <div class="cv-executive__section-title">Professional Experience</div>
        ${cv.experience
          .map(
            (e) => `
          <div class="cv-executive__job">
            <div class="cv-executive__job-head">
              <div class="cv-executive__role">${escapeHtml(e.role)}</div>
              <div class="cv-executive__date">${escapeHtml(e.dates)}</div>
            </div>
            <div class="cv-executive__co">${escapeHtml(e.company)} · ${escapeHtml(e.location)}</div>
            <ul class="cv-executive__bullets">
              ${e.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
            </ul>
          </div>`
          )
          .join("")}

        ${
          cv.achievements && cv.achievements.length
            ? `<div class="cv-executive__section-title" style="margin-top:8px;">Recognition</div>
               <ul class="cv-executive__bullets">
                 ${cv.achievements.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}
               </ul>`
            : ""
        }
      </div>
    </div>
  `;

  const renderModern = (cv) => {
    const initials = cv.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("");
    return `
      <div class="cv-a4 cv-modern">
        <div class="cv-modern__sidebar">
          <div class="cv-modern__avatar">${escapeHtml(initials)}</div>
          <h1 class="cv-modern__name">${escapeHtml(cv.name)}</h1>
          <p class="cv-modern__title">${escapeHtml(cv.title)}</p>

          <div class="cv-modern__side-section">
            <div class="cv-modern__side-title">Contact</div>
            <div class="cv-modern__contact">
              <div>${escapeHtml(cv.location)}</div>
              <div>${escapeHtml(cv.phone)}</div>
              <div>${escapeHtml(cv.email)}</div>
              ${cv.website ? `<div>${escapeHtml(cv.website)}</div>` : ""}
            </div>
          </div>

          <div class="cv-modern__side-section">
            <div class="cv-modern__side-title">Core Competencies</div>
            <ul class="cv-modern__side-list">
              ${cv.competencies.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}
            </ul>
          </div>

          <div class="cv-modern__side-section">
            <div class="cv-modern__side-title">Skills & Tools</div>
            <div>
              ${cv.skills.map((s) => `<span class="cv-modern__skill-pill">${escapeHtml(s)}</span>`).join("")}
            </div>
          </div>

          <div class="cv-modern__side-section">
            <div class="cv-modern__side-title">Education</div>
            ${cv.education
              .map(
                (ed) => `
              <div class="cv-modern__edu-block">
                <div class="d">${escapeHtml(ed.degree)}</div>
                <div class="s">${escapeHtml(ed.school)}</div>
                <div class="y">${escapeHtml(ed.dates)}</div>
              </div>`
              )
              .join("")}
          </div>
        </div>

        <div class="cv-modern__main">
          <div class="cv-modern__section-title">Profile</div>
          <p class="cv-modern__summary">${escapeHtml(cv.summary)}</p>

          <div class="cv-modern__section-title">Experience</div>
          ${cv.experience
            .map(
              (e) => `
            <div class="cv-modern__job">
              <div class="cv-modern__job-head">
                <div class="cv-modern__role">${escapeHtml(e.role)}</div>
                <div class="cv-modern__date">${escapeHtml(e.dates)}</div>
              </div>
              <div class="cv-modern__co">${escapeHtml(e.company)} · ${escapeHtml(e.location)}</div>
              <ul class="cv-modern__bullets">
                ${e.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
              </ul>
            </div>`
            )
            .join("")}

          ${
            cv.achievements && cv.achievements.length
              ? `<div class="cv-modern__section-title">Recognition</div>
                 <ul class="cv-modern__bullets">
                   ${cv.achievements.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}
                 </ul>`
              : ""
          }
        </div>
      </div>
    `;
  };

  const THEMES = [
    { id: "editorial", name: "Editorial", subtitle: "Two-column · Serif", render: renderEditorial },
    { id: "minimal", name: "Minimal", subtitle: "Single column · Refined", render: renderMinimal },
    { id: "executive", name: "Executive", subtitle: "Dark sidebar · Bold", render: renderExecutive },
    { id: "modern", name: "Modern", subtitle: "Cream sidebar · Accents", render: renderModern },
  ];

  const renderCV = (themeId, cv) => {
    const t = THEMES.find((x) => x.id === themeId);
    return t ? t.render(cv) : "";
  };

  /* ----------------------------------------------------------------
     Stepper
     ---------------------------------------------------------------- */

  const renderStepper = () => {
    const el = document.getElementById("stepper");
    el.innerHTML = STEPS.map((label, i) => {
      const n = i + 1;
      const done = n < state.step;
      const active = n === state.step;
      const num = done
        ? `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
        : n;
      const cls =
        "stepper__num" + (done ? " stepper__num--done" : "") + (active ? " stepper__num--active" : "");
      const labelCls = "stepper__label" + (active ? " stepper__label--active" : "");
      const sep = i < STEPS.length - 1 ? `<div class="stepper__line"></div>` : "";
      return `
        <div class="stepper__item">
          <div class="${cls}">${num}</div>
          <span class="${labelCls}">${label}</span>
        </div>
        ${sep}
      `;
    }).join("");
  };

  const showStep = (n) => {
    state.step = n;
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById("step-" + i);
      if (i === n) el.classList.remove("step--hidden");
      else el.classList.add("step--hidden");
    }
    renderStepper();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ----------------------------------------------------------------
     Error banner
     ---------------------------------------------------------------- */

  const showError = (msg) => {
    document.getElementById("error-text").textContent = msg;
    document.getElementById("error-banner").classList.remove("banner--hidden");
  };

  const hideError = () => {
    document.getElementById("error-banner").classList.add("banner--hidden");
  };

  document.getElementById("error-close").addEventListener("click", hideError);

  /* ----------------------------------------------------------------
     Dropzone helpers (used for both CV and JD uploads)
     ---------------------------------------------------------------- */

  const setupDropzone = (zoneId, innerId, inputId, previewId, previewTextId, onFile, accept) => {
    const zone = document.getElementById(zoneId);
    const inner = document.getElementById(innerId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const previewText = document.getElementById(previewTextId);

    const update = (file) => {
      if (!file) return;
      // simple validation by extension
      const name = file.name.toLowerCase();
      const ok = accept.some((ext) => name.endsWith(ext));
      if (!ok) {
        showError(`Unsupported file. Try ${accept.join(", ")}`);
        return;
      }
      hideError();
      zone.classList.add("dropzone--has-file");
      inner.innerHTML = `
        <div class="dropzone__file">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="dropzone__file-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          <div>
            <div class="dropzone__file-name">${escapeHtml(file.name)}</div>
            <div class="dropzone__file-meta">${(file.size / 1024).toFixed(1)} KB · click to replace</div>
          </div>
        </div>
      `;
      if (preview && previewText) {
        previewText.textContent = `File ready: ${file.name}`;
        preview.classList.remove("preview-strip--hidden");
      }
      onFile(file);
    };

    input.addEventListener("change", (e) => {
      if (e.target.files[0]) update(e.target.files[0]);
    });

    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("dropzone--drag");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("dropzone--drag"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("dropzone--drag");
      if (e.dataTransfer.files[0]) {
        input.files = e.dataTransfer.files;
        update(e.dataTransfer.files[0]);
      }
    });
  };

  /* ----------------------------------------------------------------
     CV upload (step 1)
     ---------------------------------------------------------------- */

  setupDropzone(
    "cv-dropzone",
    "cv-dropzone-inner",
    "cv-input",
    "cv-preview",
    "cv-preview-text",
    (file) => {
      state.cvFile = file;
      document.getElementById("to-step-2").disabled = false;
    },
    [".pdf", ".docx"]
  );

  /* ----------------------------------------------------------------
     JD (step 2)
     ---------------------------------------------------------------- */

  const jdTextarea = document.getElementById("jd-text");
  jdTextarea.addEventListener("input", (e) => {
    state.jdText = e.target.value;
    document.getElementById("to-step-3").disabled = state.jdText.trim().length < 20;
  });

  // Tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.getAttribute("data-jd-mode");
      state.jdMode = mode;
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("tab--active"));
      tab.classList.add("tab--active");
      document.getElementById("jd-paste-pane").classList.toggle("hidden", mode !== "paste");
      document.getElementById("jd-upload-pane").classList.toggle("hidden", mode !== "upload");
      // Recompute the gating
      const ready =
        (mode === "paste" && state.jdText.trim().length >= 20) ||
        (mode === "upload" && !!state.jdFile);
      document.getElementById("to-step-3").disabled = !ready;
    });
  });

  setupDropzone(
    "jd-dropzone",
    "jd-dropzone-inner",
    "jd-input",
    "jd-preview",
    "jd-preview-text",
    (file) => {
      state.jdFile = file;
      // mark a placeholder JD text so analysis still works
      if (!state.jdText.trim()) {
        state.jdText = `[Attached file: ${file.name}] — Job description supplied via file upload.`;
      }
      document.getElementById("to-step-3").disabled = false;
    },
    [".pdf", ".docx", ".txt"]
  );

  /* ----------------------------------------------------------------
     Theme selection (step 3) + theme switcher (step 4)
     ---------------------------------------------------------------- */

  const renderThemeGrid = () => {
    const grid = document.getElementById("theme-grid");
    grid.innerHTML = THEMES.map(
      (t) => `
      <button class="theme-thumb ${state.selectedTheme === t.id ? "theme-thumb--selected" : ""}" data-theme="${t.id}">
        <div class="theme-thumb__frame">
          <div class="theme-thumb__scaler" data-thumb-scaler>
            ${t.render(SAMPLE_TAILORED_CV)}
          </div>
        </div>
        <div class="theme-thumb__meta">
          <div>
            <div class="theme-thumb__name">${t.name}</div>
            <div class="theme-thumb__sub">${t.subtitle}</div>
          </div>
          <div class="theme-thumb__check">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
      </button>`
    ).join("");

    // Wire click + size thumbnails responsively
    grid.querySelectorAll(".theme-thumb").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedTheme = btn.getAttribute("data-theme");
        renderThemeGrid();
      });
    });

    // Size each scaler to match its container width
    requestAnimationFrame(() => {
      grid.querySelectorAll(".theme-thumb__frame").forEach((frame) => {
        const scaler = frame.querySelector("[data-thumb-scaler]");
        const w = frame.clientWidth;
        // A4 width in px ≈ 794 (210mm at ~96dpi). Scale to fit frame width.
        const scale = w / 794;
        scaler.style.transform = `scale(${scale})`;
      });
    });
  };

  // Re-scale thumbnails on resize
  window.addEventListener("resize", () => {
    const grid = document.getElementById("theme-grid");
    if (!grid) return;
    grid.querySelectorAll(".theme-thumb__frame").forEach((frame) => {
      const scaler = frame.querySelector("[data-thumb-scaler]");
      if (!scaler) return;
      const w = frame.clientWidth;
      scaler.style.transform = `scale(${w / 794})`;
    });
    rescalePreview();
  });

  const renderThemeSwitcher = () => {
    const el = document.getElementById("theme-switcher");
    el.innerHTML = THEMES.map(
      (t) =>
        `<button class="theme-switch ${state.selectedTheme === t.id ? "theme-switch--active" : ""}" data-theme="${t.id}">${t.name}</button>`
    ).join("");
    el.querySelectorAll(".theme-switch").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedTheme = btn.getAttribute("data-theme");
        renderThemeSwitcher();
        renderPreview();
      });
    });
  };

  /* ----------------------------------------------------------------
     Simulated AI analysis
     ---------------------------------------------------------------- */

  const KEYWORD_BANK = [
    "stakeholder management", "cross-functional", "data-driven", "go-to-market",
    "product-led growth", "ATS optimisation", "OKRs", "lifecycle marketing",
    "agile delivery", "P&L ownership", "narrative development", "competitive intelligence",
    "executive communication", "customer research", "growth marketing",
  ];

  const GAP_BANK = [
    "Some of the target seniority signals could be reinforced earlier in the summary.",
    "Volume metrics for the highlighted launches are implicit; the role asks for explicit numbers.",
    "Cross-regional / international scope isn't called out, though the JD emphasises it.",
    "Consider adding a recent certification or course aligned to the role's tooling stack.",
  ];

  const IMPROVEMENT_BANK = [
    "Rewrote the summary to lead with the role's exact title and seniority signal.",
    "Promoted three keywords from the JD into bullet leads instead of trailing them.",
    "Compressed early-career roles to make room for higher-impact recent achievements.",
    "Standardised metric formatting (e.g. $4.2M, 38%) so the ATS parses them cleanly.",
    "Reordered competencies to mirror the order in which they appear in the JD.",
    "Tightened verbs — replaced 'helped with' and 'worked on' with achievement-led phrasing.",
  ];

  const pickRandom = (arr, n) => {
    const a = arr.slice();
    const picked = [];
    while (picked.length < n && a.length) {
      const i = Math.floor(Math.random() * a.length);
      picked.push(a.splice(i, 1)[0]);
    }
    return picked;
  };

  const simulateAnalysis = () => {
    // Derive a score from the JD length so the demo isn't fully random
    const len = state.jdText.length;
    const base = Math.min(85, 40 + Math.floor(len / 80));
    const jitter = Math.floor(Math.random() * 8) - 4;
    const score = Math.max(35, Math.min(78, base + jitter));

    return {
      score,
      missingKeywords: pickRandom(KEYWORD_BANK, 5 + Math.floor(Math.random() * 2)),
      gaps: pickRandom(GAP_BANK, 2 + Math.floor(Math.random() * 2)),
      improvements: pickRandom(IMPROVEMENT_BANK, 4),
    };
  };

  const runAnalysis = () => {
    hideError();
    document.getElementById("loader").classList.remove("loader--hidden");
    document.getElementById("run-analysis").disabled = true;

    // Simulate latency so the loader feels purposeful
    setTimeout(() => {
      state.analysis = simulateAnalysis();
      state.cv = SAMPLE_TAILORED_CV;
      document.getElementById("loader").classList.add("loader--hidden");
      document.getElementById("run-analysis").disabled = false;
      paintResults();
      showStep(4);
    }, 1800);
  };

  /* ----------------------------------------------------------------
     Paint results (step 4)
     ---------------------------------------------------------------- */

  const paintResults = () => {
    const a = state.analysis;

    // Missing keywords
    const chips = document.getElementById("missing-keywords");
    chips.innerHTML = a.missingKeywords.length
      ? a.missingKeywords.map((k) => `<span class="chip">${escapeHtml(k)}</span>`).join("")
      : `<span style="font-size:12px;color:var(--muted)">None — your CV already covers the brief.</span>`;

    // Gaps
    const gapsEl = document.getElementById("gaps-list");
    gapsEl.innerHTML = a.gaps.length
      ? a.gaps.map((g) => `<li>${escapeHtml(g)}</li>`).join("")
      : `<li style="color:var(--muted)">No meaningful gaps detected.</li>`;

    // Improvements
    const impEl = document.getElementById("improvements-list");
    impEl.innerHTML = a.improvements.map((g) => `<li>${escapeHtml(g)}</li>`).join("");

    // Score ring (circumference = 2πr where r = 38 ≈ 238.76)
    const c = 2 * Math.PI * 38;
    const offset = c - (c * a.score) / 100;
    const circle = document.getElementById("score-circle");
    circle.setAttribute("stroke-dasharray", c.toFixed(2));
    // Reset to full then animate
    circle.setAttribute("stroke-dashoffset", c.toFixed(2));
    setTimeout(() => {
      circle.setAttribute("stroke-dashoffset", offset.toFixed(2));
    }, 100);

    // Score number — animate count up
    const valEl = document.getElementById("score-value");
    let current = 0;
    const target = a.score;
    const duration = 900;
    const startTs = performance.now();
    const tick = (ts) => {
      const t = Math.min(1, (ts - startTs) / duration);
      current = Math.round(target * (1 - Math.pow(1 - t, 3)));
      valEl.textContent = current;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    renderThemeSwitcher();
    renderPreview();
  };

  /* ----------------------------------------------------------------
     Live A4 preview
     ---------------------------------------------------------------- */

  const rescalePreview = () => {
    const scaler = document.getElementById("preview-stage-scaler");
    if (!scaler || !state.cv) return;
    const stage = scaler.parentElement;
    const stageWidth = stage.clientWidth - 80; // account for padding
    const a4Px = 794; // ~ 210mm at 96dpi
    const scale = Math.min(1, stageWidth / a4Px);
    scaler.style.transform = `scale(${scale})`;
    // Make container height match scaled height so the page doesn't overflow visibly
    const a4Height = 1123; // ~ 297mm at 96dpi
    scaler.style.height = `${a4Height * scale}px`;
    scaler.style.width = `${a4Px * scale}px`;
  };

  const renderPreview = () => {
    if (!state.cv) return;
    const root = document.getElementById("cv-print-root");
    root.innerHTML = renderCV(state.selectedTheme, state.cv);
    rescalePreview();
  };

  /* ----------------------------------------------------------------
     Downloads
     ---------------------------------------------------------------- */

  const downloadPdf = () => {
    // Use the browser's print dialog. The print CSS isolates #cv-print-root.
    // Briefly remove the transform so it prints at 100%.
    const scaler = document.getElementById("preview-stage-scaler");
    const savedT = scaler.style.transform;
    const savedW = scaler.style.width;
    const savedH = scaler.style.height;
    scaler.style.transform = "none";
    scaler.style.width = "auto";
    scaler.style.height = "auto";
    setTimeout(() => {
      window.print();
      // Restore after print dialog
      setTimeout(() => {
        scaler.style.transform = savedT;
        scaler.style.width = savedW;
        scaler.style.height = savedH;
      }, 200);
    }, 50);
  };

  const downloadWord = () => {
    const node = document.getElementById("cv-print-root");
    if (!node) return;
    const cv = state.cv || SAMPLE_TAILORED_CV;

    // Pull current stylesheet so the doc renders close to the on-screen design
    const css = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((r) => r.cssText)
            .join("\n");
        } catch (e) {
          return "";
        }
      })
      .join("\n");

    const html = `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${escapeHtml(cv.name)} - CV</title>
<style>${css}
body{margin:0;padding:0;background:#fff;}
.cv-a4{box-shadow:none !important;}
</style></head>
<body>${node.innerHTML}</body></html>`;

    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cv.name.replace(/\s+/g, "_")}_Tailored.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ----------------------------------------------------------------
     Reset
     ---------------------------------------------------------------- */

  const resetAll = () => {
    state.cvFile = null;
    state.jdText = "";
    state.jdFile = null;
    state.analysis = null;
    state.cv = null;
    state.selectedTheme = "editorial";

    document.getElementById("cv-input").value = "";
    document.getElementById("jd-input").value = "";
    document.getElementById("jd-text").value = "";

    // Reset CV dropzone
    document.getElementById("cv-dropzone").classList.remove("dropzone--has-file");
    document.getElementById("cv-dropzone-inner").innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="dropzone__icon">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <div class="dropzone__title">Drop your file here, or click to browse</div>
      <div class="dropzone__hint">Supported · PDF, DOCX · Max 10MB</div>`;
    document.getElementById("cv-preview").classList.add("preview-strip--hidden");

    // Reset JD dropzone
    document.getElementById("jd-dropzone").classList.remove("dropzone--has-file");
    document.getElementById("jd-dropzone-inner").innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="dropzone__icon">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <div class="dropzone__title">Drop your file here, or click to browse</div>
      <div class="dropzone__hint">Supported · PDF, DOCX, TXT</div>`;
    document.getElementById("jd-preview").classList.add("preview-strip--hidden");

    document.getElementById("to-step-2").disabled = true;
    document.getElementById("to-step-3").disabled = true;

    renderThemeGrid();
    showStep(1);
  };

  /* ----------------------------------------------------------------
     Wire navigation buttons
     ---------------------------------------------------------------- */

  document.getElementById("to-step-2").addEventListener("click", () => showStep(2));
  document.getElementById("back-step-1").addEventListener("click", () => showStep(1));
  document.getElementById("to-step-3").addEventListener("click", () => {
    showStep(3);
    // Render thumbnails after the section is visible (so widths exist)
    requestAnimationFrame(renderThemeGrid);
  });
  document.getElementById("back-step-2").addEventListener("click", () => showStep(2));
  document.getElementById("run-analysis").addEventListener("click", runAnalysis);
  document.getElementById("reset-all").addEventListener("click", resetAll);
  document.getElementById("download-pdf").addEventListener("click", downloadPdf);
  document.getElementById("download-word").addEventListener("click", downloadWord);

  /* ----------------------------------------------------------------
     Init
     ---------------------------------------------------------------- */

  renderStepper();
})();
