let active: HTMLElement | null = null;

const MARKER = "{BABADOOK}";
const LOG_FULL_PAGE = true;      // set false to log only the field preview
const CHUNK = 1_000_000;

function isPassword(el: Element | null): boolean {
    return el instanceof HTMLInputElement && (el.type || "").toLowerCase() === "password";
}
function isEditable(el: Element | null): el is HTMLElement {
    if (!(el instanceof HTMLElement)) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "textarea") return true;
    if (tag === "input") {
        const t = (el as HTMLInputElement).type?.toLowerCase();
        if (t === "hidden" || t === "button" || t === "submit" || t === "reset" || t === "image") return false;
        return true;
    }
    if (el.isContentEditable) return true;
    const role = el.getAttribute("role");
    if (role === "textbox" || role === "searchbox") return true;
    return false;
}
function shouldHandle(el: Element | null) {
    return isEditable(el) && !isPassword(el);
}

function doctypeString(): string {
    const d = document;
    const dt = d.doctype
        ? `<!DOCTYPE ${d.doctype.name}${d.doctype.publicId ? ` PUBLIC "${d.doctype.publicId}"` : ""}${d.doctype.systemId ? ` "${d.doctype.systemId}"` : ""}>`
        : "";
    return dt ? dt + "\n" : "";
}

function cssPath(el: Element): string {
    const parts: string[] = [];
    let e: Element | null = el;
    while (e && e.nodeType === 1 && e !== document.documentElement) {
        const name = e.nodeName.toLowerCase();
        let idx = 1;
        let sib = e.previousElementSibling;
        while (sib) {
            if (sib.nodeName.toLowerCase() === name) idx++;
            sib = sib.previousElementSibling;
        }
        parts.unshift(`${name}:nth-of-type(${idx})`);
        e = e.parentElement;
    }
    return "html>" + parts.join(">");
}

function pathFrom(root: Node, node: Node): number[] | null {
    const path: number[] = [];
    let n: Node | null = node;
    while (n && n !== root) {
        const p = n.parentNode;
        if (!p) return null;
        const idx = Array.prototype.indexOf.call(p.childNodes, n);
        if (idx < 0) return null;
        path.push(idx);
        n = p;
    }
    if (n !== root) return null;
    path.reverse();
    return path;
}
function nodeAt(root: Node, path: number[] | null): Node | null {
    if (!path) return null;
    let n: Node = root;
    for (const i of path) {
        const next = n.childNodes[i];
        if (!next) return null;
        n = next;
    }
    return n;
}

function previewForInput(el: HTMLInputElement | HTMLTextAreaElement, marker: string) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    return el.value.slice(0, start) + marker + el.value.slice(end);
}

function clonePageWithMarker(target: HTMLElement, marker: string): { fieldPreview: string; pageHTML?: string } {
    const root = document.documentElement;
    const cloneRoot = root.cloneNode(true) as HTMLElement;

    const elPath = pathFrom(root, target);
    const targetClone = nodeAt(cloneRoot, elPath) as HTMLElement | null;

    let fieldPreview = "";

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        fieldPreview = previewForInput(target, marker);
        if (targetClone instanceof HTMLInputElement) {
            targetClone.setAttribute("value", fieldPreview);
        } else if (targetClone && targetClone.tagName?.toLowerCase() === "textarea") {
            targetClone.textContent = fieldPreview;
        }
    } else if (target.isContentEditable) {
        fieldPreview = "";
        const sel = document.getSelection();
        if (sel && sel.rangeCount && target.contains(sel.anchorNode)) {
            const r = sel.getRangeAt(0);
            const startPath = pathFrom(root, r.startContainer);
            const endPath = pathFrom(root, r.endContainer);
            const startNode = nodeAt(cloneRoot, startPath);
            const endNode = nodeAt(cloneRoot, endPath);
            if (startNode && endNode) {
                const cr = document.createRange();
                cr.setStart(startNode, r.startOffset);
                cr.setEnd(endNode, r.endOffset);
                if (cr.collapsed) {
                    cr.insertNode(document.createTextNode(marker));
                    cr.collapse(true);
                } else {
                    cr.deleteContents();
                    cr.insertNode(document.createTextNode(marker));
                    cr.collapse(false);
                }
            } else if (targetClone) {
                targetClone.appendChild(document.createTextNode(marker));
            }
            if (targetClone) fieldPreview = targetClone.innerHTML;
        } else if (targetClone) {
            targetClone.appendChild(document.createTextNode(marker));
            fieldPreview = targetClone.innerHTML;
        }
    }

    let pageHTML: string | undefined;
    if (LOG_FULL_PAGE) {
        pageHTML = doctypeString() + (cloneRoot.outerHTML ?? "");
    }

    return { fieldPreview, pageHTML };
}

function chunkLog(label: string, s: string) {
    if (!s) return;
    if (s.length <= CHUNK) {
        console.log(label, s);
    } else {
        for (let i = 0; i < s.length; i += CHUNK) {
            console.log(label, s.slice(i, i + CHUNK));
        }
    }
}

function logVirtualInsert(target: HTMLElement) {
    const { fieldPreview, pageHTML } = clonePageWithMarker(target, MARKER);
    const sel = cssPath(target);
    if (fieldPreview) chunkLog(`FIELD_PREVIEW ${sel}`, fieldPreview);
    if (pageHTML) chunkLog("PAGE_HTML_WITH_MARKER", pageHTML);
}

function firstEditableFromEvent(e: Event): HTMLElement | null {
    const path = (e as any).composedPath?.() as unknown[] | undefined;
    if (path && path.length) {
        for (const n of path) {
            if (n instanceof HTMLElement && isEditable(n)) return n;
        }
    }
    const t = e.target as HTMLElement | null;
    return isEditable(t) ? t : null;
}

addEventListener(
    "focusin",
    (e: FocusEvent) => {
        const t = e.target as HTMLElement | null;
        active = isEditable(t) ? t : null;
        if (shouldHandle(active)) logVirtualInsert(active!);
    },
    true
);

addEventListener(
    "pointerdown",
    (e: PointerEvent) => {
        const t = firstEditableFromEvent(e);
        active = t;
    },
    true
);

addEventListener(
    "input",
    (e: Event) => {
        const el = e.target as HTMLElement;
        if (!shouldHandle(el)) return;
        logVirtualInsert(el);
    },
    true
);

// optional hotkey to log on demand
addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
        const metaOrCtrl = e.metaKey || e.ctrlKey;
        if (metaOrCtrl && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "j") {
            if (shouldHandle(active)) {
                e.preventDefault();
                logVirtualInsert(active!);
            }
        }
    },
    true
);
