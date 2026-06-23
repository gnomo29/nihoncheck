import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

const COPY = ["index.html", "diagnostico.html", "styles.css", "js", "public"];

function assertExists(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error("build: missing required path:", rel);
    process.exit(1);
  }
  return abs;
}

if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}
fs.mkdirSync(dist, { recursive: true });

for (const rel of COPY) {
  const src = assertExists(rel);
  const dest = path.join(dist, rel);
  fs.cpSync(src, dest, { recursive: true });
}

// GitHub Pages: skip Jekyll processing for static assets
fs.writeFileSync(path.join(dist, ".nojekyll"), "");

console.log("NihonCheck build OK -> dist/");
