"use client";

import { useState } from "react";
import { SomethingLooksWrong } from "@/components/something-looks-wrong";
import { resolveContentFlag, reviewContentItem, reviseContentItem } from "@/lib/content/actions";
import {
  DIFFICULTY_LABEL,
  EMPTY_FILTER,
  filterItems,
  previewItem,
  reviseItem,
  decideItem,
  type ContentFilter,
  type ContentFlag,
  type ContentItem,
  type Decision,
} from "@/lib/content/model";

export function ContentAdmin({
  items,
  flags,
  preview = false,
}: {
  items: ContentItem[];
  flags: ContentFlag[];
  preview?: boolean;
}) {
  const [rows, setRows] = useState(items);
  const [inbox, setInbox] = useState(flags);
  const [filter, setFilter] = useState<ContentFilter>(EMPTY_FILTER);
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const visible = filterItems(rows, filter);
  const selected = rows.find((item) => item.id === selectedId) ?? visible[0] ?? null;

  function setField(key: keyof ContentFilter, value: string) {
    setFilter((current) => ({ ...current, [key]: value }));
  }

  function apply(decision: Decision) {
    if (!selected || !preview) return;
    const next = decideItem(selected, decision, "admin", new Date().toISOString(), note);
    setRows((current) => current.map((item) => (item.id === next.item.id ? next.item : item)));
    setNote("");
    setEditing(false);
  }

  function saveEdit(form: FormData) {
    if (!selected) return;
    const prompt = String(form.get("prompt") ?? "").trim();
    const answer = String(form.get("answer") ?? "").trim();
    if (!prompt || !answer) return;
    const next = reviseItem(selected, { ...selected.template, prompt, answer });
    setRows((current) => current.map((item) => (item.id === next.id ? next : item)));
    setEditing(false);
  }

  return (
    <div className="content-admin mt-4 grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Content review</h1>
        <p className="hint">Practice serves published items. A draft stays off the child's screen.</p>
      </div>
      <div className="content-filters">
        <Filter label="Skill" value={filter.skill} onChange={(value) => setField("skill", value)} options={unique(rows.map((item) => item.skillSlug))} />
        <Filter label="Type" value={filter.questionType} onChange={(value) => setField("questionType", value)} options={unique(rows.map((item) => item.questionType))} />
        <Filter label="Lane" value={filter.lane} onChange={(value) => setField("lane", value)} options={unique(rows.map((item) => item.lane))} />
        <Filter
          label="Difficulty"
          value={filter.difficulty}
          onChange={(value) => setField("difficulty", value)}
          options={["1", "2", "3"]}
          labelFor={(value) => `${value} ${DIFFICULTY_LABEL[Number(value) as 1 | 2 | 3]}`}
        />
        <Filter label="Status" value={filter.status} onChange={(value) => setField("status", value)} options={unique(rows.map((item) => item.status))} />
        <Filter label="Source" value={filter.source} onChange={(value) => setField("source", value)} options={unique(rows.map((item) => item.source))} />
      </div>
      <div className="content-admin-main">
        <div className="card">
          <table className="content-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Type</th>
                <th>Lane</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} data-selected={item.id === selected?.id ? "true" : "false"}>
                  <td>
                    <button type="button" className="content-row" onClick={() => { setSelectedId(item.id); setEditing(false); }}>
                      {item.skillSlug}
                    </button>
                  </td>
                  <td>{item.questionType}</td>
                  <td>{item.lane === "go_further" ? "Go further" : item.lane}</td>
                  <td>{item.difficulty} {DIFFICULTY_LABEL[item.difficulty]}</td>
                  <td>{item.status}</td>
                  <td>{item.source === "hand_written" ? "hand written" : item.source === "ai_draft" ? "ai draft" : item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 ? <p className="hint">Nothing matches these filters.</p> : null}
        </div>
        {selected ? (
          <ItemPreview
            item={selected}
            preview={preview}
            editing={editing}
            note={note}
            onNote={setNote}
            onEdit={() => setEditing(true)}
            onApply={apply}
            onSave={saveEdit}
          />
        ) : null}
      </div>
      <section className="card" aria-label="Flags">
        <h2>Flags</h2>
        {inbox.filter((flag) => flag.status === "open").length === 0 ? <p className="hint">No open notes.</p> : null}
        <ul className="flag-list">
          {inbox.filter((flag) => flag.status === "open").map((flag) => (
            <li key={flag.id} className="flag-row">
              <p>{flag.prompt}</p>
              <p className="hint">{flag.reason}</p>
              {preview ? (
                <button type="button" className="btn btn-secondary" onClick={() => setInbox((current) => current.map((item) => item.id === flag.id ? { ...item, status: "resolved" } : item))}>
                  Resolve
                </button>
              ) : (
                <form action={resolveContentFlag}>
                  <input type="hidden" name="flagId" value={flag.id} />
                  <button className="btn btn-secondary" type="submit">Resolve</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ItemPreview({
  item,
  preview,
  editing,
  note,
  onNote,
  onEdit,
  onApply,
  onSave,
}: {
  item: ContentItem;
  preview: boolean;
  editing: boolean;
  note: string;
  onNote: (value: string) => void;
  onEdit: () => void;
  onApply: (decision: Decision) => void;
  onSave: (form: FormData) => void;
}) {
  const shown = previewItem(item);
  return (
    <aside className="card grid gap-3" aria-label="Preview">
      <div>
        <h2>{item.skillSlug}</h2>
        <p className="hint">Version {item.version} · {item.status}</p>
      </div>
      <section className="question-card" aria-label="Question">
        <p className="prompt">{shown.prompt}</p>
        <SomethingLooksWrong enabled preview surface="question" childId="preview-child" skillId={item.skillSlug} itemId={item.id} prompt={shown.prompt} />
      </section>
      {item.template.steps && item.template.steps.length > 0 ? (
        <section className="question-card" aria-label="Walkthrough">
          <p className="topic-label">Show me</p>
          <ol className="guide-steps">
            {item.template.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <SomethingLooksWrong enabled preview surface="walkthrough" childId="preview-child" skillId={item.skillSlug} itemId={item.id} prompt={shown.prompt} />
        </section>
      ) : null}
      <section className="question-card" aria-label="Explanation">
        <p>Here's how.</p>
        <p className="hint">Checker: {shown.note}</p>
        <SomethingLooksWrong enabled preview surface="explanation" childId="preview-child" skillId={item.skillSlug} itemId={item.id} prompt={shown.prompt} />
      </section>
      {editing ? (
        <form
          className="grid gap-2"
          action={preview ? undefined : reviseContentItem}
          onSubmit={(event) => {
            if (!preview) return;
            event.preventDefault();
            onSave(new FormData(event.currentTarget));
          }}
        >
          <input type="hidden" name="itemId" value={item.id} />
          <label className="grid gap-1">
            Prompt
            <textarea name="prompt" defaultValue={item.template.prompt} rows={3} />
          </label>
          <label className="grid gap-1">
            Answer
            <input name="answer" defaultValue={item.template.answer} />
          </label>
          <button className="btn btn-primary w-fit" type="submit">Save new version</button>
        </form>
      ) : (
        <div className="grid gap-2">
          <label className="grid gap-1">
            Note
            <input name="notes" value={note} onChange={(event) => onNote(event.target.value)} />
          </label>
          <div className="content-actions">
            {preview ? (
              <>
                <button type="button" className="btn btn-primary" onClick={() => onApply("approve")}>Approve</button>
                <button type="button" className="btn btn-secondary" onClick={() => onApply("request_changes")}>Request changes</button>
                <button type="button" className="btn btn-secondary" onClick={onEdit}>Edit</button>
                <button type="button" className="btn btn-secondary" onClick={() => onApply("retire")}>Retire</button>
              </>
            ) : (
              <>
                <DecisionButton itemId={item.id} decision="approve" label="Approve" notes={note} />
                <DecisionButton itemId={item.id} decision="request_changes" label="Request changes" notes={note} />
                <button type="button" className="btn btn-secondary" onClick={onEdit}>Edit</button>
                <DecisionButton itemId={item.id} decision="retire" label="Retire" notes={note} />
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function DecisionButton({
  itemId,
  decision,
  label,
  notes,
}: {
  itemId: string;
  decision: Decision;
  label: string;
  notes: string;
}) {
  return (
    <form action={reviewContentItem}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="decision" value={decision} />
      <input type="hidden" name="notes" value={notes} />
      <button className={decision === "approve" ? "btn btn-primary" : "btn btn-secondary"} type="submit">
        {label}
      </button>
    </form>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
  labelFor,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  labelFor?: (value: string) => string;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labelFor ? labelFor(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
