(function () {
  "use strict";

  var template = document.createElement("template");
  template.innerHTML =
    "<style>" +
    ":host { display: block; font-family: '72', Arial, Helvetica, sans-serif; font-size: 13px; color: #32363a; }" +
    "form { display: grid; gap: 12px; padding: 8px 0; }" +
    "label { display: grid; gap: 4px; font-weight: 600; }" +
    "input[type='text'], input[type='color'] { height: 32px; border: 1px solid #a9b4be; border-radius: 4px; padding: 0 8px; }" +
    "input[type='color'] { padding: 2px; width: 48px; }" +
    ".row { display: flex; align-items: center; gap: 8px; font-weight: 400; }" +
    "button { height: 32px; border: 0; border-radius: 4px; background: #0a6ed1; color: #fff; font-weight: 600; cursor: pointer; }" +
    "</style>" +
    "<form id='form'>" +
    "<label>Button text <input id='buttonText' type='text' /></label>" +
    "<label>File name <input id='fileName' type='text' /></label>" +
    "<label>Sheet name <input id='sheetName' type='text' /></label>" +
    "<label>Background <input id='backgroundColor' type='color' /></label>" +
    "<label>Text color <input id='textColor' type='color' /></label>" +
    "<label class='row'><input id='includeTotals' type='checkbox' /> Include totals row</label>" +
    "<label class='row'><input id='autoExportOnClick' type='checkbox' /> Export automatically on click</label>" +
    "<button type='submit'>Apply</button>" +
    "</form>";

  customElements.define(
    "com-vishal-sac-excelexportbutton-styling",
    class ExcelExportButtonStyling extends HTMLElement {
      constructor() {
        super();
        this._shadowRoot = this.attachShadow({ mode: "open" });
        this._shadowRoot.appendChild(template.content.cloneNode(true));
        this._id = {
          buttonText: this._shadowRoot.getElementById("buttonText"),
          fileName: this._shadowRoot.getElementById("fileName"),
          sheetName: this._shadowRoot.getElementById("sheetName"),
          backgroundColor: this._shadowRoot.getElementById("backgroundColor"),
          textColor: this._shadowRoot.getElementById("textColor"),
          includeTotals: this._shadowRoot.getElementById("includeTotals"),
          autoExportOnClick: this._shadowRoot.getElementById("autoExportOnClick")
        };
        this._shadowRoot.getElementById("form").addEventListener("submit", this._submit.bind(this));
      }

      onCustomWidgetBeforeUpdate(changedProperties) {
        this._props = Object.assign({}, this._props, changedProperties);
      }

      onCustomWidgetAfterUpdate() {
        this._id.buttonText.value = this._props.buttonText || "Export to Excel";
        this._id.fileName.value = this._props.fileName || "SAC_Export.xlsx";
        this._id.sheetName.value = this._props.sheetName || "Export";
        this._id.backgroundColor.value = this._toColor(this._props.backgroundColor, "#0a6ed1");
        this._id.textColor.value = this._toColor(this._props.textColor, "#ffffff");
        this._id.includeTotals.checked = this._props.includeTotals !== false;
        this._id.autoExportOnClick.checked = this._props.autoExportOnClick !== false;
      }

      _toColor(value, fallback) {
        if (!value) {
          return fallback;
        }
        return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
      }

      _submit(event) {
        event.preventDefault();
        this.dispatchEvent(
          new CustomEvent("propertiesChanged", {
            detail: {
              properties: {
                buttonText: this._id.buttonText.value,
                fileName: this._id.fileName.value,
                sheetName: this._id.sheetName.value,
                backgroundColor: this._id.backgroundColor.value,
                textColor: this._id.textColor.value,
                includeTotals: this._id.includeTotals.checked,
                autoExportOnClick: this._id.autoExportOnClick.checked
              }
            }
          })
        );
      }
    }
  );
})();
