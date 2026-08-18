import { existsSync, readFileSync } from "node:fs";

const required = [
  "dist/widget.js",
  "dist/wix.html",
  "dist/wix-embed.html",
  "dist/wix-custom-element.html",
  "dist/_headers",
  "dist/lesson-plan-demo.html",
  "dist/index.html",
];

let failed = false;
for (const file of required) {
  if (!existsSync(file)) {
    console.error(`missing ${file}`);
    failed = true;
  }
}

const js = existsSync("dist/widget.js")
  ? readFileSync("dist/widget.js", "utf8")
  : "";
for (const token of ["everglades-lesson-finder", "elf-inline", "data-elf-widget"]) {
  if (!js.includes(token)) {
    console.error(`widget.js missing ${token}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("Wix widget bundle ok");
