# SAC Excel Export Button

Custom widget for **SAP Analytics Cloud** (Optimized Story and Analytic Application) that renders an **Export to Excel** button and downloads bound model data as an `.xlsx` file.

The workbook is built in the browser. No ExcelJS/CDN dependency is required, which avoids typical SAC content-security-policy blocks.

## Upload to SAC (two files)

SAC does **not** accept a single combined zip as the contribution file. Upload JSON first, then the Resource File zip.

1. **JSON upload:** `sac-excel-export-widget/dist/ExcelExportButton.json`  
   (same file as `sac-excel-export-widget/ExcelExportButton.json`)
2. **Resource File (.zip) upload:** `sac-excel-export-widget/dist/ExcelExportButton-resources.zip`

If a previous widget upload failed, **delete that custom widget** in SAC, then upload these two files again. The Resource File button appears only after a valid JSON with root-relative URLs (`/excel-export-button.js`) is accepted.

The resource zip contains **only** these files at the zip root (no folders, no JSON, no HTML):

- `excel-export-button.js`
- `excel-export-styling.js`

Rebuild the artifacts:

```bash
node sac-excel-export-widget/scripts/pack-zip.js
```

### Why the old zip failed

SAC Resource File zips may include only web-component JavaScript (and optional PNG/JPG icons). They must **not** include:

- the contribution `.json`
- `story-onclick.js`, HTML, CSS, README, tests
- subfolders

JSON `url` values must be `/filename.js`, not `https://YOUR-HOST/...` and not a path without the leading slash.

## Contents

| File | Purpose |
| --- | --- |
| `sac-excel-export-widget/dist/ExcelExportButton.json` | Contribution JSON to upload first |
| `sac-excel-export-widget/dist/ExcelExportButton-resources.zip` | Resource File zip to upload second |
| `sac-excel-export-widget/ExcelExportButton-local.json` | Local HTTPS-server development JSON |
| `sac-excel-export-widget/webcomponents/excel-export-button.js` | Main web component |
| `sac-excel-export-widget/webcomponents/excel-export-styling.js` | Styling panel (button text, colors, file name) |
| `sac-excel-export-widget/scripts/story-onclick.js` | Story / application `onClick` scripts to paste into SAC |
| `sac-excel-export-widget/demo.html` | Local browser demo with mock data |

## Host the widget files

Use the JSON + Resource File zip above for SAC-hosted widgets. External hosting is optional: serve the JavaScript over HTTPS with CORS and put full `https://...` URLs in a copy of the JSON. Do not mix those absolute URLs with a Resource File zip upload.

Local development:

```bash
cd sac-excel-export-widget
python3 -m http.server 8080
```

Upload `ExcelExportButton-local.json` while that server is running. Production tenants usually require HTTPS, so use the hosted JSON for go-live.

## Add the widget in SAC

1. **Stories** → **Custom Widgets** (or **Analytic Applications** → **Custom Widgets**).
2. Upload `ExcelExportButton.json`.
3. When SAC asks for **Resource File**, upload `ExcelExportButton-resources.zip`.
4. Open an Optimized Story or Analytic Application.
5. Insert **Excel Export Button** from the widget list.
6. In the **Builder** panel, bind the same model you use on the table/chart and add the dimensions and measures to export.
7. Resize the widget on the canvas so the button is visible.

Optional: open **Styling** → **Custom Widget Additional Properties** to change the label, colors, file name, totals row, and whether click auto-exports.

## Story JavaScript (`onClick`)

SAC does not run arbitrary page JavaScript. Put script on widget events in the story script editor.

### 1. Widget button click (recommended)

Select `ExcelExportButton_1` → **onClick**:

```javascript
ExcelExportButton_1.setFileName("Sales_Export.xlsx");
ExcelExportButton_1.setSheetName("Sales");
ExcelExportButton_1.exportToExcel();
```

If **Export automatically on click** is enabled in the styling panel, the bound data is already exported when the button is clicked. Keep that option on for a zero-script setup, or turn it off and call `exportToExcel()` / `downloadXLSX()` from script as shown above.

### 2. Export selected columns

```javascript
var dim = ["Version", "Item", "Date", "Person"];
var measures = ["[Account].[parentId].&[Quantity]", "[Account].[parentId].&[Price]"];
var headers = ["Category", "Item", "Date", "Person", "Quantity", "Price"];
var measureMapping = [
    "[Account].[parentId].&[Quantity]:Quantity",
    "[Account].[parentId].&[Price]:Price"
];
ExcelExportButton_1.downloadXLSX(dim, measures, headers, measureMapping);
```

Use the **technical names** from your model (as in the Builder panel), not display names.

### 3. Native SAC button `onClick`

Select a standard `Button_1` → **onClick**:

```javascript
ExcelExportButton_1.setFileName("Story_Export.xlsx");
ExcelExportButton_1.exportToExcel();
```

You can hide the custom widget (very small / behind another widget) and use only the standard button, as long as the custom widget stays in the story so its data binding is loaded.

### 4. Export JSON from script

```javascript
var jsonText = "{\"headers\":[\"Region\",\"Revenue\"],\"rows\":[[\"AMER\",1200],[\"EMEA\",980]]}";
ExcelExportButton_1.exportJson(jsonText);
```

More copies of these scripts are in `sac-excel-export-widget/scripts/story-onclick.js`.

## Script API

| Method | Description |
| --- | --- |
| `exportToExcel()` | Export every bound dimension and measure |
| `downloadXLSX(dimensions, measures, headers, measureMapping)` | Export a subset and rename headers |
| `exportJson(jsonText)` | Export `{"headers":[],"rows":[]}` or an object array encoded as a string |
| `setButtonText(text)` | Change the label |
| `setFileName(fileName)` | Change the download name (`.xlsx` is appended if missing) |
| `setSheetName(sheetName)` | Change the worksheet name |

| Event | Description |
| --- | --- |
| `onClick` | Widget button clicked |
| `onExportComplete` | Browser download started |
| `onExportError` | No bound data or workbook build failed |

## Verify locally

```bash
node sac-excel-export-widget/test/xlsx-builder.test.js
```

Open `sac-excel-export-widget/demo.html` in a browser and use the button to download a sample workbook.
