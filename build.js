const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "site");
const dest = path.join(__dirname, "dist");

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

console.log("Build concluído: site/ copiado para dist/");
