#!/usr/bin/env node
"use strict";

var fs = require("fs");
var path = require("path");
var { spawnSync } = require("child_process");

var root = path.resolve(__dirname, "..");
var distDir = path.join(root, "dist");
var stagingDir = path.join(distDir, "staging");
var zipPath = path.join(distDir, "ExcelExportButton.zip");

fs.rmSync(stagingDir, { recursive: true, force: true });
fs.mkdirSync(stagingDir, { recursive: true });

var json = JSON.parse(fs.readFileSync(path.join(root, "ExcelExportButton.json"), "utf8"));
json.webcomponents.forEach(function (component) {
  if (component.kind === "main") {
    component.url = "excel-export-button.js";
  }
  if (component.kind === "styling") {
    component.url = "excel-export-styling.js";
  }
});

fs.writeFileSync(path.join(stagingDir, "ExcelExportButton.json"), JSON.stringify(json, null, 2));
fs.copyFileSync(
  path.join(root, "webcomponents", "excel-export-button.js"),
  path.join(stagingDir, "excel-export-button.js")
);
fs.copyFileSync(
  path.join(root, "webcomponents", "excel-export-styling.js"),
  path.join(stagingDir, "excel-export-styling.js")
);
fs.copyFileSync(path.join(root, "scripts", "story-onclick.js"), path.join(stagingDir, "story-onclick.js"));

fs.rmSync(zipPath, { force: true });
var zip = spawnSync("zip", ["-j", "-X", zipPath, path.join(stagingDir, "*")], { cwd: stagingDir });
if (zip.status !== 0) {
  var python = spawnSync(
    "python3",
    [
      "-c",
      "import pathlib, zipfile, sys\n" +
        "root = pathlib.Path(sys.argv[1])\n" +
        "zip_path = pathlib.Path(sys.argv[2])\n" +
        "with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:\n" +
        "    for p in sorted(root.iterdir()):\n" +
        "        if p.is_file():\n" +
        "            z.write(p, p.name)\n"
    ].concat([stagingDir, zipPath]),
    { encoding: "utf8" }
  );
  if (python.status !== 0) {
    console.error(python.stdout);
    console.error(python.stderr);
    process.exit(python.status || 1);
  }
}

fs.rmSync(stagingDir, { recursive: true, force: true });
console.log("Wrote " + zipPath);
