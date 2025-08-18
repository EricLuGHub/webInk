const SUGGESTION = "test";

type Typable = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

let active: Typable | null = null;
let inputOverlay: HTMLDivElement | null = null;
let ceOverlay: HTMLDivElement | null = null;
let rafId: number | null = null;

function isTypable(x: Element | null): x is Typable {
    if (!x) return false;
    if (x instanceof HTMLTextAreaElement) return true;
    if (x instanceof HTMLInputElement) {
        const t = (x.type || "").toLowerCase();
        if (t === "password" || t === "hidden" || x.readOnly || x.disabled) return false;
        return ["text", "search", "email", "url", "tel", "number"].includes(t) || t === "";
    }
    if (x instanceof HTMLElement) {
        const ed = x.getAttribute("contenteditable");
        return (ed === "" || ed === "true") && !x.hasAttribute("aria-hidden");
    }
    return false;
}

function ensureOverlays() {
    if (!inputOverlay) {
        inputOverlay = document.createElement("div");
        inputOverlay.style.position = "absolute";
        inputOverlay.style.pointerEvents = "none";
        inputOverlay.style.zIndex = "2147483647";
        inputOverlay.style.whiteSpace = "pre-wrap";
        inputOverlay.style.visibility = "hidden";
        inputOverlay.style.overflow = "hidden";
        document.documentElement.appendChild(inputOverlay);
    }
    if (!ceOverlay) {
        ceOverlay = document.createElement("div");
        ceOverlay.style.position = "absolute";
        ceOverlay.style.pointerEvents = "none";
        ceOverlay.style.zIndex = "2147483647";
        ceOverlay.style.whiteSpace = "pre";
        ceOverlay.style.visibility = "hidden";
        document.documentElement.appendChild(ceOverlay);
    }
}

function escapeHtml(s: string) {
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function copyTextStyles(from: HTMLElement, to: HTMLElement) {
    const cs = getComputedStyle(from);
    const props = [
        "fontFamily","fontSize","fontWeight","fontStyle","letterSpacing","lineHeight",
        "textTransform","textDecoration","wordBreak","overflowWrap","textAlign"
    ];
    for (const p of props) to.style.setProperty(p, cs.getPropertyValue(p));
    to.style.color = cs.color;
    to.style.padding = `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`;
    to.style.boxSizing = cs.boxSizing;
    to.style.background = "transparent";
    to.style.borderRadius = cs.borderRadius;
}

function atTextEnd(el: HTMLInputElement | HTMLTextAreaElement) {
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd ?? el.value.length;
    return s === e && s === el.value.length;
}

function placeInputOverlay(el: HTMLInputElement | HTMLTextAreaElement) {
    if (!inputOverlay) return;
    const r = el.getBoundingClientRect();
    inputOverlay.style.left = `${r.left + window.scrollX}px`;
    inputOverlay.style.top = `${r.top + window.scrollY}px`;
    inputOverlay.style.width = `${r.width}px`;
    inputOverlay.style.height = `${r.height}px`;
    copyTextStyles(el, inputOverlay);
    inputOverlay.style.whiteSpace = el instanceof HTMLTextAreaElement ? "pre-wrap" : "pre";
    if (!atTextEnd(el)) {
        inputOverlay.style.visibility = "hidden";
        inputOverlay.innerHTML = "";
        return;
    }
    const before = escapeHtml(el.value);
    const color = getComputedStyle(el).color;
    inputOverlay.innerHTML =
        `<span style="color:transparent;-webkit-text-fill-color:transparent">${before}</span>` +
        `<span style="opacity:.45;color:${color}">${escapeHtml(SUGGESTION)}</span>`;
    inputOverlay.style.visibility = "visible";
    inputOverlay.scrollTop = el.scrollTop;
    inputOverlay.scrollLeft = el.scrollLeft;
}

function caretRectInEditable(ed: HTMLElement): DOMRect | null {
    const sel = document.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const r = sel.getRangeAt(0);
    if (!ed.contains(r.startContainer)) return null;
    const c = r.cloneRange();
    c.collapse(true);
    const rect = c.getClientRects()[0] || c.getBoundingClientRect();
    return rect || null;
}

function placeCEOverlay(ed: HTMLElement) {
    if (!ceOverlay) return;
    const rect = caretRectInEditable(ed);
    if (!rect) {
        ceOverlay.style.visibility = "hidden";
        ceOverlay.innerHTML = "";
        return;
    }
    copyTextStyles(ed, ceOverlay);
    ceOverlay.style.left = `${rect.left + window.scrollX}px`;
    ceOverlay.style.top = `${rect.top + window.scrollY}px`;
    ceOverlay.innerHTML = `<span style="opacity:.45;color:${getComputedStyle(ed).color}">${escapeHtml(SUGGESTION)}</span>`;
    ceOverlay.style.visibility = "visible";
}

function render() {
    if (!active) {
        if (inputOverlay) inputOverlay.style.visibility = "hidden";
        if (ceOverlay) ceOverlay.style.visibility = "hidden";
        return;
    }
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        if (ceOverlay) ceOverlay.style.visibility = "hidden";
        placeInputOverlay(active);
    } else {
        if (inputOverlay) inputOverlay.style.visibility = "hidden";
        placeCEOverlay(active);
    }
}

