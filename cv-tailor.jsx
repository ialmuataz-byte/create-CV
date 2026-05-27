import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  Download,
  Check,
  AlertCircle,
  Loader2,
  X,
  Wand2,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  Target,
  Layout,
  RefreshCw,
} from "lucide-react";
import mammoth from "mammoth";

/* ------------------------------------------------------------------ */
/* Fonts + base CSS injection                                          */
/* ------------------------------------------------------------------ */

const StyleInjector = () => {
  useEffect(() => {
    const id = "cv-tailor-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,300..900,0..100,0..1&family=Inter+Tight:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.id = "cv-tailor-styles";
    style.textContent = `
      :root{
        --ink:#14110F;
        --ink-soft:#3A332C;
        --muted:#6B655C;
        --muted-2:#9A9183;
        --line:#E8E2D5;
        --bg:#F5F1EA;
        --bg-2:#EFE9DC;
        --surface:#FFFFFF;
        --accent:#9E4F26;
        --accent-2:#C28860;
        --accent-tint:#F0E2D6;
      }
      .font-display{font-family:'Fraunces',serif;font-optical-sizing:auto;}
      .font-body{font-family:'Inter Tight',sans-serif;}
      .font-mono{font-family:'JetBrains Mono',monospace;}
      .grain{
        background-image:
          radial-gradient(rgba(20,17,15,0.035) 1px, transparent 1px),
          radial-gradient(rgba(20,17,15,0.025) 1px, transparent 1px);
        background-size: 3px 3px, 7px 7px;
        background-position: 0 0, 1px 2px;
      }
      @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      .anim-fade-up{animation:fadeUp .6s cubic-bezier(.2,.8,.2,1) both;}
      .anim-fade-in{animation:fadeIn .4s ease both;}
      .shimmer{
        background:linear-gradient(90deg,transparent,rgba(158,79,38,.12),transparent);
        background-size:200% 100%;
        animation:shimmer 1.8s linear infinite;
      }
      .dotted-bg{
        background-image: radial-gradient(circle, #C9C1B0 1px, transparent 1px);
        background-size: 14px 14px;
      }
      .a4-shadow{ box-shadow: 0 30px 60px -20px rgba(20,17,15,.18), 0 2px 6px rgba(20,17,15,.06); }
      .step-line{ background:repeating-linear-gradient(to right, var(--line) 0 4px, transparent 4px 8px); }
      @media print {
        @page { size: A4; margin: 0; }
        body * { visibility: hidden !important; }
        #cv-print-root, #cv-print-root * { visibility: visible !important; }
        #cv-print-root { position: absolute; left: 0; top: 0; width: 210mm; }
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
};

/* ------------------------------------------------------------------ */
/* Sample data — used until the user runs analysis                     */
/* ------------------------------------------------------------------ */

const SAMPLE_CV = {
  name: "Your Name",
  title: "Your Professional Title",
  location: "City, Country",
  phone: "+000 000 0000",
  email: "you@email.com",
  website: "yourportfolio.com",
  summary:
    "Your tailored professional summary will appear here. Upload your CV and a job description, then click Analyze — the AI will rewrite this in a way that highlights what the role is actually looking for.",
  competencies: [
    "Core Skill One",
    "Core Skill Two",
    "Core Skill Three",
    "Core Skill Four",
    "Core Skill Five",
    "Core Skill Six",
  ],
  experience: [
    {
      role: "Senior Position",
      company: "Company Name",
      dates: "2020 – Present",
      location: "City, Country",
      bullets: [
        "Achievement-led bullet point demonstrating impact and scale.",
        "Second bullet aligned to the keywords found in the job description.",
        "Third bullet showing leadership, ownership and measurable outcome.",
      ],
    },
    {
      role: "Earlier Role",
      company: "Previous Employer",
      dates: "2017 – 2020",
      location: "City, Country",
      bullets: [
        "Concise outcome statement with metric or scope.",
        "Cross-functional contribution relevant to the target role.",
      ],
    },
  ],
  education: [
    {
      degree: "Bachelor's Degree",
      school: "University Name",
      dates: "Graduated 2017",
    },
  ],
  skills: ["Tool One", "Tool Two", "Tool Three", "Tool Four"],
  achievements: [
    "Notable recognition or achievement",
    "Award or distinction worth highlighting",
  ],
};

/* ------------------------------------------------------------------ */
/* CV TEMPLATES — four distinct one-page A4 layouts                    */
/* ------------------------------------------------------------------ */

const A4 = ({ children, style }) => (
  <div
    id="cv-print-root"
    style={{
      width: "210mm",
      minHeight: "297mm",
      maxHeight: "297mm",
      background: "#fff",
      color: "#14110F",
      overflow: "hidden",
      ...style,
    }}
    className="font-body a4-shadow"
  >
    {children}
  </div>
);

/* -- Editorial — large serif headline, full width, columned body -- */
const ThemeEditorial = ({ cv }) => (
  <A4>
    <div style={{ padding: "16mm 14mm 12mm 14mm" }}>
      <div className="flex items-end justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--line)" }}>
        <div>
          <h1 className="font-display leading-[0.95] tracking-tight" style={{ fontSize: 36, fontWeight: 500 }}>
            {cv.name}
          </h1>
          <p className="font-display italic text-[14px] mt-1" style={{ color: "var(--accent)" }}>
            {cv.title}
          </p>
        </div>
        <div className="text-[9.5px] text-right font-mono leading-snug" style={{ color: "var(--muted)" }}>
          <div>{cv.email}</div>
          <div>{cv.phone}</div>
          <div>{cv.location}</div>
          {cv.website && <div>{cv.website}</div>}
        </div>
      </div>

      <p className="text-[10.5px] leading-[1.55] mb-4" style={{ color: "var(--ink-soft)" }}>
        {cv.summary}
      </p>

      <div className="grid grid-cols-[1fr_220px] gap-6">
        <div>
          <SectionTitle>Experience</SectionTitle>
          {cv.experience.map((e, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between items-baseline">
                <div className="font-display text-[12.5px] font-semibold">{e.role}</div>
                <div className="font-mono text-[8.5px]" style={{ color: "var(--muted)" }}>
                  {e.dates}
                </div>
              </div>
              <div className="text-[10px] italic" style={{ color: "var(--accent)" }}>
                {e.company} · {e.location}
              </div>
              <ul className="mt-1 space-y-0.5">
                {e.bullets.map((b, j) => (
                  <li key={j} className="text-[9.5px] leading-snug pl-3 relative" style={{ color: "var(--ink-soft)" }}>
                    <span className="absolute left-0 top-[6px] w-1 h-1 rounded-full" style={{ background: "var(--accent)" }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <SectionTitle>Core Competencies</SectionTitle>
          <ul className="mb-4 space-y-1">
            {cv.competencies.map((c, i) => (
              <li key={i} className="text-[9.5px] flex gap-1.5 items-start" style={{ color: "var(--ink-soft)" }}>
                <span className="font-mono text-[8px] mt-0.5" style={{ color: "var(--accent)" }}>
                  ◆
                </span>
                {c}
              </li>
            ))}
          </ul>

          <SectionTitle>Education</SectionTitle>
          {cv.education.map((ed, i) => (
            <div key={i} className="mb-2">
              <div className="text-[10px] font-semibold">{ed.degree}</div>
              <div className="text-[9px]" style={{ color: "var(--muted)" }}>
                {ed.school} · {ed.dates}
              </div>
            </div>
          ))}

          <SectionTitle>Tools & Skills</SectionTitle>
          <div className="flex flex-wrap gap-1 mb-3">
            {cv.skills.map((s, i) => (
              <span
                key={i}
                className="text-[8.5px] px-1.5 py-0.5 font-mono"
                style={{ background: "var(--accent-tint)", color: "var(--accent)" }}
              >
                {s}
              </span>
            ))}
          </div>

          {cv.achievements?.length > 0 && (
            <>
              <SectionTitle>Recognition</SectionTitle>
              <ul className="space-y-1">
                {cv.achievements.map((a, i) => (
                  <li key={i} className="text-[9px] leading-snug" style={{ color: "var(--ink-soft)" }}>
                    — {a}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  </A4>
);

const SectionTitle = ({ children }) => (
  <div
    className="font-display uppercase tracking-[0.18em] text-[9.5px] mb-1.5 pb-1 border-b"
    style={{ color: "var(--ink)", borderColor: "var(--line)" }}
  >
    {children}
  </div>
);

/* -- Minimal — single column, ultra clean, generous whitespace -- */
const ThemeMinimal = ({ cv }) => (
  <A4>
    <div style={{ padding: "20mm 18mm" }}>
      <h1 className="font-body uppercase tracking-[0.25em] text-[22px] font-light" style={{ color: "var(--ink)" }}>
        {cv.name}
      </h1>
      <div className="flex items-center gap-2 mt-1 mb-1">
        <div className="h-px flex-1" style={{ background: "var(--ink)" }} />
        <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--muted)" }}>
          {cv.title}
        </p>
        <div className="h-px flex-1" style={{ background: "var(--ink)" }} />
      </div>
      <div className="text-center text-[9px] font-mono mt-2 mb-5" style={{ color: "var(--muted)" }}>
        {cv.location} · {cv.phone} · {cv.email}
        {cv.website && ` · ${cv.website}`}
      </div>

      <p className="text-[10.5px] leading-[1.6] text-center max-w-[150mm] mx-auto mb-5" style={{ color: "var(--ink-soft)" }}>
        {cv.summary}
      </p>

      <MinSection title="Experience">
        {cv.experience.map((e, i) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-[11px] font-semibold">{e.role}</span>
                <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                  {" "}
                  · {e.company}
                </span>
              </div>
              <div className="font-mono text-[8.5px]" style={{ color: "var(--muted)" }}>
                {e.dates}
              </div>
            </div>
            <ul className="mt-1 space-y-0.5">
              {e.bullets.map((b, j) => (
                <li key={j} className="text-[9.5px] leading-snug" style={{ color: "var(--ink-soft)" }}>
                  · {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </MinSection>

      <div className="grid grid-cols-2 gap-6 mt-3">
        <MinSection title="Competencies">
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {cv.competencies.map((c, i) => (
              <div key={i} className="text-[9.5px]" style={{ color: "var(--ink-soft)" }}>
                — {c}
              </div>
            ))}
          </div>
        </MinSection>

        <MinSection title="Skills & Tools">
          <div className="flex flex-wrap gap-1">
            {cv.skills.map((s, i) => (
              <span key={i} className="text-[9px] font-mono px-1.5" style={{ color: "var(--accent)" }}>
                {s}
              </span>
            ))}
          </div>
        </MinSection>
      </div>

      <MinSection title="Education">
        {cv.education.map((ed, i) => (
          <div key={i} className="flex justify-between text-[10px]">
            <div>
              <span className="font-semibold">{ed.degree}</span>
              <span style={{ color: "var(--muted)" }}> · {ed.school}</span>
            </div>
            <span className="font-mono text-[8.5px]" style={{ color: "var(--muted)" }}>
              {ed.dates}
            </span>
          </div>
        ))}
      </MinSection>

      {cv.achievements?.length > 0 && (
        <MinSection title="Recognition">
          {cv.achievements.map((a, i) => (
            <div key={i} className="text-[9.5px]" style={{ color: "var(--ink-soft)" }}>
              · {a}
            </div>
          ))}
        </MinSection>
      )}
    </div>
  </A4>
);

const MinSection = ({ title, children }) => (
  <div className="mb-3">
    <div className="text-[8.5px] uppercase tracking-[0.3em] mb-1.5" style={{ color: "var(--muted)" }}>
      {title}
    </div>
    {children}
  </div>
);

/* -- Executive — left dark sidebar, right white content -- */
const ThemeExecutive = ({ cv }) => (
  <A4>
    <div className="grid grid-cols-[68mm_1fr] h-full" style={{ minHeight: "297mm" }}>
      {/* Sidebar */}
      <div style={{ background: "#14110F", color: "#F5F1EA", padding: "14mm 9mm" }}>
        <div className="mb-5">
          <div className="text-[9px] uppercase tracking-[0.3em] mb-1" style={{ color: "var(--accent-2)" }}>
            Curriculum Vitae
          </div>
          <h1 className="font-display text-[22px] leading-[1] font-medium">{cv.name}</h1>
          <p className="font-display italic text-[11px] mt-1.5" style={{ color: "var(--accent-2)" }}>
            {cv.title}
          </p>
        </div>

        <ExecSection title="Contact">
          <div className="space-y-1 text-[9px] font-mono leading-snug">
            <div>{cv.location}</div>
            <div>{cv.phone}</div>
            <div className="break-all">{cv.email}</div>
            {cv.website && <div className="break-all">{cv.website}</div>}
          </div>
        </ExecSection>

        <ExecSection title="Competencies">
          <ul className="space-y-0.5 text-[9.5px]">
            {cv.competencies.map((c, i) => (
              <li key={i}>· {c}</li>
            ))}
          </ul>
        </ExecSection>

        <ExecSection title="Education">
          {cv.education.map((ed, i) => (
            <div key={i} className="mb-1.5">
              <div className="text-[10px] font-semibold">{ed.degree}</div>
              <div className="text-[9px]" style={{ color: "var(--accent-2)" }}>
                {ed.school}
              </div>
              <div className="text-[8.5px] font-mono opacity-70">{ed.dates}</div>
            </div>
          ))}
        </ExecSection>

        <ExecSection title="Skills">
          <div className="flex flex-wrap gap-1">
            {cv.skills.map((s, i) => (
              <span
                key={i}
                className="text-[8px] font-mono px-1.5 py-0.5"
                style={{ border: "1px solid rgba(245,241,234,.25)" }}
              >
                {s}
              </span>
            ))}
          </div>
        </ExecSection>
      </div>

      {/* Main */}
      <div style={{ padding: "14mm 12mm" }}>
        <div className="mb-4">
          <div
            className="font-display uppercase tracking-[0.2em] text-[10px] mb-1.5"
            style={{ color: "var(--accent)" }}
          >
            Profile
          </div>
          <p className="text-[10.5px] leading-[1.55]" style={{ color: "var(--ink-soft)" }}>
            {cv.summary}
          </p>
        </div>

        <div
          className="font-display uppercase tracking-[0.2em] text-[10px] mb-2"
          style={{ color: "var(--accent)" }}
        >
          Professional Experience
        </div>
        {cv.experience.map((e, i) => (
          <div key={i} className="mb-3 relative pl-3">
            <div
              className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            <div className="flex justify-between items-baseline">
              <div className="font-display text-[12.5px] font-semibold">{e.role}</div>
              <div className="font-mono text-[8.5px]" style={{ color: "var(--muted)" }}>
                {e.dates}
              </div>
            </div>
            <div className="text-[10px] italic mb-1" style={{ color: "var(--accent)" }}>
              {e.company} · {e.location}
            </div>
            <ul className="space-y-0.5">
              {e.bullets.map((b, j) => (
                <li key={j} className="text-[9.5px] leading-snug" style={{ color: "var(--ink-soft)" }}>
                  — {b}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {cv.achievements?.length > 0 && (
          <>
            <div
              className="font-display uppercase tracking-[0.2em] text-[10px] mb-1.5 mt-1"
              style={{ color: "var(--accent)" }}
            >
              Recognition
            </div>
            <ul className="space-y-0.5">
              {cv.achievements.map((a, i) => (
                <li key={i} className="text-[9.5px] leading-snug" style={{ color: "var(--ink-soft)" }}>
                  — {a}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  </A4>
);

const ExecSection = ({ title, children }) => (
  <div className="mb-4">
    <div
      className="text-[8.5px] uppercase tracking-[0.3em] mb-1.5 pb-1"
      style={{ borderBottom: "1px solid rgba(245,241,234,.2)", color: "var(--accent-2)" }}
    >
      {title}
    </div>
    {children}
  </div>
);

/* -- Modern — left cream sidebar, right white, terracotta accents -- */
const ThemeModern = ({ cv }) => (
  <A4>
    <div className="grid grid-cols-[72mm_1fr] h-full" style={{ minHeight: "297mm" }}>
      <div style={{ background: "var(--bg-2)", padding: "16mm 9mm" }}>
        <div className="mb-5">
          <div
            className="w-12 h-12 mb-2 flex items-center justify-center font-display text-[20px]"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {cv.name
              ?.split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <h1 className="font-display text-[20px] leading-[1.1] font-semibold">{cv.name}</h1>
          <p className="text-[10px] uppercase tracking-[0.18em] mt-1" style={{ color: "var(--accent)" }}>
            {cv.title}
          </p>
        </div>

        <ModSection title="Contact">
          <div className="space-y-1 text-[9px] font-mono leading-snug" style={{ color: "var(--ink-soft)" }}>
            <div>{cv.location}</div>
            <div>{cv.phone}</div>
            <div className="break-all">{cv.email}</div>
            {cv.website && <div className="break-all">{cv.website}</div>}
          </div>
        </ModSection>

        <ModSection title="Core Competencies">
          <ul className="space-y-0.5 text-[9.5px]" style={{ color: "var(--ink-soft)" }}>
            {cv.competencies.map((c, i) => (
              <li key={i} className="flex gap-1.5">
                <span style={{ color: "var(--accent)" }}>›</span>
                {c}
              </li>
            ))}
          </ul>
        </ModSection>

        <ModSection title="Skills & Tools">
          <div className="flex flex-wrap gap-1">
            {cv.skills.map((s, i) => (
              <span
                key={i}
                className="text-[8.5px] font-mono px-1.5 py-0.5 bg-white"
                style={{ color: "var(--accent)" }}
              >
                {s}
              </span>
            ))}
          </div>
        </ModSection>

        <ModSection title="Education">
          {cv.education.map((ed, i) => (
            <div key={i} className="mb-1.5">
              <div className="text-[10px] font-semibold">{ed.degree}</div>
              <div className="text-[9px]" style={{ color: "var(--muted)" }}>
                {ed.school}
              </div>
              <div className="text-[8.5px] font-mono" style={{ color: "var(--accent)" }}>
                {ed.dates}
              </div>
            </div>
          ))}
        </ModSection>
      </div>

      <div style={{ padding: "16mm 12mm" }}>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-px" style={{ background: "var(--accent)" }} />
            <div
              className="font-display uppercase tracking-[0.2em] text-[10px] font-semibold"
              style={{ color: "var(--ink)" }}
            >
              Profile
            </div>
          </div>
          <p className="text-[10.5px] leading-[1.55]" style={{ color: "var(--ink-soft)" }}>
            {cv.summary}
          </p>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-px" style={{ background: "var(--accent)" }} />
          <div
            className="font-display uppercase tracking-[0.2em] text-[10px] font-semibold"
            style={{ color: "var(--ink)" }}
          >
            Experience
          </div>
        </div>
        {cv.experience.map((e, i) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between items-baseline">
              <div className="font-display text-[12.5px] font-semibold">{e.role}</div>
              <div
                className="font-mono text-[8.5px] px-1.5"
                style={{ background: "var(--accent-tint)", color: "var(--accent)" }}
              >
                {e.dates}
              </div>
            </div>
            <div className="text-[10px] mb-1" style={{ color: "var(--accent)" }}>
              {e.company} · {e.location}
            </div>
            <ul className="space-y-0.5">
              {e.bullets.map((b, j) => (
                <li key={j} className="text-[9.5px] leading-snug pl-3 relative" style={{ color: "var(--ink-soft)" }}>
                  <span className="absolute left-0 top-[6px] w-1.5 h-px" style={{ background: "var(--accent)" }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {cv.achievements?.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-1.5 mt-1">
              <div className="w-6 h-px" style={{ background: "var(--accent)" }} />
              <div
                className="font-display uppercase tracking-[0.2em] text-[10px] font-semibold"
                style={{ color: "var(--ink)" }}
              >
                Recognition
              </div>
            </div>
            <ul className="space-y-0.5">
              {cv.achievements.map((a, i) => (
                <li key={i} className="text-[9.5px] leading-snug pl-3 relative" style={{ color: "var(--ink-soft)" }}>
                  <span className="absolute left-0 top-[6px] w-1.5 h-px" style={{ background: "var(--accent)" }} />
                  {a}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  </A4>
);

const ModSection = ({ title, children }) => (
  <div className="mb-4">
    <div className="text-[8.5px] uppercase tracking-[0.25em] mb-1.5 font-semibold" style={{ color: "var(--ink)" }}>
      {title}
    </div>
    {children}
  </div>
);

const THEMES = [
  { id: "editorial", name: "Editorial", subtitle: "Two-column · Serif", Component: ThemeEditorial },
  { id: "minimal", name: "Minimal", subtitle: "Single column · Refined", Component: ThemeMinimal },
  { id: "executive", name: "Executive", subtitle: "Dark sidebar · Bold", Component: ThemeExecutive },
  { id: "modern", name: "Modern", subtitle: "Cream sidebar · Accents", Component: ThemeModern },
];

/* ------------------------------------------------------------------ */
/* Theme thumbnail (mini preview rendered at small scale)              */
/* ------------------------------------------------------------------ */

const ThemeThumb = ({ theme, selected, onClick }) => {
  const { Component } = theme;
  return (
    <button
      onClick={onClick}
      className="relative text-left group transition-all duration-300"
      style={{ outline: "none" }}
    >
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          border: selected ? `2px solid var(--accent)` : `1px solid var(--line)`,
          background: "#fff",
          boxShadow: selected
            ? "0 12px 32px -8px rgba(158,79,38,.25)"
            : "0 4px 16px -8px rgba(20,17,15,.08)",
        }}
      >
        <div
          style={{
            transform: "scale(0.34)",
            transformOrigin: "top left",
            width: "210mm",
            height: "calc(297mm * 0.34)",
            pointerEvents: "none",
          }}
        >
          <Component cv={SAMPLE_CV} />
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <div>
          <div className="font-display text-[15px] font-semibold">{theme.name}</div>
          <div className="text-[10.5px] font-mono" style={{ color: "var(--muted)" }}>
            {theme.subtitle}
          </div>
        </div>
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
          style={{
            border: `1.5px solid ${selected ? "var(--accent)" : "var(--line)"}`,
            background: selected ? "var(--accent)" : "transparent",
          }}
        >
          {selected && <Check className="w-3 h-3" style={{ color: "#fff" }} strokeWidth={3} />}
        </div>
      </div>
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* File parsing helpers                                                */
/* ------------------------------------------------------------------ */

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });

const extractDocxText = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

/* ------------------------------------------------------------------ */
/* Anthropic API — CV extraction + JD matching                         */
/* ------------------------------------------------------------------ */

const SYSTEM_INSTRUCTIONS = `You are a senior career coach and ATS-optimization specialist. You read a candidate's existing CV and a target job description, then produce a one-page tailored CV.

Rules:
- ALWAYS respond with valid JSON only. No prose, no markdown fences.
- Prioritise relevance to the job description. Drop or compress anything that doesn't move the needle.
- Use strong verbs, concrete outcomes, and seed the job description's exact keywords naturally throughout.
- Keep the final CV concise enough to fit one A4 page: maximum 4 experience entries, maximum 3 bullets per role, maximum 6 competencies, maximum 8 skills/tools, maximum 4 achievements.
- Bullets are one line each, under ~22 words, achievement-led.
- Summary is 3–4 sentences, position-fit, mentions 2–3 keywords from the JD.
- Never invent qualifications, employers, dates, or degrees that aren't in the source CV. Reword and reprioritise only.
- Preserve the candidate's real name, contact details, and education exactly.`;

const buildUserPrompt = (cvText, jdText) => `CANDIDATE CV (raw text):
"""
${cvText}
"""

TARGET JOB DESCRIPTION:
"""
${jdText}
"""

Return a JSON object with this exact shape:
{
  "matchScore": <number 0-100, how well the original CV matches the JD before tailoring>,
  "missingKeywords": [<up to 8 keywords/phrases from the JD that are weak or absent in the original CV>],
  "gaps": [<up to 4 short notes about experience or skill gaps to acknowledge>],
  "improvements": [<up to 5 short, specific suggestions describing what you changed and why>],
  "tailoredCV": {
    "name": "...",
    "title": "... (aligned to the target role)",
    "location": "...",
    "phone": "...",
    "email": "...",
    "website": "... (or empty string)",
    "summary": "3-4 sentence tailored profile",
    "competencies": ["...", "..."],
    "experience": [
      {
        "role": "...",
        "company": "...",
        "dates": "...",
        "location": "...",
        "bullets": ["...", "...", "..."]
      }
    ],
    "education": [{"degree":"...","school":"...","dates":"..."}],
    "skills": ["...", "..."],
    "achievements": ["...", "..."]
  }
}`;

const callClaude = async ({ cvText, cvPdfBase64, jdText }) => {
  const userContent = [];

  if (cvPdfBase64) {
    userContent.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: cvPdfBase64 },
    });
    userContent.push({
      type: "text",
      text:
        "The candidate's CV is in the attached PDF. Extract its content, then proceed.\n\n" +
        buildUserPrompt("(see attached PDF)", jdText),
    });
  } else {
    userContent.push({ type: "text", text: buildUserPrompt(cvText, jdText) });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: SYSTEM_INSTRUCTIONS,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API error ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const clean = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Could not parse model response as JSON");
  }
};

