import styles from "./styles.css?inline";
import {
  lessonMaterialsFolderUrl,
  lessonPlanDownloadUrl,
  lessonPlanViewUrl,
} from "./lessonUrls";
import { resetConversation as clearTranscript } from "./resetConversation";
import { searchLessons } from "./search";
import type { Lesson } from "./types";

export {
  lessonMaterialsFolderUrl,
  lessonPlanDownloadUrl,
  lessonPlanViewUrl,
} from "./lessonUrls";
export { resetConversation } from "./resetConversation";

const QUICK_PROMPTS = [
  "Show me 4th grade lessons",
  "Find a 5th-grade lesson on invasive species",
  "Don't Feed the Gators",
  "Which lessons cover the water cycle?",
];

const GREETING =
  "Hi! I can help you find Everglades Literacy lessons by topic, grade level, NGSSS standard, or Fundamental Concept. What are you looking for?";

const HOST_LIGHT_CSS = `#everglades-lesson-finder-host {
  position: absolute;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: visible;
  pointer-events: none;
  background: transparent;
}`;

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
  private greetingEl!: HTMLDivElement;
  private chipsEl: HTMLDivElement | null = null;
  private isOpen = false;
  private hasGreeted = false;
  private greetingDismissed = false;

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

    const greeting = document.createElement("div");
    greeting.className = "elf-greeting";
    greeting.setAttribute("role", "status");
    const greetingTitle = document.createElement("p");
    greetingTitle.className = "elf-greeting-title";
    greetingTitle.textContent = "We're Online!";
    const greetingBody = document.createElement("p");
    greetingBody.className = "elf-greeting-body";
    greetingBody.textContent = "How may I help you today?";
    const greetingClose = document.createElement("button");
    greetingClose.type = "button";
    greetingClose.className = "elf-greeting-close";
    greetingClose.setAttribute("aria-label", "Dismiss greeting");
    greetingClose.appendChild(svgIcon("M18 6 6 18M6 6l12 12", 14));
    greetingClose.addEventListener("click", (event) => {
      event.stopPropagation();
      this.greetingDismissed = true;
      this.syncGreeting();
    });
    greeting.append(greetingTitle, greetingBody, greetingClose);
    greeting.addEventListener("click", () => this.toggle(true));
    this.greetingEl = greeting;

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
    container.append(greeting, launcher, panel);
    this.shadow.appendChild(container);
    this.syncGreeting();
  }

  private syncGreeting(): void {
    const show = !this.isOpen && !this.greetingDismissed;
    this.greetingEl.hidden = !show;
    this.greetingEl.setAttribute("aria-hidden", show ? "false" : "true");
  }

  private toggle(force?: boolean): void {
    const nextOpen = force ?? !this.isOpen;
    // Closing (X or launcher) clears the transcript so the next open is
    // always the greeting + quick prompts, not the previous search results.
    if (!nextOpen && this.isOpen) {
      this.resetConversation();
    }
    this.isOpen = nextOpen;
    this.panel.classList.toggle("elf-open", this.isOpen);
    this.syncGreeting();
    if (this.isOpen && !this.hasGreeted) {
      this.hasGreeted = true;
      this.addAssistantBubble(GREETING);
      this.renderQuickPrompts();
    }
    if (this.isOpen) this.input.focus();
  }

  private resetConversation(): void {
    const next = clearTranscript({ body: this.body, input: this.input });
    this.chipsEl = next.chipsEl;
    this.hasGreeted = next.hasGreeted;
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

    const links = document.createElement("div");
    links.className = "elf-card-links";

    const viewLink = document.createElement("a");
    viewLink.className = "elf-card-link";
    const viewHref = lessonPlanViewUrl(lesson);
    viewLink.target = "_blank";
    viewLink.rel = "noopener noreferrer";
    viewLink.textContent = "View lesson →";
    if (viewHref.startsWith("https://")) {
      viewLink.href = viewHref;
    } else {
      viewLink.setAttribute("aria-disabled", "true");
    }
    links.appendChild(viewLink);

    const downloadHref = lessonPlanDownloadUrl(lesson);
    if (downloadHref) {
      const downloadLink = document.createElement("a");
      downloadLink.className = "elf-card-link";
      downloadLink.target = "_blank";
      downloadLink.rel = "noopener noreferrer";
      downloadLink.textContent = "Download";
      downloadLink.href = downloadHref;
      links.appendChild(downloadLink);
    }

    const folderHref = lessonMaterialsFolderUrl(lesson);
    if (folderHref) {
      const folderLink = document.createElement("a");
      folderLink.className = "elf-card-link";
      folderLink.target = "_blank";
      folderLink.rel = "noopener noreferrer";
      folderLink.textContent = "View all lesson materials";
      folderLink.href = folderHref;
      links.appendChild(folderLink);
    }

    footer.append(standard, links);
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
  if (!document.getElementById("everglades-lesson-finder-host-css")) {
    const hostCss = document.createElement("style");
    hostCss.id = "everglades-lesson-finder-host-css";
    hostCss.textContent = HOST_LIGHT_CSS;
    document.documentElement.appendChild(hostCss);
  }
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
