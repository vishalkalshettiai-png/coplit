# SAC Excel Export Button

Custom widget for **SAP Analytics Cloud** (Optimized Story and Analytic Application) that renders an **Export to Excel** button and downloads bound model data as an `.xlsx` file.

The workbook is built in the browser. No ExcelJS/CDN dependency is required, which avoids typical SAC content-security-policy blocks.

## Contents

| File | Purpose |
| --- | --- |
| `sac-excel-export-widget/ExcelExportButton.json` | Widget contribution file to upload in SAC (replace `YOUR-HOST`) |
| `sac-excel-export-widget/ExcelExportButton-local.json` | Same widget, pointed at `http://localhost:8080` |
| `sac-excel-export-widget/webcomponents/excel-export-button.js` | Main web component |
| `sac-excel-export-widget/webcomponents/excel-export-styling.js` | Styling panel (button text, colors, file name) |
| `sac-excel-export-widget/scripts/story-onclick.js` | Story / application `onClick` scripts to paste into SAC |
| `sac-excel-export-widget/demo.html` | Local browser demo with mock data |

## Host the widget files

SAC loads the JavaScript from the URLs in the JSON file. Host this folder on HTTPS (production) with CORS enabled:

- `Access-Control-Allow-Origin: *` (or your SAC tenant origin)
- `Content-Type: application/javascript` for `.js` files

Replace `https://YOUR-HOST/sac-excel-export-widget/...` in `ExcelExportButton.json` with your real base URL.

Local development:

```bash
cd sac-excel-export-widget
python3 -m http.server 8080
```

Upload `ExcelExportButton-local.json` while that server is running. Production tenants usually require HTTPS, so use the hosted JSON for go-live.

## Add the widget in SAC

1. **Stories** → **Custom Widgets** (or **Analytic Applications** → **Custom Widgets**).
2. Upload `ExcelExportButton.json`.
3. Open an Optimized Story or Analytic Application.
4. Insert **Excel Export Button** from the widget list.
5. In the **Builder** panel, bind the same model you use on the table/chart and add the dimensions and measures to export.
6. Resize the widget on the canvas so the button is visible.

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
