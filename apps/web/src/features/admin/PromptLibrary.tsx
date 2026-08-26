"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  OPERATOR_PROMPT_PROFILES,
  createOperatorPromptRelease,
  loadOperatorPrompts,
  publishOperatorPromptRelease,
  type OperatorPromptLibraryState,
  type OperatorPromptProfile,
} from "@/lib/operator-prompt-client";

export function PromptLibrary() {
  const [profile, setProfile] = useState<OperatorPromptProfile>("image.studio");
  const [library, setLibrary] = useState<OperatorPromptLibraryState>();
  const [selectedId, setSelectedId] = useState("");
  const [template, setTemplate] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [busy, setBusy] = useState<"load" | "save" | "publish">();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(
    async (nextProfile = profile, preserveSelectionId?: string) => {
      setBusy("load");
      setError("");
      try {
        const next = await loadOperatorPrompts(nextProfile);
        setLibrary(next);
        const selected = preserveSelectionId
          ? next.releases.find((release) => release.id === preserveSelectionId)
          : next.releases.find(
              (release) => release.id === next.activeReleaseId,
            );
        const release = selected ?? next.releases[0];
        setSelectedId(release?.id ?? "");
        setTemplate(release?.template ?? "");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Prompt library unavailable",
        );
      } finally {
        setBusy(undefined);
      }
    },
    [profile],
  );

  useEffect(() => {
    void refresh(profile);
  }, [profile, refresh]);

  const selected = library?.releases.find(
    (release) => release.id === selectedId,
  );
  const active = library?.releases.find(
    (release) => release.id === library.activeReleaseId,
  );
  const inlineError = useMemo(() => {
    if (!library) return "";
    if (!template.trim()) return "Template is required.";
    if (template.length > 12_000) return "Template exceeds 12,000 characters.";
    const placeholders = [
      ...template.matchAll(/\{\{([a-z][a-z0-9_]*)\}\}/g),
    ].map((match) => match[1] ?? "");
    if (/[{}]/.test(template.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, "")))
      return "Fix malformed placeholder braces.";
    const allowed = new Set(library.allowedVariables.map((item) => item.name));
    const unknown = placeholders.find((name) => !allowed.has(name));
    if (unknown) return `Unknown variable: ${unknown}.`;
    const missing = library.allowedVariables.find(
      ({ name }) => !placeholders.includes(name),
    );
    return missing ? `Required variable missing: ${missing.name}.` : "";
  }, [library, template]);

  function chooseRelease(id: string) {
    const release = library?.releases.find((item) => item.id === id);
    if (!release) return;
    setSelectedId(id);
    setTemplate(release.template);
    setChangeNote("");
    setError("");
    setMessage("");
    requestAnimationFrame(() => {
      textarea.current?.setSelectionRange(0, 0);
      textarea.current?.scrollTo({ top: 0 });
    });
  }

  function insertVariable(name: string) {
    const field = textarea.current;
    const token = `{{${name}}}`;
    const start = field?.selectionStart ?? template.length;
    const end = field?.selectionEnd ?? start;
    setTemplate(`${template.slice(0, start)}${token}${template.slice(end)}`);
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function save() {
    if (inlineError || !changeNote.trim()) return;
    setBusy("save");
    setError("");
    setMessage("");
    try {
      const created = await createOperatorPromptRelease({
        profile,
        template,
        changeNote: changeNote.trim(),
      });
      const next = await loadOperatorPrompts(profile);
      setLibrary(next);
      setSelectedId(created.id);
      setTemplate(created.template);
      setChangeNote("");
      setMessage(`Version ${created.version} saved. It is not live yet.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setBusy(undefined);
    }
  }

  async function publish() {
    if (!library || !selected || selected.id === library.activeReleaseId)
      return;
    if (
      !window.confirm(
        `Publish ${profile} v${selected.version}? This replaces live v${active?.version ?? "?"}.`,
      )
    )
      return;
    setBusy("publish");
    setError("");
    setMessage("");
    try {
      await publishOperatorPromptRelease({
        releaseId: selected.id,
        expectedCurrentReleaseId: library.activeReleaseId,
      });
      await refresh(profile, selected.id);
      setMessage(
        `Version ${selected.version} is live${selected.version < (active?.version ?? 0) ? " — rollback complete" : ""}.`,
      );
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "Publish failed";
      setError(text);
      if (/refresh required/i.test(text)) await refresh(profile, selected.id);
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <section
      className="clm-prompt-library"
      aria-labelledby="prompt-library-title"
    >
      <div className="clm-prompt-heading">
        <div>
          <p className="clm-kicker">Versioned creative direction</p>
          <h1 id="prompt-library-title">Prompt Library</h1>
          <p>
            Save immutable versions, then publish any version to make it live.
          </p>
        </div>
        <label>
          Profile
          <select
            value={profile}
            onChange={(event) =>
              setProfile(event.target.value as OperatorPromptProfile)
            }
          >
            {OPERATOR_PROMPT_PROFILES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      {message && (
        <p className="clm-status" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="clm-prompt-error" role="alert">
          {error}
        </p>
      )}
      <div className="clm-prompt-grid" aria-busy={busy === "load"}>
        <aside aria-label="Version history">
          <div>
            <h2>Version history</h2>
            <button
              type="button"
              onClick={() => void refresh(profile, selectedId)}
            >
              Refresh
            </button>
          </div>
          <ol>
            {library?.releases.map((release) => (
              <li key={release.id}>
                <button
                  type="button"
                  aria-pressed={selectedId === release.id}
                  onClick={() => chooseRelease(release.id)}
                >
                  <span>v{release.version}</span>
                  {release.id === library.activeReleaseId && (
                    <strong>Live</strong>
                  )}
                  <small>{release.changeNote}</small>
                </button>
              </li>
            ))}
          </ol>
        </aside>
        <div className="clm-prompt-editor">
          <div className="clm-prompt-release-state">
            <span>
              Live version <strong>v{active?.version ?? "—"}</strong>
            </span>
            <span>
              Selected <strong>v{selected?.version ?? "—"}</strong>
            </span>
          </div>
          <label htmlFor="prompt-template">Template</label>
          <textarea
            ref={textarea}
            id="prompt-template"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
            maxLength={12_000}
            spellCheck
            aria-describedby="prompt-validation"
          />
          <div className="clm-variable-chips" aria-label="Allowed variables">
            {library?.allowedVariables.map((variable) => (
              <button
                key={variable.name}
                type="button"
                title={variable.description}
                onClick={() => insertVariable(variable.name)}
              >
                {`{{${variable.name}}}`}
              </button>
            ))}
          </div>
          <p
            id="prompt-validation"
            className={inlineError ? "clm-prompt-error" : "clm-prompt-valid"}
          >
            {inlineError || "Template variables are valid."} ·{" "}
            {template.length.toLocaleString()} / 12,000
          </p>
          <label htmlFor="prompt-change-note">Change note</label>
          <input
            id="prompt-change-note"
            value={changeNote}
            onChange={(event) => setChangeNote(event.target.value)}
            maxLength={500}
            placeholder="What changed in this version?"
          />
          <div className="clm-prompt-actions">
            <button
              className="clm-secondary"
              type="button"
              disabled={
                Boolean(busy) || Boolean(inlineError) || !changeNote.trim()
              }
              onClick={() => void save()}
            >
              {busy === "save" ? "Saving…" : "Save as new version"}
            </button>
            <button
              className="clm-primary"
              type="button"
              disabled={
                Boolean(busy) ||
                !selected ||
                selected.id === library?.activeReleaseId
              }
              onClick={() => void publish()}
            >
              {busy === "publish"
                ? "Publishing…"
                : selected && active && selected.version < active.version
                  ? `Publish v${selected.version} as rollback`
                  : "Publish selected version"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
