#!/usr/bin/env node
/**
 * Scan n8n/workflows/*.json and print the credential types, sub-workflow
 * links, and placeholder-looking fields you must fill after import.
 *
 * Usage (from repo root): node n8n/scripts/preflight.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOWS = join(ROOT, "workflows");

const PLACEHOLDER = /CHANGE_ME|YOUR_|REPLACE_|TODO|FIXME|example\.com|xxxx|placeholder|<id>|FOLDER_ID|WORKBOOK/i;

const PREFIX_ORDER = ["WF2", "WF1", "WF4", "WF3"];

function walk(value, path, visit) {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${path}[${i}]`, visit));
    return;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      walk(child, path ? `${path}.${key}` : key, visit);
    }
    return;
  }
  visit(path, value);
}

function prefixOf(filename) {
  const match = filename.match(/^(WF[1-4])/i);
  return match ? match[1].toUpperCase() : null;
}

function summarize(filename, workflow) {
  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  const credentials = [];
  const subworkflows = [];
  const placeholders = [];
  const excel = [];
  const drive = [];

  for (const node of nodes) {
    const name = node.name ?? "(unnamed)";
    const type = node.type ?? "";
    if (node.credentials && typeof node.credentials === "object") {
      for (const [credType, cred] of Object.entries(node.credentials)) {
        const credName = cred && typeof cred === "object" ? cred.name : cred;
        credentials.push({ node: name, type: credType, name: credName ?? "(unset)" });
      }
    }
    if (/executeworkflow/i.test(type) && !/trigger/i.test(type)) {
      const source = node.parameters?.source;
      const workflowId = node.parameters?.workflowId ?? node.parameters?.id;
      subworkflows.push({ node: name, source, workflowId });
    }
    if (/microsoftexcel/i.test(type)) {
      excel.push({
        node: name,
        workbook: node.parameters?.workbook ?? node.parameters?.resource,
        worksheet: node.parameters?.worksheet ?? node.parameters?.sheetName,
      });
    }
    if (/googledrive/i.test(type)) {
      drive.push({
        node: name,
        folderId: node.parameters?.folderId ?? node.parameters?.driveId,
        queryString: node.parameters?.queryString,
      });
    }
    walk(node.parameters ?? {}, `${name}`, (path, value) => {
      if (typeof value !== "string") return;
      if (value.trim() === "" || PLACEHOLDER.test(value)) {
        placeholders.push({ path, value: value || "(empty string)" });
      }
    });
  }

  return {
    filename,
    name: workflow.name ?? filename,
    active: Boolean(workflow.active),
    nodeCount: nodes.length,
    credentials,
    subworkflows,
    excel,
    drive,
    placeholders,
  };
}

function printSection(title, lines) {
  console.log(`\n## ${title}`);
  if (!lines.length) {
    console.log("(none)");
    return;
  }
  for (const line of lines) console.log(line);
}

async function main() {
  let entries = [];
  try {
    entries = await readdir(WORKFLOWS);
  } catch {
    console.error(`Missing ${relative(process.cwd(), WORKFLOWS)}. Create it and add WF1–WF4 JSON exports.`);
    process.exit(1);
  }

  const jsonFiles = entries.filter((f) => f.endsWith(".json"));
  if (jsonFiles.length === 0) {
    console.error("No workflow JSON files in n8n/workflows/.");
    console.error("Export each workflow from n8n (⋯ → Download) using names that start with WF1, WF2, WF3, WF4.");
    process.exit(1);
  }

  const byPrefix = Object.fromEntries(PREFIX_ORDER.map((p) => [p, []]));
  const other = [];
  const summaries = [];

  for (const file of jsonFiles.sort()) {
    const raw = await readFile(join(WORKFLOWS, file), "utf8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error(`Invalid JSON: ${file}: ${err.message}`);
      process.exit(1);
    }
    const summary = summarize(file, parsed);
    summaries.push(summary);
    const prefix = prefixOf(file);
    if (prefix && byPrefix[prefix]) byPrefix[prefix].push(file);
    else other.push(file);
  }

  console.log("Everglades Lesson Finder — n8n preflight");
  console.log("Import order: WF2 → WF1 (link to WF2) → WF4 → run WF1 → WF3");

  printSection("Files", [
    ...PREFIX_ORDER.map((p) => {
      const files = byPrefix[p];
      return files.length ? `OK  ${p}: ${files.join(", ")}` : `MISSING  ${p}*.json`;
    }),
    ...other.map((f) => `EXTRA  ${f} (rename so the prefix is WF1–WF4)`),
  ]);

  const missing = PREFIX_ORDER.filter((p) => byPrefix[p].length === 0);
  if (missing.length) {
    console.log("\nStop: add the missing JSON files before importing.");
  }

  for (const summary of summaries) {
    console.log(`\n======== ${summary.filename}  (${summary.name}) ========`);
    console.log(`nodes: ${summary.nodeCount}   active-in-export: ${summary.active}`);
    if (summary.active) {
      console.log("WARN  Export has active:true — save inactive after import until credentials and links are set.");
    }
    printSection("Credentials to assign",
      summary.credentials.map((c) => `- ${c.node}: ${c.type}  (export name: ${c.name})`));
    printSection("Sub-workflow links (re-select WF2 From list on this instance)",
      summary.subworkflows.map((s) => `- ${s.node}: source=${s.source ?? "?"}  id=${JSON.stringify(s.workflowId)}`));
    printSection("Google Drive folder fields",
      summary.drive.map((d) => `- ${d.node}: folderId=${JSON.stringify(d.folderId)}  query=${JSON.stringify(d.queryString)}`));
    printSection("Excel workbook fields",
      summary.excel.map((e) => `- ${e.node}: workbook=${JSON.stringify(e.workbook)}  worksheet=${JSON.stringify(e.worksheet)}`));
    printSection("Placeholder / empty parameters",
      summary.placeholders.map((p) => `- ${p.path} = ${JSON.stringify(p.value)}`));
  }

  if (missing.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
