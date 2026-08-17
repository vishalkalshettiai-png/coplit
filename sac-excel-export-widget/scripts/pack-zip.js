#!/usr/bin/env node
"use strict";

var fs = require("fs");
var path = require("path");
var { spawnSync } = require("child_process");

var root = path.resolve(__dirname, "..");
var distDir = path.join(root, "dist");
var jsonSource = path.join(root, "ExcelExportButton.json");
var jsonDest = path.join(distDir, "ExcelExportButton.json");
var zipPath = path.join(distDir, "ExcelExportButton-resources.zip");
var mainJs = path.join(root, "webcomponents", "excel-export-button.js");
var stylingJs = path.join(root, "webcomponents", "excel-export-styling.js");

fs.mkdirSync(distDir, { recursive: true });

var json = JSON.parse(fs.readFileSync(jsonSource, "utf8"));
var urls = (json.webcomponents || []).map(function (component) {
  return component.url;
});
var expected = ["/excel-export-button.js", "/excel-export-styling.js"];
expected.forEach(function (url) {
  if (urls.indexOf(url) === -1) {
    throw new Error("Contribution JSON must use SAC resource URL " + url);
  }
});

fs.copyFileSync(jsonSource, jsonDest);
fs.rmSync(zipPath, { force: true });
fs.rmSync(path.join(distDir, "ExcelExportButton.zip"), { force: true });

var python = spawnSync(
  "python3",
  [
    "-c",
    "import zipfile, sys\n" +
      "zip_path, main_js, styling_js = sys.argv[1:4]\n" +
      "with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:\n" +
      "    z.write(main_js, 'excel-export-button.js')\n" +
      "    z.write(styling_js, 'excel-export-styling.js')\n"
  ].concat([zipPath, mainJs, stylingJs]),
  { encoding: "utf8" }
);
if (python.status !== 0) {
  console.error(python.stdout);
  console.error(python.stderr);
  process.exit(python.status || 1);
}

console.log("JSON upload: " + jsonDest);
console.log("Resource-ZIP upload: " + zipPath);