/* ------------------------------------------------------------------ */
/* Step components                                                     */
/* ------------------------------------------------------------------ */

const Stepper = ({ step, steps }) => (
  <div className="flex items-center gap-2 mb-10">
    {steps.map((label, i) => {
      const n = i + 1;
      const active = n === step;
      const done = n < step;
      return (
        <React.Fragment key={i}>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono transition-all"
              style={{
                background: done ? "var(--accent)" : active ? "var(--ink)" : "transparent",
                color: done || active ? "#fff" : "var(--muted)",
                border: done || active ? "none" : "1px solid var(--line)",
              }}
            >
              {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : n}
            </div>
            <span
              className="text-[11px] font-mono uppercase tracking-[0.18em] hidden sm:inline"
              style={{ color: active ? "var(--ink)" : "var(--muted)" }}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && <div className="flex-1 h-px step-line" />}
        </React.Fragment>
      );
    })}
  </div>
);

const Dropzone = ({ onFile, file, accept, hint }) => {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className="cursor-pointer transition-all duration-300 p-8 text-center"
      style={{
        border: `1.5px dashed ${drag ? "var(--accent)" : "var(--line)"}`,
        background: drag ? "var(--accent-tint)" : file ? "var(--surface)" : "transparent",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
      {file ? (
        <div className="flex items-center justify-center gap-3">
          <FileText className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <div className="text-left">
            <div className="text-[13px] font-medium">{file.name}</div>
            <div className="text-[10.5px] font-mono" style={{ color: "var(--muted)" }}>
              {(file.size / 1024).toFixed(1)} KB · click to replace
            </div>
          </div>
        </div>
      ) : (
        <>
          <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--muted)" }} />
          <div className="text-[13px] font-medium">Drop your file here, or click to browse</div>
          <div className="text-[10.5px] font-mono mt-1" style={{ color: "var(--muted)" }}>
            {hint}
          </div>
        </>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Main App                                                            */
/* ------------------------------------------------------------------ */

export default function App() {
  const [step, setStep] = useState(1);
  const [cvFile, setCvFile] = useState(null);
  const [cvText, setCvText] = useState("");
  const [cvPdfBase64, setCvPdfBase64] = useState(null);
  const [jdMode, setJdMode] = useState("paste"); // paste | upload
  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState("editorial");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const ThemeComp = THEMES.find((t) => t.id === selectedTheme).Component;
  const cv = result?.tailoredCV || SAMPLE_CV;

  /* --- CV file handler --- */
  const handleCvFile = async (file) => {
    setError(null);
    setCvFile(file);
    setCvText("");
    setCvPdfBase64(null);
    try {
      if (file.name.toLowerCase().endsWith(".docx")) {
        const text = await extractDocxText(file);
        setCvText(text);
      } else if (file.name.toLowerCase().endsWith(".pdf")) {
        const b64 = await fileToBase64(file);
        setCvPdfBase64(b64);
      } else {
        setError("Please upload a .pdf or .docx file.");
      }
    } catch (e) {
      setError("Could not read that file. Try a different format.");
    }
  };

  /* --- JD file handler --- */
  const handleJdFile = async (file) => {
    setError(null);
    setJdFile(file);
    try {
      if (file.name.toLowerCase().endsWith(".docx")) {
        const text = await extractDocxText(file);
        setJdText(text);
      } else if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
        const text = await file.text();
        setJdText(text);
      } else {
        setError("For job descriptions, please upload .docx or .txt, or paste the text.");
      }
    } catch (e) {
      setError("Could not read the job description file.");
    }
  };

  /* --- Run AI analysis --- */
  const runAnalysis = async () => {
    setError(null);
    if (!cvFile) return setError("Upload your CV first.");
    if (!jdText.trim()) return setError("Add the job description first.");

    setAnalyzing(true);
    try {
      const data = await callClaude({ cvText, cvPdfBase64, jdText });
      if (!data?.tailoredCV) throw new Error("Response was missing the tailored CV.");
      // Normalise to defaults so the UI never breaks
      data.tailoredCV = { ...SAMPLE_CV, ...data.tailoredCV };
      setResult(data);
      setStep(4);
    } catch (e) {
      setError(e.message || "Something went wrong analyzing the CV.");
    } finally {
      setAnalyzing(false);
    }
  };

  /* --- Downloads --- */
  const downloadPdf = () => window.print();

  const downloadWord = () => {
    const node = document.getElementById("cv-print-root");
    if (!node) return;
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${cv.name} - CV</title><style>
      body{font-family:Georgia,'Times New Roman',serif;color:#14110F;}
      h1,h2,h3,h4{font-family:Georgia,serif;}
    </style></head><body>${node.outerHTML}</body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(cv.name || "CV").replace(/\s+/g, "_")}_Tailored.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setStep(1);
    setCvFile(null);
    setCvText("");
    setCvPdfBase64(null);
    setJdMode("paste");
    setJdText("");
    setJdFile(null);
    setResult(null);
    setError(null);
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="min-h-screen font-body" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <StyleInjector />

      {/* ---- HERO ---- */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 dotted-bg opacity-40 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-8 relative">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 flex items-center justify-center font-display text-[15px] font-semibold"
                style={{ background: "var(--ink)", color: "var(--bg)" }}
              >
                T
              </div>
              <div>
                <div className="font-display text-[14px] font-semibold leading-none">Tailor</div>
                <div className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ color: "var(--muted)" }}>
                  CV Atelier
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono" style={{ color: "var(--muted)" }}>
              <Sparkles className="w-3 h-3" style={{ color: "var(--accent)" }} />
              Powered by Claude
            </div>
          </div>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 mb-5 text-[10.5px] font-mono uppercase tracking-[0.2em]"
              style={{ background: "var(--accent-tint)", color: "var(--accent)" }}>
              <span className="w-1 h-1 rounded-full" style={{ background: "var(--accent)" }} />
              AI-tailored · One page · ATS-friendly
            </div>
            <h1
              className="font-display tracking-tight leading-[0.9] mb-5"
              style={{ fontSize: "clamp(40px, 7vw, 84px)", fontWeight: 400 }}
            >
              Your CV,{" "}
              <em className="italic" style={{ color: "var(--accent)" }}>
                rewritten
              </em>
              <br />
              for the role you want.
            </h1>
            <p className="text-[15px] leading-[1.55] max-w-xl" style={{ color: "var(--muted)" }}>
              Upload your existing CV and the job description. The AI compares them, surfaces what's missing,
              rewrites your experience around the role's actual keywords, and lays it out on a single, refined page.
            </p>
          </div>
        </div>
      </header>

      {/* ---- WORKFLOW ---- */}
      <main className="max-w-6xl mx-auto px-6 pb-24">
        <Stepper step={step} steps={["Upload CV", "Job Description", "Choose Theme", "Tailor & Preview"]} />

        {error && (
          <div
            className="mb-6 px-4 py-3 flex items-start gap-2.5 anim-fade-in"
            style={{ background: "#FCEEE6", border: "1px solid #E8B89F", color: "#8C3D14" }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="text-[12.5px] flex-1">{error}</div>
            <button onClick={() => setError(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STEP 1 — Upload CV */}
        {step === 1 && (
          <section className="anim-fade-up">
            <Card
              title="Upload your CV"
              kicker="Step 01"
              description="PDF or Word document. We'll extract its content and pass it to the AI alongside the job description."
              icon={<FileText className="w-4 h-4" />}
            >
              <Dropzone
                onFile={handleCvFile}
                file={cvFile}
                accept=".pdf,.docx"
                hint="Supported · PDF, DOCX · Max 10MB"
              />
              {cvText && (
                <div className="mt-4 p-3 text-[11px] font-mono leading-relaxed max-h-32 overflow-hidden relative"
                  style={{ background: "var(--bg-2)", color: "var(--muted)" }}>
                  <div className="text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: "var(--accent)" }}>
                    Extracted preview
                  </div>
                  {cvText.slice(0, 320)}…
                </div>
              )}
              {cvPdfBase64 && (
                <div className="mt-4 p-3 text-[11px] font-mono flex items-center gap-2"
                  style={{ background: "var(--bg-2)", color: "var(--muted)" }}>
                  <Check className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                  PDF queued — content will be extracted by Claude during analysis.
                </div>
              )}
            </Card>
            <NextRow onNext={() => setStep(2)} canNext={!!cvFile && (cvText || cvPdfBase64)} />
          </section>
        )}

        {/* STEP 2 — Job Description */}
        {step === 2 && (
          <section className="anim-fade-up">
            <Card
              title="Add the job description"
              kicker="Step 02"
              description="Paste the listing text or attach the file. The more detail you include, the sharper the tailoring."
              icon={<Briefcase className="w-4 h-4" />}
            >
              <div className="flex gap-1 mb-4 p-1 w-fit" style={{ background: "var(--bg-2)" }}>
                {[
                  { id: "paste", label: "Paste text" },
                  { id: "upload", label: "Upload file" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setJdMode(t.id)}
                    className="px-3.5 py-1.5 text-[11.5px] font-mono uppercase tracking-[0.15em] transition-all"
                    style={{
                      background: jdMode === t.id ? "var(--ink)" : "transparent",
                      color: jdMode === t.id ? "var(--bg)" : "var(--muted)",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {jdMode === "paste" ? (
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  rows={10}
                  placeholder="Paste the full job description, including responsibilities, requirements, and any keywords the employer emphasises…"
                  className="w-full p-4 text-[12.5px] leading-[1.55] resize-none focus:outline-none transition-colors font-body"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--line)")}
                />
              ) : (
                <Dropzone
                  onFile={handleJdFile}
                  file={jdFile}
                  accept=".docx,.txt"
                  hint="Supported · DOCX, TXT"
                />
              )}

              {jdText && jdMode === "upload" && (
                <div className="mt-3 p-3 text-[11px] font-mono leading-relaxed max-h-24 overflow-hidden"
                  style={{ background: "var(--bg-2)", color: "var(--muted)" }}>
                  <div className="text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: "var(--accent)" }}>
                    Preview
                  </div>
                  {jdText.slice(0, 280)}…
                </div>
              )}
            </Card>
            <NextRow onPrev={() => setStep(1)} onNext={() => setStep(3)} canNext={!!jdText.trim()} />
          </section>
        )}

        {/* STEP 3 — Theme */}
        {step === 3 && (
          <section className="anim-fade-up">
            <Card
              title="Pick a layout"
              kicker="Step 03"
              description="Four one-page designs, each ATS-friendly. You can switch any time — the layout adapts to your tailored content."
              icon={<Layout className="w-4 h-4" />}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {THEMES.map((t) => (
                  <ThemeThumb
                    key={t.id}
                    theme={t}
                    selected={selectedTheme === t.id}
                    onClick={() => setSelectedTheme(t.id)}
                  />
                ))}
              </div>
            </Card>
            <NextRow
              onPrev={() => setStep(2)}
              onNext={runAnalysis}
              canNext={!analyzing}
              nextLabel={analyzing ? "Analyzing…" : "Tailor my CV"}
              nextIcon={analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            />

            {analyzing && (
              <div className="mt-6 anim-fade-in">
                <div className="h-1 w-full overflow-hidden" style={{ background: "var(--line)" }}>
                  <div className="h-full w-1/3 shimmer" />
                </div>
                <div className="mt-3 text-[11.5px] font-mono" style={{ color: "var(--muted)" }}>
                  Reading your CV · Cross-referencing the JD · Rewriting for ATS · One moment.
                </div>
              </div>
            )}
          </section>
        )}

        {/* STEP 4 — Results */}
        {step === 4 && result && (
          <section className="anim-fade-up">
            {/* Analysis panel */}
            <div className="grid md:grid-cols-[1fr_240px] gap-6 mb-8">
              <div>
                <Card
                  title="What we changed"
                  kicker="Analysis"
                  description="The AI's read on your CV vs. the role, and the changes it made to close the gap."
                  icon={<Target className="w-4 h-4" />}
                >
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <Label>Missing keywords surfaced</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {result.missingKeywords?.length ? (
                          result.missingKeywords.map((k, i) => (
                            <span
                              key={i}
                              className="text-[11px] font-mono px-2 py-0.5"
                              style={{ background: "var(--accent-tint)", color: "var(--accent)" }}
                            >
                              {k}
                            </span>
                          ))
                        ) : (
                          <span className="text-[12px]" style={{ color: "var(--muted)" }}>
                            None — your CV already covers the brief.
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Gaps to acknowledge</Label>
                      <ul className="space-y-1">
                        {(result.gaps || []).length === 0 && (
                          <li className="text-[12px]" style={{ color: "var(--muted)" }}>
                            No meaningful gaps detected.
                          </li>
                        )}
                        {(result.gaps || []).map((g, i) => (
                          <li key={i} className="text-[12px] leading-snug" style={{ color: "var(--ink-soft)" }}>
                            — {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--line)" }}>
                    <Label>What was improved</Label>
                    <ul className="space-y-1.5">
                      {(result.improvements || []).map((g, i) => (
                        <li
                          key={i}
                          className="text-[12.5px] leading-snug pl-4 relative"
                          style={{ color: "var(--ink-soft)" }}
                        >
                          <span className="absolute left-0 top-[7px] w-2 h-px" style={{ background: "var(--accent)" }} />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </div>

              <ScoreCard score={result.matchScore || 0} />
            </div>

            {/* Theme switcher + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10.5px] font-mono uppercase tracking-[0.2em] mr-1" style={{ color: "var(--muted)" }}>
                  Layout
                </span>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTheme(t.id)}
                    className="px-3 py-1.5 text-[11.5px] font-mono transition-all"
                    style={{
                      background: selectedTheme === t.id ? "var(--ink)" : "transparent",
                      color: selectedTheme === t.id ? "var(--bg)" : "var(--ink-soft)",
                      border: selectedTheme === t.id ? "1px solid var(--ink)" : "1px solid var(--line)",
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetAll}
                  className="px-3.5 py-2 text-[11.5px] font-mono uppercase tracking-[0.15em] flex items-center gap-1.5 transition-all"
                  style={{ background: "transparent", color: "var(--muted)", border: "1px solid var(--line)" }}
                >
                  <RefreshCw className="w-3 h-3" /> Start over
                </button>
                <button
                  onClick={downloadWord}
                  className="px-3.5 py-2 text-[11.5px] font-mono uppercase tracking-[0.15em] flex items-center gap-1.5 transition-all"
                  style={{ background: "transparent", color: "var(--ink)", border: "1px solid var(--ink)" }}
                >
                  <Download className="w-3.5 h-3.5" /> Word
                </button>
                <button
                  onClick={downloadPdf}
                  className="px-4 py-2 text-[11.5px] font-mono uppercase tracking-[0.15em] flex items-center gap-1.5 transition-all"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>

            {/* Live A4 preview */}
            <div
              className="p-6 md:p-10 flex justify-center overflow-auto"
              style={{ background: "var(--bg-2)" }}
            >
              <div
                style={{
                  transform: "scale(min(1, calc((100vw - 120px) / 794)))",
                  transformOrigin: "top center",
                }}
              >
                <ThemeComp cv={cv} />
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap justify-between items-center gap-3">
          <div className="text-[10.5px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
            Tailor · CV Atelier
          </div>
          <div className="text-[10.5px] font-mono" style={{ color: "var(--muted)" }}>
            One page · ATS-friendly · Editable in Word
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small UI primitives                                                 */
/* ------------------------------------------------------------------ */

const Card = ({ title, kicker, description, icon, children }) => (
  <div
    className="p-7 md:p-9 mb-6"
    style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
  >
    <div className="flex items-start justify-between mb-5">
      <div className="max-w-xl">
        <div className="flex items-center gap-1.5 mb-2 text-[10px] font-mono uppercase tracking-[0.25em]"
          style={{ color: "var(--accent)" }}>
          {icon}
          {kicker}
        </div>
        <h2 className="font-display text-[28px] leading-[1.05] mb-2 font-medium">{title}</h2>
        <p className="text-[12.5px] leading-[1.55]" style={{ color: "var(--muted)" }}>
          {description}
        </p>
      </div>
    </div>
    {children}
  </div>
);

const Label = ({ children }) => (
  <div className="text-[10px] font-mono uppercase tracking-[0.25em] mb-2" style={{ color: "var(--muted)" }}>
    {children}
  </div>
);

const NextRow = ({ onPrev, onNext, canNext = true, nextLabel = "Continue", nextIcon }) => (
  <div className="flex items-center justify-between mt-2">
    {onPrev ? (
      <button
        onClick={onPrev}
        className="px-3.5 py-2 text-[11.5px] font-mono uppercase tracking-[0.15em] flex items-center gap-1.5 transition-all"
        style={{ background: "transparent", color: "var(--muted)" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>
    ) : (
      <div />
    )}
    <button
      onClick={onNext}
      disabled={!canNext}
      className="px-5 py-2.5 text-[11.5px] font-mono uppercase tracking-[0.15em] flex items-center gap-2 transition-all"
      style={{
        background: canNext ? "var(--ink)" : "var(--bg-2)",
        color: canNext ? "var(--bg)" : "var(--muted-2)",
        cursor: canNext ? "pointer" : "not-allowed",
      }}
    >
      {nextLabel}
      {nextIcon || <ArrowRight className="w-3.5 h-3.5" />}
    </button>
  </div>
);

const ScoreCard = ({ score }) => {
  const pct = Math.max(0, Math.min(100, score));
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="p-6 flex flex-col items-center text-center"
      style={{ background: "var(--ink)", color: "var(--bg)" }}
    >
      <div className="text-[9.5px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: "var(--accent-2)" }}>
        Original match
      </div>
      <div className="relative w-[100px] h-[100px]">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(245,241,234,.15)" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--accent-2)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * pct) / 100}
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-display text-[28px] font-medium">
          {pct}
        </div>
      </div>
      <div className="text-[10.5px] mt-3 leading-snug" style={{ color: "var(--muted-2)" }}>
        Before tailoring. The version below is rewritten to score higher against this brief.
      </div>
    </div>
  );
};
