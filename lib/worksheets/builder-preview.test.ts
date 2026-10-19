// @vitest-environment jsdom

import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorksheetBuilder } from "@/components/worksheet-builder";
import { EMPTY_HEADER } from "@/lib/worksheets/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/lib/worksheets/ocr", () => ({
  readPrintedPage: vi.fn(async () => ({ ok: true, text: "2 + 2 = 4" })),
}));

const skills = [{ id: "g1-add", grade: 1, title: "Add within 10" }];
const created: string[] = [];
const revoked: string[] = [];

function installObjectUrls() {
  created.length = 0;
  revoked.length = 0;
  let count = 0;
  URL.createObjectURL = () => {
    const url = `blob:preview-${++count}`;
    created.push(url);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    revoked.push(String(url));
  };
}

function builder() {
  return createElement(WorksheetBuilder, {
    skills,
    initialTemplates: [],
    storageError: null,
  });
}

async function choosePage(name = "homework.png") {
  const input = document.querySelector('input[aria-label="Upload photo or PDF of the page"]');
  if (!(input instanceof HTMLInputElement)) throw new Error("Missing page input");
  const file = new File([Uint8Array.from([1, 2, 3])], name, { type: "image/png" });
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function previewImage(): HTMLImageElement {
  const image = document.querySelector("img.page-preview");
  if (!(image instanceof HTMLImageElement)) throw new Error("Missing preview");
  return image;
}

describe("worksheet page preview and saved layouts", () => {
  let root: Root | null = null;

  beforeEach(() => {
    installObjectUrls();
    localStorage.clear();
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("keeps device layouts out of the server render and shows them after mount", async () => {
    localStorage.setItem(
      "masterasium-worksheet-templates",
      JSON.stringify([
        {
          id: "local-1",
          name: "Evening layout",
          title: "Evening practice",
          instructions: "",
          header: EMPTY_HEADER,
          logoData: null,
        },
      ]),
    );

    const serverHtml = renderToStaticMarkup(builder());
    expect(serverHtml).not.toContain("Evening layout");

    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(builder());
    });
    expect(document.body.textContent).toContain("Evening layout");
  });

  it("revokes the preview URL when the page is removed", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(builder());
    });
    await choosePage();

    const src = previewImage().getAttribute("src");
    expect(src).toBe("blob:preview-1");
    expect(revoked).not.toContain(src);

    const remove = [...document.querySelectorAll("button")].find((node) => node.textContent === "Remove");
    if (!(remove instanceof HTMLButtonElement)) throw new Error("Missing remove");
    await act(async () => {
      remove.click();
    });
    expect(revoked).toContain("blob:preview-1");
    expect(document.querySelector("img.page-preview")).toBeNull();
  });

  it("keeps a live preview URL after Strict Mode replays the effect", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(StrictMode, null, builder()));
    });
    await choosePage("strict.png");

    const src = previewImage().getAttribute("src");
    expect(src).toBe(created.at(-1));
    expect(revoked).not.toContain(src);
  });
});