function startLoop() {
    if (rafId !== null) return;
    const tick = () => {
        render();
        rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
}

function stopLoop() {
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}

function onFocusIn(e: FocusEvent) {
    const t = e.target as Element | null;
    active = isTypable(t) ? t : null;
    ensureOverlays();
    if (active) startLoop(); else stopLoop();
}

function onBlur(e: FocusEvent) {
    const t = e.target as Element | null;
    if (active && t === active) {
        active = null;
        stopLoop();
        render();
    }
}

function shouldAccept() {
    if (!active) return false;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return atTextEnd(active);
    const sel = document.getSelection();
    if (!sel || !sel.rangeCount) return false;
    const r = sel.getRangeAt(0);
    return active.contains(r.startContainer);
}

async function typeIntoInput(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
    for (const ch of text) {
        const s = el.selectionStart ?? el.value.length;
        const e = el.selectionEnd ?? el.value.length;
        el.setRangeText(ch, s, e, "end");
        const evt = new InputEvent("input", { bubbles: true, inputType: "insertText", data: ch } as any);
        el.dispatchEvent(evt);
        await new Promise(r => setTimeout(r, 8));
    }
}

async function typeIntoEditable(ed: HTMLElement, text: string) {
    for (const ch of text) {
        const ok = document.execCommand("insertText", false, ch);
        if (!ok) {
            const sel = document.getSelection();
            if (!sel) return;
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(ch));
            range.collapse(false);
        }
        ed.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: ch } as any));
        await new Promise(r => setTimeout(r, 8));
    }
}

async function acceptSuggestion() {
    if (!active) return;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        await typeIntoInput(active, SUGGESTION);
    } else {
        await typeIntoEditable(active, SUGGESTION);
    }
}

function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Tab" && shouldAccept()) {
        e.preventDefault();
        acceptSuggestion().then(() => render());
        return;
    }
}

function onAny() {
    if (!active) return;
    render();
}

ensureOverlays();
addEventListener("focusin", onFocusIn, true);
addEventListener("blur", onBlur, true);
addEventListener("keydown", onKeyDown, true);
addEventListener("input", onAny, true);
addEventListener("click", onAny, true);
addEventListener("scroll", onAny, true);
addEventListener("resize", onAny, true);
document.addEventListener("selectionchange", onAny, true);

new MutationObserver(() => {
    if (active && !document.contains(active)) {
        active = null;
        stopLoop();
        render();
    }
}).observe(document.documentElement, { childList: true, subtree: true });
