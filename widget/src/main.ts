import styles from "./styles.css?inline";
import { searchLessons } from "./search";
import type { Lesson } from "./types";

const QUICK_PROMPTS = [
  "Find a 5th-grade lesson on invasive species",
  "Which lessons cover the water cycle?",
  `What standards does "Don't Feed the Gators!" align with?`,
  "Show me a lesson about wading birds",
];

const GREETING =
  "Hi! I can help you find Everglades Literacy lessons by topic, grade level, NGSSS standard, or Fundamental Concept. What are you looking for?";

// Real lesson pages/PDFs don't exist yet (Phase 1 data pipeline). Until then,
// "View lesson" opens a static placeholder so stakeholders can see the click-through
// working end to end. Resolved against the widget script's own origin (via
// document.currentScript) so it still works once widget.js is served from a CDN.
function demoLessonUrl(lesson: Lesson): string {
  const scriptSrc = (document.currentScript as HTMLScriptElement | null)?.src;
  const base = new URL(scriptSrc ?? location.href);
  const url = new URL("lesson-plan-demo.html", base);
  url.searchParams.set("title", lesson.title);
  return url.toString();
}

function svgIcon(path: string, size = 24): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", path);
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "2");
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  svg.appendChild(p);
  return svg;
}

class LessonFinderWidget {
  private shadow: ShadowRoot;
  private panel!: HTMLDivElement;
  private body!: HTMLDivElement;
  private input!: HTMLInputElement;
  private chipsEl: HTMLDivElement | null = null;
  private isOpen = false;
  private hasGreeted = false;

  constructor(host: HTMLElement) {
    this.shadow = host.attachShadow({ mode: "open" });
    this.render();
  }

  private render(): void {
    const style = document.createElement("style");
    style.textContent = styles;
    this.shadow.appendChild(style);

    const container = document.createElement("div");
    container.className = "elf-root";

    const launcher = document.createElement("button");
    launcher.className = "elf-launcher";
    launcher.setAttribute("aria-label", "Open Everglades Lesson Finder");
    launcher.style.color = "#faf9f2";
    launcher.appendChild(
      svgIcon(
        "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
      ),
    );
    launcher.addEventListener("click", () => this.toggle());

    const panel = document.createElement("div");
    panel.className = "elf-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Everglades Lesson Finder");
    this.panel = panel;

    const header = document.createElement("div");
    header.className = "elf-header";

    const closeBtn = document.createElement("button");
    closeBtn.className = "elf-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.appendChild(svgIcon("M18 6 6 18M6 6l12 12", 18));
    closeBtn.addEventListener("click", () => this.toggle(false));

    const title = document.createElement("h1");
    title.textContent = "Everglades Lesson Finder";

    const subtitle = document.createElement("p");
    subtitle.textContent = "Search the PreK–12 Teacher Toolkit — lessons, grade levels & standards";

    header.append(closeBtn, title, subtitle);

    const grass = document.createElement("div");
    grass.className = "elf-grass";

    const body = document.createElement("div");
    body.className = "elf-body";
    this.body = body;

    const form = document.createElement("form");
    form.className = "elf-inputrow";

    const input = document.createElement("input");
    input.className = "elf-input";
    input.type = "text";
    input.placeholder = "Ask about a lesson, grade, or standard…";
    input.setAttribute("aria-label", "Ask about a lesson, grade, or standard");
    this.input = input;

    const sendBtn = document.createElement("button");
    sendBtn.className = "elf-send";
    sendBtn.type = "submit";
    sendBtn.textContent = "Send";

    form.append(input, sendBtn);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.submitQuery(input.value);
    });

    panel.append(header, grass, body, form);
    container.append(launcher, panel);
    this.shadow.appendChild(container);
  }

  private toggle(force?: boolean): void {
    this.isOpen = force ?? !this.isOpen;
    this.panel.classList.toggle("elf-open", this.isOpen);
    if (this.isOpen && !this.hasGreeted) {
      this.hasGreeted = true;
      this.addAssistantBubble(GREETING);
      this.renderQuickPrompts();
    }
    if (this.isOpen) this.input.focus();
  }

  private renderQuickPrompts(): void {
    const chips = document.createElement("div");
    chips.className = "elf-chips";
    for (const prompt of QUICK_PROMPTS) {
      const chip = document.createElement("button");
      chip.className = "elf-chip";
      chip.type = "button";
      chip.textContent = prompt;
      chip.addEventListener("click", () => this.submitQuery(prompt));
      chips.appendChild(chip);
    }
    this.body.appendChild(chips);
    this.chipsEl = chips;
    this.scrollToBottom();
  }

  private submitQuery(rawQuery: string): void {
    const query = rawQuery.trim();
    if (!query) return;

    this.chipsEl?.remove();
    this.chipsEl = null;

    this.addUserBubble(query);
    this.input.value = "";

    const reply = searchLessons(query);
    this.addAssistantBubble(reply.text);
    for (const lesson of reply.lessons) {
      this.addLessonCard(lesson);
    }
    this.scrollToBottom();
  }

  private addUserBubble(text: string): void {
    const bubble = document.createElement("div");
    bubble.className = "elf-bubble elf-user";
    bubble.textContent = text;
    this.body.appendChild(bubble);
    this.scrollToBottom();
  }

  private addAssistantBubble(text: string): void {
    const bubble = document.createElement("div");
    bubble.className = "elf-bubble elf-assistant";
    bubble.textContent = text;
    this.body.appendChild(bubble);
    this.scrollToBottom();
  }

  private addLessonCard(lesson: Lesson): void {
    const card = document.createElement("div");
    card.className = "elf-card";

    const top = document.createElement("div");
    top.className = "elf-card-top";

    const cardTitle = document.createElement("h2");
    cardTitle.className = "elf-card-title";
    cardTitle.textContent = lesson.title;

    const badge = document.createElement("span");
    badge.className = "elf-badge";
    badge.textContent = lesson.gradeRange;

    top.append(cardTitle, badge);

    const summary = document.createElement("p");
    summary.className = "elf-card-summary";
    summary.textContent = lesson.summary;

    const footer = document.createElement("div");
    footer.className = "elf-card-footer";

    const standard = document.createElement("span");
    standard.className = "elf-standard";
    standard.textContent = lesson.ngsssStandards.join(", ");

    const link = document.createElement("a");
    link.className = "elf-card-link";
    link.href = demoLessonUrl(lesson);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View lesson →";

    footer.append(standard, link);
    card.append(top, summary, footer);
    this.body.appendChild(card);
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      this.body.scrollTop = this.body.scrollHeight;
    });
  }
}

function mount(): void {
  if (document.getElementById("everglades-lesson-finder-host")) return;
  const host = document.createElement("div");
  host.id = "everglades-lesson-finder-host";
  document.body.appendChild(host);
  new LessonFinderWidget(host);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
