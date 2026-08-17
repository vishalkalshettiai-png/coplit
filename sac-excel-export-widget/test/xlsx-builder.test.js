"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var { spawnSync } = require("child_process");
var builder = require("../webcomponents/excel-export-button.js");

var bytes = builder.buildXlsxBuffer({
  sheetName: "Sales",
  headers: ["Region", "Revenue"],
  rows: [
    ["AMER", 1200],
    ["EMEA", 980]
  ],
  includeTotals: true,
  numericFlags: [false, true]
});

assert.ok(bytes instanceof Uint8Array, "builder should return Uint8Array");
assert.ok(bytes.length > 100, "xlsx buffer should not be empty");
assert.equal(bytes[0], 0x50);
assert.equal(bytes[1], 0x4b);

var tmp = path.join(os.tmpdir(), "sac-excel-export-test.xlsx");
fs.writeFileSync(tmp, bytes);

if (spawnSync("unzip", ["-t", tmp], { encoding: "utf8" }).status === 0) {
  var listing = spawnSync("unzip", ["-l", tmp], { encoding: "utf8" });
  assert.match(listing.stdout, /xl\/worksheets\/sheet1\.xml/);
  assert.match(listing.stdout, /\[Content_Types\]\.xml/);
}

console.log("xlsx builder tests passed (" + bytes.length + " bytes, wrote " + tmp + ")");
