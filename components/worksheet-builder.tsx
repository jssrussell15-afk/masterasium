"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { GRADES } from "@/lib/grades";
import {
  buildWorksheetQuestions,
  saveTemplate,
  saveWorksheet,
} from "@/lib/worksheets/actions";
import { makeAccessCode } from "@/lib/worksheets/code";
import {
  getLocalTemplateServerSnapshot,
  getLocalTemplateSnapshot,
  subscribeLocalTemplates,
  writeLocalSet,
  writeLocalTemplate,
} from "@/lib/worksheets/local";
import { readPrintedPage } from "@/lib/worksheets/ocr";
import { UNREADABLE_PAGE_MESSAGE, type PageTextResult } from "@/lib/worksheets/page-text";
import { classifyPageFile, type StoredPageScan } from "@/lib/worksheets/page-scan";
import { buildAnswerSheetPdf, buildWorksheetPdf } from "@/lib/worksheets/pdf";
import { WORKSHEET_SETUP_SQL } from "@/lib/worksheets/setup-sql";
import {
  EMPTY_HEADER,
  type Difficulty,
  type LayoutTemplate,
  type PracticeItem,
  type WorksheetHeader,
} from "@/lib/worksheets/types";

type SkillOption = { id: string; grade: number; title: string };

type ReadySet = {
  items: PracticeItem[];
  note: string | null;
  code: string;
  shared: boolean;
  storageNote: string | null;
};

function downloadBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function mergeTemplates(saved: LayoutTemplate[], local: LayoutTemplate[]): LayoutTemplate[] {
  if (local.length === 0) return saved;
  const ids = new Set(saved.map((item) => item.id));
  const extras = local.filter((item) => !ids.has(item.id));
  return extras.length > 0 ? [...saved, ...extras] : saved;
}

