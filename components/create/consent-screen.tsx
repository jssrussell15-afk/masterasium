"use client";

import { useState } from "react";
import { parentCopy } from "@/lib/create/copy";
import { IMAGE_CONSENT_VERSION } from "@/lib/create/types";

export function ConsentScreen({
  childName,
  initialAt,
  initialVersion,
  localOnly = false,
  save,
}: {
  childName: string;
  initialAt: string | null;
  initialVersion: string | null;
  localOnly?: boolean;
  save?: (grant: boolean) => Promise<{ ok: boolean; at?: string | null; error?: string }>;
}) {
  const [at, setAt] = useState(initialAt);
  const [version, setVersion] = useState(initialVersion);
  const [note, setNote] = useState("");

  async function choose(grant: boolean) {
    if (localOnly || !save) {
      const stamp = grant ? new Date().toISOString() : null;
      setAt(stamp);
      setVersion(grant ? IMAGE_CONSENT_VERSION : null);
      setNote(grant ? parentCopy.consentOn : parentCopy.consentOff);
      return;
    }
    const result = await save(grant);
    if (!result.ok) {
      setNote(result.error ?? parentCopy.waiting);
      return;
    }
    setAt(result.at ?? null);
    setVersion(grant ? IMAGE_CONSENT_VERSION : null);
    setNote(grant ? parentCopy.consentOn : parentCopy.consentOff);
  }

  return (
    <section className="create-consent card">
      <h1 className="display text-3xl">{parentCopy.consentTitle}</h1>
      <p>
        This choice is for {childName}. {parentCopy.consentSent}
      </p>
      <p>{parentCopy.consentKept}</p>
      <p>{parentCopy.consentWithdraw}</p>
      <p>{parentCopy.samplesOnly}</p>
      <p>
        {parentCopy.versionLabel} {IMAGE_CONSENT_VERSION}
        {version ? ` · recorded ${version}` : ""}
        {at ? ` · ${at}` : ""}
      </p>
      <div className="create-chips">
        <button type="button" className="btn btn-primary" onClick={() => void choose(true)}>
          {parentCopy.consentAllow}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => void choose(false)}>
          {parentCopy.consentWithdrawButton}
        </button>
      </div>
      {note ? <p role="status">{note}</p> : null}
    </section>
  );
}
