// SAP Analytics Cloud — Optimized Story / Analytic Application scripts
// Copy each block into the matching widget event in the story script editor.
// Replace widget IDs with the names from your Outline panel.

// -----------------------------------------------------------------------------
// ExcelExportButton_1.onClick
// Use this when autoExportOnClick is false, or when you want extra logic
// (file name, selected columns) before the download.
// -----------------------------------------------------------------------------
ExcelExportButton_1.setFileName("Sales_Export.xlsx");
ExcelExportButton_1.setSheetName("Sales");
ExcelExportButton_1.setButtonText("Export to Excel");
ExcelExportButton_1.exportToExcel();


// -----------------------------------------------------------------------------
// ExcelExportButton_1.onClick  — export a subset of bound fields
// Dimension / measure IDs must be technical names from the model.
// -----------------------------------------------------------------------------
var dim = ["Version", "Item", "Date", "Person"];
var measures = ["[Account].[parentId].&[Quantity]", "[Account].[parentId].&[Price]"];
var headers = ["Category", "Item", "Date", "Person", "Quantity", "Price"];
var measureMapping = [
    "[Account].[parentId].&[Quantity]:Quantity",
    "[Account].[parentId].&[Price]:Price"
];
ExcelExportButton_1.downloadXLSX(dim, measures, headers, measureMapping);


// -----------------------------------------------------------------------------
// Button_1.onClick
// Native SAC button that triggers the custom widget export.
// -----------------------------------------------------------------------------
ExcelExportButton_1.setFileName("Story_Export.xlsx");
ExcelExportButton_1.exportToExcel();


// -----------------------------------------------------------------------------
// Button_1.onClick  — export JSON assembled in script
// Useful when the payload is built from script variables, not data binding.
// -----------------------------------------------------------------------------
var jsonText = "{\"headers\":[\"Region\",\"Revenue\"],\"rows\":[[\"AMER\",1200],[\"EMEA\",980],[\"APJ\",1105]]}";
ExcelExportButton_1.setFileName("Manual_Export.xlsx");
ExcelExportButton_1.exportJson(jsonText);


// -----------------------------------------------------------------------------
// ExcelExportButton_1.onExportComplete
// -----------------------------------------------------------------------------
Application.showMessage(ApplicationMessageType.Success, "Excel download started.");


// -----------------------------------------------------------------------------
// ExcelExportButton_1.onExportError
// -----------------------------------------------------------------------------
Application.showMessage(ApplicationMessageType.Error, "Excel export failed. Bind a model to the widget and try again.");