function PageFilePreview({ scan, onRemove }: { scan: StoredPageScan; onRemove: () => void }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const pdfRef = useRef<HTMLIFrameElement>(null);
  const [pageRead, setPageRead] = useState<PageTextResult | null>(null);
  const [pageReading, setPageReading] = useState(true);
  const label = scan.file.name || "page";

  useLayoutEffect(() => {
    const frame = scan.kind === "pdf" ? pdfRef.current : imageRef.current;
    if (!frame) return;
    const previewUrl = URL.createObjectURL(scan.file);
    frame.src = previewUrl;
    return () => {
      URL.revokeObjectURL(previewUrl);
      frame.src = "";
    };
  }, [scan.file, scan.kind]);

  useEffect(() => {
    let cancelled = false;
    void readPrintedPage(scan.file, scan.kind)
      .then((result) => {
        if (!cancelled) setPageRead(result);
      })
      .catch(() => {
        if (!cancelled) setPageRead({ ok: false, message: UNREADABLE_PAGE_MESSAGE });
      })
      .finally(() => {
        if (!cancelled) setPageReading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scan.file, scan.kind]);

  return (
    <div className="page-preview-wrap">
      <p className="text-sm">{label} is saved on this page.</p>
      {scan.kind === "pdf" ? (
        <iframe ref={pdfRef} title={`Preview of ${label}`} className="page-preview page-preview-pdf" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL for a page that stays on this device; next/image cannot optimize it
        <img ref={imageRef} alt={`Preview of ${label}`} className="page-preview" />
      )}
      {pageReading ? <p className="hint text-sm">Reading the printed text…</p> : null}
      {pageRead?.ok ? (
        <div className="page-text-wrap">
          <p className="text-sm">Text read from the page</p>
          <pre className="page-text">{pageRead.text}</pre>
        </div>
      ) : null}
      {pageRead && !pageRead.ok ? (
        <p className="text-sm" role="status">
          {pageRead.message}
        </p>
      ) : null}
      <button type="button" className="btn btn-quiet w-fit" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

function fileSlug(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "worksheet";
}

async function shrinkLogo(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that logo."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Could not read that logo."));
    element.src = dataUrl;
  });
  const max = 320;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function WorksheetBuilder({
  skills,
  initialTemplates,
  storageError,
}: {
  skills: SkillOption[];
  initialTemplates: LayoutTemplate[];
  storageError: string | null;
}) {
  const [templates, setTemplates] = useState<LayoutTemplate[]>(initialTemplates);
  const localTemplates = useSyncExternalStore(
    subscribeLocalTemplates,
    getLocalTemplateSnapshot,
    getLocalTemplateServerSnapshot,
  );
  const savedTemplates = mergeTemplates(templates, localTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [title, setTitle] = useState("Math practice");
  const [instructions, setInstructions] = useState("");
  const [header, setHeader] = useState<WorksheetHeader>(EMPTY_HEADER);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [path, setPath] = useState<"topic" | "upload">("topic");
  const [grade, setGrade] = useState(1);
  const [skillId, setSkillId] = useState(skills.find((skill) => skill.grade === 1)?.id ?? skills[0]?.id ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>("steady");
  const [count, setCount] = useState(8);
  const [uploadText, setUploadText] = useState("");
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [pageScan, setPageScan] = useState<StoredPageScan | null>(null);
  const [pageToken, setPageToken] = useState(0);
  const [pageNote, setPageNote] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<"pdf" | "link">("pdf");
  const [answerSheet, setAnswerSheet] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(storageError);
  const [ready, setReady] = useState<ReadySet | null>(null);
  const [copied, setCopied] = useState(false);

  const gradeSkills = useMemo(() => skills.filter((skill) => skill.grade === grade), [skills, grade]);
  const skillTitle = skills.find((skill) => skill.id === skillId)?.title ?? null;

  function onPageFile(file: File | null) {
    if (!file) return;
    const classified = classifyPageFile(file);
    if ("error" in classified) {
      setPageNote(classified.error);
      return;
    }
    setPageScan({ file, kind: classified.kind });
    setPageToken((current) => current + 1);
    setPageNote(null);
  }

  function applyTemplate(id: string) {
    setSelectedTemplateId(id);
    const template = savedTemplates.find((item) => item.id === id);
    if (!template) return;
    setTitle(template.title || "Math practice");
    setInstructions(template.instructions);
    setHeader(template.header);
    setLogoData(template.logoData);
    setTemplateName(template.name);
  }

  async function onLogo(file: File | null) {
    if (!file) {
      setLogoData(null);
      return;
    }
    try {
      const shrunk = await shrinkLogo(file);
      if (shrunk.length > 150_000) {
        setError("That logo is too large. Use a smaller image.");
        return;
      }
      setLogoData(shrunk);
      setError(null);
    } catch {
      setError("Could not read that logo.");
    }
  }

  async function onSaveTemplate() {
    setPending(true);
    setError(null);
    setNotice(null);
    const saved = await saveTemplate({
      name: templateName || title || "My layout",
      title,
      instructions,
      header,
      logoData,
    });
    if (saved.template) {
      setTemplates((current) => [saved.template!, ...current.filter((item) => item.id !== saved.template?.id)]);
      writeLocalTemplate(saved.template);
      setTemplateName(saved.template.name);
      setSelectedTemplateId(saved.template.id);
      setNotice("Layout saved. Choose it from Saved layouts next time.");
    } else {
      const local: LayoutTemplate = {
        id: crypto.randomUUID(),
        name: templateName || title || "My layout",
        title,
        instructions,
        header,
        logoData,
      };
      writeLocalTemplate(local);
      setTemplates((current) => [local, ...current]);
      setSelectedTemplateId(local.id);
      setError(
        saved.error
          ? `The layout was saved in this browser only. ${saved.error}`
          : "The layout was saved in this browser only.",
      );
    }
    setPending(false);
  }

  async function onCreate() {
    setPending(true);
    setError(null);
    setCopied(false);
    const built = await buildWorksheetQuestions({
      path,
      text: uploadText,
      skillId: skillId || null,
      difficulty,
      count,
    });
    if (built.error || built.items.length === 0) {
      setError(built.error ?? "No questions were created.");
      setPending(false);
      return;
    }
    const code = makeAccessCode();
    const subtitle = path === "topic" ? skillTitle : null;
    const practice = {
      code,
      title: title.trim() || "Math practice",
      instructions: instructions.trim(),
      subtitle,
      logoData,
      items: built.items,
    };
    writeLocalSet(practice);
    const stored = await saveWorksheet(practice);
    const sharedSet = stored.set ?? practice;
    if (stored.set) writeLocalSet(stored.set);
    setReady({
      items: sharedSet.items,
      note: built.note,
      code: sharedSet.code,
      shared: Boolean(stored.set),
      storageNote: stored.error,
    });
    if (delivery === "pdf") {
      const worksheet = await buildWorksheetPdf({
        title: sharedSet.title,
        instructions: sharedSet.instructions,
        subtitle: sharedSet.subtitle,
        gradeLabel: path === "topic" ? String(grade) : null,
        logoData,
        header,
        items: sharedSet.items,
      });
      downloadBytes(worksheet, `${fileSlug(sharedSet.title)}.pdf`);
      if (answerSheet) {
        const answers = await buildAnswerSheetPdf({
          title: sharedSet.title,
          items: sharedSet.items,
        });
        downloadBytes(answers, `${fileSlug(sharedSet.title)}-answers.pdf`);
      }
    }
    setPending(false);
  }

  const link = ready ? `${window.location.origin}/study/${ready.code}` : "";

  return (
    <div className="mt-6 grid gap-6">
      <div>
        <p className="eyebrow">Teacher</p>
        <h1 className="display mt-2 text-4xl">Worksheets</h1>
        <p className="lede mt-3 max-w-2xl">
          Build a practice set from a topic, or upload a worksheet and make similar questions that
          are a little harder. Download a PDF, or share a link with an access code.
        </p>
      </div>

      <section className="card grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold">Layout</h2>
          <label className="field min-w-48">
            Saved layouts
            <select value={selectedTemplateId} onChange={(event) => applyTemplate(event.target.value)}>
              <option value="">Choose a saved layout</option>
              {savedTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="field">
            Layout name
            <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={80} />
          </label>
          <label className="field">
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
          </label>
        </div>
        <label className="field">
          Instructions
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            maxLength={600}
            rows={3}
          />
        </label>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold">Header on the PDF</legend>
          {(
            [
              ["showName", "Student name"],
              ["showDate", "Date"],
              ["showGrade", "Grade"],
              ["showScore", "Score box"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="check-row">
              <input
                type="checkbox"
                checked={header[key]}
                onChange={(event) => setHeader({ ...header, [key]: event.target.checked })}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="field">
          Logo, optional
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => void onLogo(event.target.files?.[0] ?? null)}
          />
        </label>
        {logoData ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo is a data URL kept in this browser; next/image does not optimize data URLs
          <img src={logoData} alt="" className="study-logo" />
        ) : null}
        <button type="button" className="btn btn-secondary w-fit" disabled={pending} onClick={() => void onSaveTemplate()}>
          Save layout
        </button>
        {notice ? <p className="hint text-sm">{notice}</p> : null}
      </section>

      <section className="card grid gap-4">
        <h2 className="text-xl font-semibold">Questions</h2>
        <div className="grid gap-3">
          <label className="btn btn-secondary page-upload">
            Upload photo or PDF of the page
            <input
              className="page-file"
              type="file"
              accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
              aria-label="Upload photo or PDF of the page"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";
                onPageFile(file);
              }}
            />
          </label>
          <p className="hint text-sm">
            JPG, PNG, or PDF from a phone or computer. The file stays on this page, and printed text is read here.
          </p>
          {pageNote ? (
            <p className="feedback bad" role="alert">
              {pageNote}
            </p>
          ) : null}
          {pageScan ? (
            <PageFilePreview key={pageToken} scan={pageScan} onRemove={() => setPageScan(null)} />
          ) : null}
        </div>
        <div className="segmented" role="group" aria-label="How to create questions">
          <button type="button" aria-pressed={path === "upload"} onClick={() => setPath("upload")}>
            Upload a worksheet
          </button>
          <button type="button" aria-pressed={path === "topic"} onClick={() => setPath("topic")}>
            Choose a topic
          </button>
        </div>
        {path === "upload" ? (
          <div className="grid gap-3">
            <label className="field">
              Worksheet file (.txt or .pdf)
              <input
                type="file"
                accept=".txt,.csv,text/plain,application/pdf"
                onChange={(event) => void readUpload(event.target.files?.[0] ?? null, setUploadText, setUploadNote)}
              />
            </label>
            {uploadNote ? <p className="hint text-sm">{uploadNote}</p> : null}
            <label className="field">
              Or paste the questions
              <textarea
                value={uploadText}
                onChange={(event) => setUploadText(event.target.value)}
                rows={5}
                placeholder={"1. 8 + 5 = ?\n2. 12 - 4 = ?"}
              />
            </label>
            <p className="hint text-sm">
              Equations are rewritten with slightly larger numbers. Choose a topic as a backup when a
              line cannot be rewritten.
            </p>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-3">
          <label className="field">
            Grade
            <select
              value={grade}
              onChange={(event) => {
                const next = Number(event.target.value);
                setGrade(next);
                const first = skills.find((skill) => skill.grade === next);
                if (first) setSkillId(first.id);
              }}
            >
              {GRADES.map((item) => (
                <option key={item.grade} value={item.grade}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field md:col-span-2">
            Topic
            <select value={skillId} onChange={(event) => setSkillId(event.target.value)}>
              {gradeSkills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="field">
            Difficulty
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}>
              <option value="easy">Easy</option>
              <option value="steady">Steady</option>
              <option value="harder">Harder</option>
            </select>
          </label>
          <label className="field">
            Questions
            <select value={count} onChange={(event) => setCount(Number(event.target.value))}>
              {[4, 6, 8, 10].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="card grid gap-4">
        <h2 className="text-xl font-semibold">Handout</h2>
        <div className="segmented" role="group" aria-label="How students receive the set">
          <button type="button" aria-pressed={delivery === "pdf"} onClick={() => setDelivery("pdf")}>
            Download PDF
          </button>
          <button type="button" aria-pressed={delivery === "link"} onClick={() => setDelivery("link")}>
            Shareable student link
          </button>
        </div>
        {delivery === "pdf" ? (
          <label className="check-row">
            <input
              type="checkbox"
              checked={answerSheet}
              onChange={(event) => setAnswerSheet(event.target.checked)}
            />
            Separate answer sheet
          </label>
        ) : (
          <p className="hint text-sm">
            Students open the link and enter a short code. The set is for practice only. Results are
            not sent back.
          </p>
        )}
        <button type="button" className="btn btn-primary w-fit" disabled={pending} onClick={() => void onCreate()}>
          {pending ? "Creating…" : delivery === "pdf" ? "Create and download" : "Create shareable link"}
        </button>
        {error ? (
          <div className="grid gap-2">
            <p className="feedback bad" role="alert">
              {error}
            </p>
            {error.toLowerCase().includes("worksheet") || error.toLowerCase().includes("database") ? (
              <details className="setup-sql">
                <summary>Copy these statements into the Supabase SQL editor</summary>
                <pre>{WORKSHEET_SETUP_SQL}</pre>
              </details>
            ) : null}
          </div>
        ) : null}
        {ready ? (
          <div className="grid gap-3">
            {ready.note ? <p className="hint text-sm">{ready.note}</p> : null}
            {delivery === "link" ? (
              <div className="grid gap-2">
                <p>
                  Access code <strong className="access-code">{ready.code}</strong>
                </p>
                <p className="hint text-sm break-all">{link}</p>
                <button
                  type="button"
                  className="btn btn-secondary w-fit"
                  onClick={() => {
                    void navigator.clipboard.writeText(link);
                    setCopied(true);
                  }}
                >
                  {copied ? "Copied" : "Copy link"}
                </button>
                <p className="hint text-sm">
                  {ready.shared
                    ? "Students on any browser can open this link and enter the code."
                    : "This link works in this browser. Paste the setup statements above to share it with other computers."}
                </p>
              </div>
            ) : (
              <p className="hint text-sm">
                The worksheet {answerSheet ? "and answer sheet " : ""}downloaded.
                {ready.shared ? ` Access code ${ready.code} is saved if you want a link later.` : ""}
              </p>
            )}
            {ready.storageNote && delivery === "link" ? (
              <details className="setup-sql">
                <summary>Copy these statements into the Supabase SQL editor</summary>
                <pre>{WORKSHEET_SETUP_SQL}</pre>
              </details>
            ) : null}
            <ol className="skill-list">
              {ready.items.map((item, index) => (
                <li key={`${item.prompt}-${index}`}>
                  <span>
                    {index + 1}. {item.prompt}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>
    </div>
  );
}

async function readUpload(
  file: File | null,
  setText: (value: string) => void,
  setNote: (value: string | null) => void,
) {
  if (!file) return;
  if (file.type.startsWith("text") || /\.(txt|csv)$/i.test(file.name)) {
    setText(await file.text());
    setNote(null);
    return;
  }
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const raw = new TextDecoder("latin1").decode(bytes);
    const pieces: string[] = [];
    const pattern = /\((?:\\\)|\\.|[^)\\]{1,200})\)\s*Tj/g;
    for (const match of raw.matchAll(pattern)) {
      const inner = match[0].slice(1, match[0].lastIndexOf(")"));
      pieces.push(inner.replace(/\\n/g, " ").replace(/\\(.)/g, "$1"));
    }
    const text = pieces.join("\n").trim();
    if (text.length < 8) {
      setNote("That PDF did not include readable text. Paste the questions, or choose a topic.");
      return;
    }
    setText(text);
    setNote(null);
    return;
  }
  setNote("Use a .txt worksheet or paste the questions. Photos are not read.");
}
