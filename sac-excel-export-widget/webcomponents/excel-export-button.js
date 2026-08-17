(function (global) {
  "use strict";

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) {
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function utf8Encode(text) {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(text);
    }
    var escaped = unescape(encodeURIComponent(text));
    var bytes = new Uint8Array(escaped.length);
    for (var i = 0; i < escaped.length; i++) {
      bytes[i] = escaped.charCodeAt(i);
    }
    return bytes;
  }

  function concatBytes(chunks) {
    var total = 0;
    for (var i = 0; i < chunks.length; i++) {
      total += chunks[i].length;
    }
    var out = new Uint8Array(total);
    var offset = 0;
    for (var j = 0; j < chunks.length; j++) {
      out.set(chunks[j], offset);
      offset += chunks[j].length;
    }
    return out;
  }

  function u16(value) {
    return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
  }

  function u32(value) {
    return new Uint8Array([
      value & 0xff,
      (value >>> 8) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 24) & 0xff
    ]);
  }

  function dosDateTime(date) {
    var dosTime =
      (date.getHours() << 11) | (date.getMinutes() << 5) | (Math.floor(date.getSeconds() / 2));
    var dosDate =
      ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { dosTime: dosTime, dosDate: dosDate };
  }

  function zipStore(files) {
    var now = dosDateTime(new Date());
    var localParts = [];
    var centralParts = [];
    var offset = 0;

    for (var i = 0; i < files.length; i++) {
      var nameBytes = utf8Encode(files[i].name);
      var dataBytes = typeof files[i].data === "string" ? utf8Encode(files[i].data) : files[i].data;
      var crc = crc32(dataBytes);
      var localHeader = concatBytes([
        u32(0x04034b50),
        u16(20),
        u16(0),
        u16(0),
        u16(now.dosTime),
        u16(now.dosDate),
        u32(crc),
        u32(dataBytes.length),
        u32(dataBytes.length),
        u16(nameBytes.length),
        u16(0),
        nameBytes,
        dataBytes
      ]);
      localParts.push(localHeader);
      centralParts.push(
        concatBytes([
          u32(0x02014b50),
          u16(20),
          u16(20),
          u16(0),
          u16(0),
          u16(now.dosTime),
          u16(now.dosDate),
          u32(crc),
          u32(dataBytes.length),
          u32(dataBytes.length),
          u16(nameBytes.length),
          u16(0),
          u16(0),
          u16(0),
          u16(0),
          u32(0),
          u32(offset),
          nameBytes
        ])
      );
      offset += localHeader.length;
    }

    var central = concatBytes(centralParts);
    var eocd = concatBytes([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(files.length),
      u16(files.length),
      u32(central.length),
      u32(offset),
      u16(0)
    ]);
    return concatBytes(localParts.concat([central, eocd]));
  }

  function xmlEscape(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function columnLetter(index) {
    var letter = "";
    var n = index;
    while (n > 0) {
      var rem = (n - 1) % 26;
      letter = String.fromCharCode(65 + rem) + letter;
      n = Math.floor((n - 1) / 26);
    }
    return letter;
  }

  function isNumeric(value) {
    if (typeof value === "number" && isFinite(value)) {
      return true;
    }
    if (typeof value !== "string") {
      return false;
    }
    var trimmed = value.trim();
    if (!trimmed) {
      return false;
    }
    return /^-?\d+(\.\d+)?$/.test(trimmed.replace(/,/g, ""));
  }

  function toNumber(value) {
    if (typeof value === "number") {
      return value;
    }
    return Number(String(value).replace(/,/g, ""));
  }

  function cellXml(rowNumber, colIndex, value, styleId) {
    var ref = columnLetter(colIndex) + rowNumber;
    var styleAttr = styleId ? ' s="' + styleId + '"' : "";
    if (isNumeric(value)) {
      return '<c r="' + ref + '"' + styleAttr + ' t="n"><v>' + toNumber(value) + "</v></c>";
    }
    return (
      '<c r="' +
      ref +
      '"' +
      styleAttr +
      ' t="inlineStr"><is><t>' +
      xmlEscape(value) +
      "</t></is></c>"
    );
  }

  function buildSheetXml(sheetModel) {
    var headers = sheetModel.headers || [];
    var rows = sheetModel.rows || [];
    var includeTotals = !!sheetModel.includeTotals;
    var numericFlags = sheetModel.numericFlags || [];
    var xml = [];
    xml.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
    xml.push(
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    );
    xml.push('<sheetViews><sheetView tabSelected="1" workbookViewId="0">');
    xml.push('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>');
    xml.push("</sheetView></sheetViews>");
    xml.push("<cols>");
    for (var c = 0; c < headers.length; c++) {
      xml.push('<col min="' + (c + 1) + '" max="' + (c + 1) + '" width="22" customWidth="1"/>');
    }
    xml.push("</cols><sheetData>");

    xml.push('<row r="1">');
    for (var h = 0; h < headers.length; h++) {
      xml.push(cellXml(1, h + 1, headers[h], 1));
    }
    xml.push("</row>");

    for (var r = 0; r < rows.length; r++) {
      var rowNumber = r + 2;
      xml.push('<row r="' + rowNumber + '">');
      for (var col = 0; col < headers.length; col++) {
        xml.push(cellXml(rowNumber, col + 1, rows[r][col], 2));
      }
      xml.push("</row>");
    }

    if (includeTotals && rows.length) {
      var totalRowNumber = rows.length + 2;
      var totals = [];
      for (var t = 0; t < headers.length; t++) {
        if (t === 0) {
          totals.push("Total");
          continue;
        }
        if (numericFlags[t]) {
          var sum = 0;
          for (var i = 0; i < rows.length; i++) {
            if (isNumeric(rows[i][t])) {
              sum += toNumber(rows[i][t]);
            }
          }
          totals.push(sum);
        } else {
          totals.push("");
        }
      }
      xml.push('<row r="' + totalRowNumber + '">');
      for (var tc = 0; tc < totals.length; tc++) {
        xml.push(cellXml(totalRowNumber, tc + 1, totals[tc], 3));
      }
      xml.push("</row>");
    }

    xml.push("</sheetData></worksheet>");
    return xml.join("");
  }

  function buildXlsxBuffer(options) {
    var sheetName = (options.sheetName || "Export").slice(0, 31);
    var files = [
      {
        name: "[Content_Types].xml",
        data:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          "</Types>"
      },
      {
        name: "_rels/.rels",
        data:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          "</Relationships>"
      },
      {
        name: "xl/workbook.xml",
        data:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          "<sheets><sheet name=\"" +
          xmlEscape(sheetName) +
          '" sheetId="1" r:id="rId1"/></sheets></workbook>'
      },
      {
        name: "xl/_rels/workbook.xml.rels",
        data:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          "</Relationships>"
      },
      {
        name: "xl/styles.xml",
        data:
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          "<fonts count=\"4\">" +
          '<font><sz val="11"/><name val="Calibri"/></font>' +
          '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
          '<font><sz val="11"/><name val="Calibri"/></font>' +
          '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
          "</fonts>" +
          "<fills count=\"3\">" +
          '<fill><patternFill patternType="none"/></fill>' +
          '<fill><patternFill patternType="gray125"/></fill>' +
          '<fill><patternFill patternType="solid"><fgColor rgb="FF0A6ED1"/><bgColor indexed="64"/></patternFill></fill>' +
          "</fills>" +
          "<borders count=\"2\">" +
          "<border><left/><right/><top/><bottom/><diagonal/></border>" +
          '<border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right>' +
          '<top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border>' +
          "</borders>" +
          '<cellStyleXfs count="1"><xf/></cellStyleXfs>' +
          '<cellXfs count="4">' +
          "<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/>" +
          '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
          '<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
          '<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
          "</cellXfs></styleSheet>"
      },
      {
        name: "xl/worksheets/sheet1.xml",
        data: buildSheetXml(options)
      }
    ];
    return zipStore(files);
  }

  var SacXlsxBuilder = {
    buildXlsxBuffer: buildXlsxBuffer,
    isNumeric: isNumeric,
    toNumber: toNumber
  };

  if (typeof module === "object" && module.exports) {
    module.exports = SacXlsxBuilder;
    return;
  }

  var template = document.createElement("template");
  template.innerHTML =
    '<style>' +
    ":host { display: inline-block; font-family: '72', '72full', Arial, Helvetica, sans-serif; }" +
    "button { box-sizing: border-box; width: 100%; min-height: 36px; padding: 8px 16px; border: 0; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }" +
    "button:disabled { opacity: 0.55; cursor: wait; }" +
    "button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; box-shadow: 0 0 0 4px rgba(10,110,209,0.35); }" +
    "svg { width: 16px; height: 16px; fill: currentColor; }" +
    "</style>" +
    '<button type="button" part="button">' +
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8.5 1.5a.5.5 0 0 0-1 0V8.3L5.35 6.15a.5.5 0 1 0-.7.7l3 3a.5.5 0 0 0 .7 0l3-3a.5.5 0 1 0-.7-.7L8.5 8.3V1.5z"/><path d="M2.5 10.5a.5.5 0 0 0-1 0V13A1.5 1.5 0 0 0 3 14.5h10A1.5 1.5 0 0 0 14.5 13v-2.5a.5.5 0 0 0-1 0V13a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5v-2.5z"/></svg>' +
    "<span></span></button>";

  customElements.define(
    "com-vishal-sac-excelexportbutton",
    class ExcelExportButton extends HTMLElement {
      constructor() {
        super();
        this._shadowRoot = this.attachShadow({ mode: "open" });
        this._shadowRoot.appendChild(template.content.cloneNode(true));
        this._button = this._shadowRoot.querySelector("button");
        this._label = this._shadowRoot.querySelector("span");
        this._props = {
          buttonText: "Export to Excel",
          fileName: "SAC_Export.xlsx",
          sheetName: "Export",
          includeTotals: true,
          autoExportOnClick: true,
          backgroundColor: "#0a6ed1",
          textColor: "#ffffff"
        };
        this._busy = false;
        this._button.addEventListener("click", this._onButtonClick.bind(this));
      }

      connectedCallback() {
        this._render();
      }

      _asBoolean(value, fallback) {
        if (value === undefined || value === null || value === "") {
          return fallback;
        }
        if (typeof value === "string") {
          return value.toLowerCase() !== "false" && value !== "0";
        }
        return !!value;
      }

      onCustomWidgetBeforeUpdate(changedProperties) {
        this._props = Object.assign({}, this._props, changedProperties);
        this._props.includeTotals = this._asBoolean(this._props.includeTotals, true);
        this._props.autoExportOnClick = this._asBoolean(this._props.autoExportOnClick, true);
      }

      onCustomWidgetAfterUpdate() {
        this._render();
      }

      onCustomWidgetResize() {
        this._render();
      }

      setButtonText(text) {
        this.buttonText = text;
        this._props.buttonText = text;
        this._dispatchProps({ buttonText: text });
        this._render();
      }

      setFileName(fileName) {
        this.fileName = fileName;
        this._props.fileName = fileName;
        this._dispatchProps({ fileName: fileName });
      }

      setSheetName(sheetName) {
        this.sheetName = sheetName;
        this._props.sheetName = sheetName;
        this._dispatchProps({ sheetName: sheetName });
      }

      exportToExcel() {
        return this._exportBoundData([], [], [], []);
      }

      downloadXLSX(dimensionsToExtract, measuresToExtract, headers, measureMapping) {
        return this._exportBoundData(
          dimensionsToExtract || [],
          measuresToExtract || [],
          headers || [],
          measureMapping || []
        );
      }

      exportJson(jsonText) {
        var parsed = JSON.parse(jsonText);
        var headers = parsed.headers || [];
        var rows = parsed.rows || [];
        if (!headers.length && rows.length && !Array.isArray(rows[0])) {
          headers = Object.keys(rows[0]);
          rows = rows.map(function (row) {
            return headers.map(function (key) {
              return row[key];
            });
          });
        }
        return this._downloadSheet({
          headers: headers,
          rows: rows,
          numericFlags: this._numericFlags(rows, headers.length)
        });
      }

      _onButtonClick() {
        this.dispatchEvent(new Event("onClick"));
        if (this._props.autoExportOnClick !== false) {
          this.exportToExcel();
        }
      }

      _render() {
        this._label.textContent = this._props.buttonText || "Export to Excel";
        this._button.style.background = this._props.backgroundColor || "#0a6ed1";
        this._button.style.color = this._props.textColor || "#ffffff";
        this._button.disabled = this._busy;
      }

      _dispatchProps(properties) {
        this.dispatchEvent(
          new CustomEvent("propertiesChanged", {
            detail: { properties: properties }
          })
        );
      }

      _normalizeFileName(name) {
        var fileName = (name || "SAC_Export.xlsx").trim() || "SAC_Export.xlsx";
        if (!/\.xlsx$/i.test(fileName)) {
          fileName += ".xlsx";
        }
        return fileName;
      }

      _parseMeasureMapping(measureMapping) {
        var map = {};
        (measureMapping || []).forEach(function (entry) {
          var parts = String(entry).split(":");
          if (parts.length >= 2) {
            map[parts.shift()] = parts.join(":");
          }
        });
        return map;
      }

      _numericFlags(rows, columnCount) {
        var flags = [];
        for (var c = 0; c < columnCount; c++) {
          var numeric = false;
          for (var r = 0; r < rows.length; r++) {
            if (SacXlsxBuilder.isNumeric(rows[r][c])) {
              numeric = true;
              break;
            }
          }
          flags[c] = numeric;
        }
        return flags;
      }

      _tableFromBinding(fullData, dimensionsToExtract, measuresToExtract, headers, measureMapping) {
        if (!fullData || !Array.isArray(fullData.data) || !fullData.metadata) {
          throw new Error("No data is bound to the Excel export widget. Add a model in the Builder panel.");
        }

        var metadata = fullData.metadata;
        var mapping = this._parseMeasureMapping(measureMapping);
        var dimEntries = Object.keys(metadata.dimensions || {}).map(function (key) {
          return {
            key: key,
            id: metadata.dimensions[key].id,
            header: metadata.dimensions[key].description || metadata.dimensions[key].id
          };
        });
        var measureEntries = Object.keys(metadata.mainStructureMembers || {}).map(function (key) {
          var id = metadata.mainStructureMembers[key].id;
          return {
            key: key,
            id: id,
            header: mapping[id] || metadata.mainStructureMembers[key].label || id
          };
        });

        if (dimensionsToExtract && dimensionsToExtract.length) {
          dimEntries = dimEntries.filter(function (entry) {
            return dimensionsToExtract.indexOf(entry.id) !== -1;
          });
        }
        if (measuresToExtract && measuresToExtract.length) {
          measureEntries = measureEntries.filter(function (entry) {
            return measuresToExtract.indexOf(entry.id) !== -1;
          });
        }

        var columns = dimEntries.concat(measureEntries);
        var resolvedHeaders =
          headers && headers.length
            ? headers
            : columns.map(function (column) {
                return column.header;
              });

        var rows = fullData.data.map(function (item) {
          return columns.map(function (column, index) {
            var cell = item[column.key];
            if (!cell) {
              return "";
            }
            if (index >= dimEntries.length) {
              if (cell.raw != null && cell.raw !== "") {
                return cell.raw;
              }
              return cell.formatted || "";
            }
            return cell.label || cell.id || "";
          });
        });

        var numericFlags = columns.map(function (column, index) {
          return index >= dimEntries.length;
        });

        return { headers: resolvedHeaders, rows: rows, numericFlags: numericFlags };
      }

      _exportBoundData(dimensionsToExtract, measuresToExtract, headers, measureMapping) {
        try {
          var table = this._tableFromBinding(
            this.myDataSource,
            dimensionsToExtract,
            measuresToExtract,
            headers,
            measureMapping
          );
          return this._downloadSheet(table);
        } catch (error) {
          console.error(error);
          this.dispatchEvent(
            new CustomEvent("onExportError", {
              detail: { message: error.message || String(error) }
            })
          );
          return Promise.resolve();
        }
      }

      _downloadSheet(table) {
        var self = this;
        this._busy = true;
        this._render();
        return Promise.resolve()
          .then(function () {
            var bytes = SacXlsxBuilder.buildXlsxBuffer({
              sheetName: self._props.sheetName || "Export",
              headers: table.headers,
              rows: table.rows,
              includeTotals: self._props.includeTotals !== false,
              numericFlags: table.numericFlags || self._numericFlags(table.rows, table.headers.length)
            });
            var blob = new Blob([bytes], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            });
            var url = URL.createObjectURL(blob);
            var link = document.createElement("a");
            link.href = url;
            link.download = self._normalizeFileName(self._props.fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            self.dispatchEvent(new Event("onExportComplete"));
          })
          .catch(function (error) {
            console.error(error);
            self.dispatchEvent(
              new CustomEvent("onExportError", {
                detail: { message: error.message || String(error) }
              })
            );
          })
          .then(function () {
            self._busy = false;
            self._render();
          });
      }
    }
  );
})(typeof self !== "undefined" ? self : this);
