"use client";

import Link from "next/link";
import { useState } from "react";
import { parentCopy } from "@/lib/create/copy";
import { IMAGE_CONSENT_VERSION, type CreateFlags } from "@/lib/create/types";

export function CreateSettingsForm({
  childId,
  childName,
  initial,
  consentHref,
  localOnly = false,
  save,
}: {
  childId: string;
  childName: string;
  initial: CreateFlags;
  consentHref: string;
  localOnly?: boolean;
  save?: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [writeOwn, setWriteOwn] = useState(initial.writeOwn);
  const [dailyLimit, setDailyLimit] = useState(initial.dailyLimit);
  const [note, setNote] = useState("");

  return (
    <form
      className="create-settings"
      onSubmit={(event) => {
        event.preventDefault();
        if (localOnly || !save) {
          setNote(parentCopy.saved);
          return;
        }
        const data = new FormData();
        data.set("childId", childId);
        data.set("enabled", enabled ? "1" : "0");
        data.set("writeOwn", writeOwn ? "1" : "0");
        data.set("dailyLimit", String(dailyLimit));
        void save(data).then((result) => setNote(result.ok ? parentCopy.saved : (result.error ?? parentCopy.waiting)));
      }}
    >
      <h3>Create for {childName}</h3>
      <label className="create-check">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        <span>{parentCopy.allow}</span>
      </label>
      <p className="hint">{parentCopy.allowHint}</p>
      <label className="create-check">
        <input type="checkbox" checked={writeOwn} onChange={(event) => setWriteOwn(event.target.checked)} />
        <span>{parentCopy.writeOwn}</span>
      </label>
      <p className="hint">{parentCopy.writeOwnHint}</p>
      <label className="create-limit">
        <span>{parentCopy.daily}</span>
        <select value={dailyLimit} onChange={(event) => setDailyLimit(Number(event.target.value))}>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </label>
      <p className="hint">{parentCopy.dailyHint}</p>
      <p>{initial.consentAt ? parentCopy.consentOn : parentCopy.samplesOnly}</p>
      <Link href={consentHref}>{parentCopy.consentLink}</Link>
      <p className="hint">
        {parentCopy.versionLabel} {initial.consentVersion ?? IMAGE_CONSENT_VERSION}
      </p>
      <button type="submit" className="btn btn-secondary">
        Save Create settings
      </button>
      {note ? <p role="status">{note}</p> : null}
    </form>
  );
}
