"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var { spawnSync } = require("child_process");

var root = path.resolve(__dirname, "..");
var pack = spawnSync("node", [path.join(root, "scripts", "pack-zip.js")], { encoding: "utf8" });
assert.equal(pack.status, 0, pack.stderr + pack.stdout);

var json = JSON.parse(fs.readFileSync(path.join(root, "dist", "ExcelExportButton.json"), "utf8"));
assert.ok(!("supportsAutoResize" in json));
json.webcomponents.forEach(function (component) {
  assert.equal(component.url.charAt(0), "/");
  assert.ok(!component.url.includes("\\"));
  assert.ok(component.url.endsWith(".js"));
});

var listing = spawnSync(
  "python3",
  [
    "-c",
    "import zipfile, sys\n" +
      "z = zipfile.ZipFile(sys.argv[1])\n" +
      "names = z.namelist()\n" +
      "print('\\n'.join(names))\n" +
      "assert all('/' not in n and '\\\\' not in n for n in names), names\n" +
      "assert set(names) == {'excel-export-button.js', 'excel-export-styling.js'}, names\n"
  ].concat([path.join(root, "dist", "ExcelExportButton-resources.zip")]),
  { encoding: "utf8" }
);
assert.equal(listing.status, 0, listing.stderr + listing.stdout);
console.log("packaging tests passed:\n" + listing.stdout);
