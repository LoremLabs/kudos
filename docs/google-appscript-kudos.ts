// Includes functions for exporting active sheet or all sheets as JSON object (also Python object syntax compatible).
// Tweak the makePrettyJSON_ function to customize what kind of JSON to export.

var FORMAT_ONELINE = "One-line";
var FORMAT_MULTILINE = "Multi-line";
var FORMAT_PRETTY = "Pretty";

var LANGUAGE_JS = "JavaScript";
var LANGUAGE_PYTHON = "Python";

var STRUCTURE_LIST = "List";
var STRUCTURE_HASH = 'Hash (keyed by "id" column)';

/* Defaults for this particular spreadsheet, change as desired */
var DEFAULT_FORMAT = FORMAT_PRETTY;
var DEFAULT_LANGUAGE = LANGUAGE_JS;
var DEFAULT_STRUCTURE = STRUCTURE_LIST;

function onOpen() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var menuEntries = [
    { name: "Export Kudos for this sheet", functionName: "exportSheet" },
    // {name: "Export JSON for all sheets", functionName: "exportAllSheets"}
    { name: "Import Kudos into new sheet", functionName: "importKudosToSheet" },
    { name: "Add summary to current sheet", functionName: "addSummarySheet" },
  ];
  ss.addMenu("Kudos", menuEntries);
}

// Function to generate a short UUID
function generateShortUuid() {
  return "xxxxxxxxxxxyxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function showFileDialog() {
  var htmlOutput = HtmlService.createHtmlOutput(`
    <style>
      .file-upload-container {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 200px;
        border: 2px dashed #aaa;
      }
      input[type="file"] {
        width: 100%;
        padding: 20px;
        box-sizing: border-box;
      }
      .loading-spinner {
        display: none;
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
    <div class="file-upload-container">
      <form>
        <input type="file" name="file" onchange="importNDJSON(this.parentNode)" accept=".ndjson, .kudos">
      </form>
      <div class="loading-spinner" id="loadingSpinner"></div>
    </div>
    <script>
      function importNDJSON(e) {
        document.getElementById("loadingSpinner").style.display = "inline-block";
        const file = e.file.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
          const ndjson = event.target.result;
          google.script.run.withSuccessHandler(closeDialog).withFailureHandler(showError).importKudosToSheet([[...new Int8Array(ndjson)], file.type, file.name]);
        };
        reader.readAsArrayBuffer(file);
      }
      function closeDialog() {
        document.getElementById("loadingSpinner").style.display = "none";
        google.script.host.close();
      }
      function showError(error) {
        document.getElementById("loadingSpinner").style.display = "none";
        alert('Error: ' + error);
      }
    </script>
  `)
    .setWidth(400) // Adjust the width as needed
    .setHeight(300); // Adjust the height as needed

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Import Kudos File");
}


function showFileDialogv1() {
  var htmlOutput = HtmlService.createHtmlOutput(
    '<form><input type="file" name="file" onchange="importNDJSON(this.parentNode)" accept=".ndjson, .kudos"></form>' +
      "<script>function importNDJSON(e) {" +
      "const file = e.file.files[0];" +
      "const reader = new FileReader();" +
      "reader.onload = function(event) {" +
      "const ndjson = event.target.result;" +
      "google.script.run.withSuccessHandler(google.script.host.close).withFailureHandler(showError).importKudosToSheet([[...new Int8Array(ndjson)], file.type, file.name]);" +
      "};" +
      "reader.readAsArrayBuffer(file);" +
      "} function showError(error) {" +
      "  alert('Error: ' + error);" +
      "}" +
      "</script>"
  )
    .setWidth(800)
    .setHeight(600);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Import Kudos File");
}

function addSummarySheet() {

  let sourceSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  let fileName = sourceSheet.getName();

  // see if the first column is 'identifier'
  let identifierColumn = sourceSheet.getRange(1, 1).getValue();
  if (identifierColumn !== "identifier") {
    throw new Error("Not detected as a source sheet");
  }

  // see if this sheet already has a summary sheet
  let summarySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(`${fileName}-summary`);
  if (summarySheet) {
    // clear sheet and re-create
    summarySheet.clear();
  } else {
    try {
      summarySheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(
        `${fileName}-summary`
      );
    } catch (error) {
      // If the sheet already exists, append a timestamp to the name
      summarySheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(
        `${fileName}-summary-${Date.now()}`
      );
    }  
  }

  // read in fields from sourceSheet
  const fields = sourceSheet
    .getRange(1, 1, 1, sourceSheet.getLastColumn())
    .getValues()[0];

  // Create a summary section
  //createSummarySection(sourceSheet, fields, summarySheet);

  // Example usage for grouping by identifier
createSummarySection(sourceSheet, fields, summarySheet, "identifier");

// Example usage for grouping by description
createSummarySection(sourceSheet, fields, summarySheet, "description");
}

function importKudosToSheet(e) {
  if (!e) {
    showFileDialog();
    return;
  }

  const ndjson = Utilities.newBlob(...e).getDataAsString();
  const dataObjects = ndjson.split("\n").map(JSON.parse);

  // Extract filename without extension
  let fileName = e[2].replace(/\.[^/.]+$/, "");

  // Create a new sheet with the filename as the name
  let newSheet;
  let newSheetSummary;
  try {
    newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(fileName);
  } catch (error) {
    // If the sheet already exists, append a timestamp to the name
    newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(
      `${fileName}-${Date.now()}`
    );
  }

  // Write fields to the first row
  const fields = Object.keys(dataObjects[0]);
  if (!fields.includes("id")) {
    fields.push("id");
  }
  if (!fields.includes("traceId")) {
    fields.push("traceId");
  }

  for (let i = 0; i < fields.length; i++) {
    newSheet.getRange(1, i + 1).setValue(fields[i]);
  }

  // Freeze the first row
  newSheet.setFrozenRows(1);

  // generate trace for this import
  const traceId = generateShortUuid();

  // Write dataObjects to the new sheet
  dataObjects.forEach(function (dataObject, index) {
    var row = index + 2; // Start from the second row

    // Generate a short UUID if "id" field is not present
    if (!dataObject.hasOwnProperty("id")) {
      dataObject.id = generateShortUuid();
    }
    if (!dataObject.hasOwnProperty("traceId")) {
      dataObject.traceId = traceId;
    }

    for (var key in dataObject) {
      if (dataObject.hasOwnProperty(key)) {
        newSheet
          .getRange(row, fields.indexOf(key) + 1)
          .setValue(dataObject[key]);
        // Auto-size the columns after writing each value
        newSheet.autoResizeColumn(fields.indexOf(key) + 1);
      }
    }
  });
}

function createSummarySection(sheet, fields, summarySheet, groupBy) {
  const weightColumnIndex = fields.indexOf("weight");

  if (weightColumnIndex === -1) {
    console.error("No 'weight' column found for summary section.");
    return;
  }

  const summary = {};
  let firstRow = summarySheet.getLastRow() + 1;
  let currentRow = firstRow;
  let inputRow = currentRow;
  const defaultBudget = 100.000000;

  if (firstRow === 1) {
    const userInput = summarySheet.getRange(inputRow, 2).setValue(`$${defaultBudget}`);
    userInput.setNumberFormat("$0.000000");
    summarySheet.getRange(inputRow, 1).setValue("Total Budget");
    summarySheet.getRange(inputRow, 1, 1, 2).setBackground("#D3D3D3");
    currentRow += 2;
  }    

  let totalWeight = 0;

  for (let row = 2; row <= sheet.getLastRow(); row++) {
    const groupKey = sheet.getRange(row, fields.indexOf(groupBy) + 1).getValue();
    const weight = sheet.getRange(row, weightColumnIndex + 1).getValue();

    if (!summary[groupKey]) {
      summary[groupKey] = { weight: 0, row: `${row}` };
    }

    summary[groupKey].weight += weight;
    totalWeight += weight;
  }

  summarySheet.getRange(currentRow, 1).setValue("Total Weights");
  summarySheet.getRange(currentRow, 2).setValue(totalWeight);
  let totalWeightRow = currentRow;

  currentRow += 1;

  const amounts = {};
  for (const groupKey in summary) {
    amounts[groupKey] = `=B${inputRow} * ${summary[groupKey].weight} / ${totalWeight}`;
  }

  currentRow += 1;

  summarySheet.getRange(currentRow, 1).setValue("Summary");
  summarySheet.getRange(currentRow, 1).setFontWeight("bold");
  currentRow += 1;
  summarySheet.getRange(currentRow, 1).setValue(groupBy.charAt(0).toUpperCase() + groupBy.slice(1));
  summarySheet.getRange(currentRow, 2).setValue("Payment");
  summarySheet.getRange(currentRow, 3).setValue("Total Weight");
  currentRow += 1;

  let summaryRow = currentRow;
  Object.entries(summary)
    .sort(([, a], [, b]) => b.weight - a.weight)
    .forEach(([groupKey, data]) => {
      summarySheet.getRange(currentRow, 1).setValue(groupKey);
      summarySheet.getRange(currentRow, 2).setFormula(amounts[groupKey]);
      summarySheet.getRange(currentRow, 2).setNumberFormat("$0.000000");
      summarySheet.getRange(currentRow, 3).setValue(data.weight);
      currentRow++;
    });

  currentRow++;

  const chartRange = summarySheet.getRange(summaryRow, 1, currentRow - summaryRow, 3);
  const chartTitle = `Distribution by ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`;

  const chart = sheet
    .newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(chartRange)
    .setPosition((firstRow === 1) ? 3 : 25, 6, 0, 0)
    .setOption("pieHole", 0.7)
    .setOption("pieSliceText", "value")
    .setOption('title', chartTitle)
    .build();

  summarySheet.insertChart(chart);

  summarySheet.autoResizeColumn(1);
  summarySheet.autoResizeColumn(2);
  summarySheet.autoResizeColumn(3);
  sheet.autoResizeColumn(1);
  sheet.autoResizeColumn(2);
  sheet.autoResizeColumn(3);
}

function createSummarySectionv1(sheet, fields, summarySheet) {
  // Find the column index of the "weight" column
  const weightColumnIndex = fields.indexOf("weight");

  // If "weight" column is not present, return
  if (weightColumnIndex === -1) {
    console.error("No 'weight' column found for summary section.");
    return;
  }

  // Create a summary object to store total weights for each identifier
  const summary = {};

  let currentRow = 1;
  let inputRow = currentRow;

  // Get the user input for the amount
  const defaultBudget = 100.000000;
  const userInput = summarySheet.getRange(inputRow, 2).setValue(`$${defaultBudget}`);
  userInput.setNumberFormat("$0.000000");
  summarySheet.getRange(inputRow, 1).setValue("Total Budget");
  // make background of row grey
  summarySheet.getRange(inputRow, 1, 1, 2).setBackground("#D3D3D3");

  currentRow += 2;

  let totalWeight = 0;

  // Iterate through rows to calculate total weights for each identifier
  for (let row = 2; row <= sheet.getLastRow(); row++) {
    const identifier = sheet
      .getRange(row, fields.indexOf("identifier") + 1)
      .getValue();
    const weight = sheet.getRange(row, weightColumnIndex + 1).getValue();

    if (!summary[identifier]) {
      summary[identifier] = { weight: 0, row: `${row}` };
    }

    summary[identifier].weight += weight;
    totalWeight += weight;
  }


  summarySheet.getRange(currentRow, 1).setValue("Total Weights");
  summarySheet.getRange(currentRow, 2).setValue(totalWeight);
  let totalWeightRow = currentRow;

  currentRow += 1;

  // Calculate the amount for each identifier
  const amounts = {};
  for (const identifier in summary) {
    // amounts[identifier] = (
    //   defaultBudget *
    //   (summary[identifier] / totalWeight)
    // ).toFixed(2);
    amounts[identifier] = `=B${inputRow} * ${summary[identifier].weight} / ${totalWeight}`;
  }

  currentRow += 1;

  // Write summary section headers
  summarySheet.getRange(currentRow, 1).setValue("Summary");
  // make a bold header
  summarySheet.getRange(currentRow, 1).setFontWeight("bold");
  currentRow += 1;
  summarySheet.getRange(currentRow, 1).setValue("Identifier");
  summarySheet.getRange(currentRow, 2).setValue("Payment");
  summarySheet.getRange(currentRow, 3).setValue("Total Weight");
  currentRow += 1;

  // Write summary data to the sheet
  let summaryRow = currentRow;
  Object.entries(summary)
  .sort(([, a], [, b]) => b.weight - a.weight)
  .forEach(([identifier, data]) => {
    summarySheet.getRange(currentRow, 1).setValue(identifier);
    summarySheet.getRange(currentRow, 2).setFormula(amounts[identifier]);
    summarySheet.getRange(currentRow, 2).setNumberFormat("$0.000000");
    summarySheet.getRange(currentRow, 3).setValue(data.weight);
    currentRow++;
  });

  currentRow++;

  // Create the pie chart
  const chartRange = summarySheet.getRange(
    summaryRow,
    1,
    currentRow - summaryRow,
    3
  ); // Adjust the range to include all columns

  const chart = sheet
    .newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(chartRange)
    .setPosition(3, 6, 0, 0)
    .setOption("pieHole", 0.7)
    .setOption("pieSliceText", "value") // Display actual values as labels
    .setOption('title', 'Distribution by Identifier') 
    // .setOption("backgroundColor", "none")
    .build();
  
  summarySheet.insertChart(chart);

  summarySheet.autoResizeColumn(1);
  summarySheet.autoResizeColumn(2);
  summarySheet.autoResizeColumn(3);
  sheet.autoResizeColumn(1);
  sheet.autoResizeColumn(2);
  sheet.autoResizeColumn(3);
}

function makeLabel(app, text, id) {
  var lb = app.createLabel(text);
  if (id) lb.setId(id);
  return lb;
}

function makeListBox(app, name, items) {
  var listBox = app.createListBox().setId(name).setName(name);
  listBox.setVisibleItemCount(1);

  var cache = CacheService.getPublicCache();
  var selectedValue = cache.get(name);
  Logger.log(selectedValue);
  for (var i = 0; i < items.length; i++) {
    listBox.addItem(items[i]);
    if (items[1] == selectedValue) {
      listBox.setSelectedIndex(i);
    }
  }
  return listBox;
}

function makeButton(app, parent, name, callback) {
  var button = app.createButton(name);
  app.add(button);
  var handler = app
    .createServerClickHandler(callback)
    .addCallbackElement(parent);
  button.addClickHandler(handler);
  return button;
}

function makeTextBox(app, name) {
  var textArea = app
    .createTextArea()
    .setWidth("100%")
    .setHeight("200px")
    .setId(name)
    .setName(name);
  return textArea;
}

function exportAllSheets(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheetsData = {};
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var rowsData = getRowsData_(sheet, getExportOptions(e));
    var sheetName = sheet.getName();
    sheetsData[sheetName] = rowsData;
  }
  var json = makeJSON_(sheetsData, getExportOptions(e));
  displayText_(ss.getName(), json);
}

function exportSheet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var rowsData = getRowsData_(sheet, getExportOptions(e));
  var json = makeJSON_(rowsData, getExportOptions(e));
  displayText_(sheet.getName(), json);
}

function getExportOptions(e) {
  var options = {};

  options.language = (e && e.parameter.language) || DEFAULT_LANGUAGE;
  options.format = (e && e.parameter.format) || DEFAULT_FORMAT;
  options.structure = (e && e.parameter.structure) || DEFAULT_STRUCTURE;

  var cache = CacheService.getPublicCache();
  cache.put("language", options.language);
  cache.put("format", options.format);
  cache.put("structure", options.structure);

  Logger.log(options);
  return options;
}

function makeJSON_(object, options) {
  var jsonStrings = [];

  if (options.format == FORMAT_PRETTY) {
    for (var i = 0; i < object.length; i++) {
      var jsonString = JSON.stringify(object[i]);
      jsonStrings.push(jsonString);
    }
  } else if (options.format == FORMAT_MULTILINE) {
    for (var i = 0; i < object.length; i++) {
      var jsonString = Utilities.jsonStringify(object[i]);
      jsonString = jsonString.replace(/"([a-zA-Z]*)":\s+"/gi, '"$1": u"');
      jsonStrings.push(jsonString);
    }
  } else {
    for (var i = 0; i < object.length; i++) {
      var jsonString = Utilities.jsonStringify(object[i]);
      jsonStrings.push(jsonString);
    }
  }

  return jsonStrings.join("\n");
}

function displayText_(sheetName, text) {
  var filename = (sheetName || "kudos") + ".kudos";

  var output = HtmlService.createHtmlOutput(
    "<button style='margin-bottom: 6px;' onclick='downloadAndClose()'>Download</button><br/><textarea style='font-face:mono;width:100%;' rows='20'>" +
      text +
      "</textarea>" +
      "<script>" +
      "function downloadAndClose(data, filename) {" +
      '  var blob = new Blob([decodeURIComponent(data)], { type: "application/x-ndjson;charset=utf-8" });' +
      '  var link = document.createElement("a");' +
      "  link.href = window.URL.createObjectURL(blob);" +
      '  link.download = "' +
      filename.replace(/"/g, '\\"') +
      '";' +
      "  document.body.appendChild(link);" +
      "  link.click();" +
      "  document.body.removeChild(link);" +
      "google.script.host.close();" +
      "}" +
      "</script>"
  );

  output.setWidth(800);
  output.setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(output, "Exported Kudos");
}

// getRowsData iterates row by row in the input range and returns an array of objects.
// Each object contains all the data for a given row, indexed by its normalized column name.
// Arguments:
//   - sheet: the sheet object that contains the data to be processed
//   - range: the exact range of cells where the data is stored
//   - columnHeadersRowIndex: specifies the row number where the column names are stored.
//       This argument is optional and it defaults to the row immediately above range;
// Returns an Array of objects.
function getRowsData_(sheet, options) {
  var headersRange = sheet.getRange(
    1,
    1,
    sheet.getFrozenRows(),
    sheet.getMaxColumns()
  );
  var headers = headersRange.getValues()[0];

  // Check if there are any data rows in the sheet
  var dataRange = sheet.getRange(
    sheet.getFrozenRows() + 1,
    1,
    sheet.getMaxRows() - sheet.getFrozenRows(),
    sheet.getMaxColumns()
  );
  if (dataRange.getNumRows() == 0) {
    return [];
  }

  var objects = getObjects_(dataRange.getValues(), normalizeHeaders_(headers));

  if (options.structure == STRUCTURE_HASH) {
    var objectsById = {};
    objects.forEach(function (object) {
      objectsById[object.id] = object;
    });
    return objectsById;
  } else {
    return objects;
  }
}

// getColumnsData iterates column by column in the input range and returns an array of objects.
// Each object contains all the data for a given column, indexed by its normalized row name.
// Arguments:
//   - sheet: the sheet object that contains the data to be processed
//   - range: the exact range of cells where the data is stored
//   - rowHeadersColumnIndex: specifies the column number where the row names are stored.
//       This argument is optional and it defaults to the column immediately left of the range;
// Returns an Array of objects.
function getColumnsData_(sheet, range, rowHeadersColumnIndex) {
  rowHeadersColumnIndex = rowHeadersColumnIndex || range.getColumnIndex() - 1;
  var headersTmp = sheet
    .getRange(range.getRow(), rowHeadersColumnIndex, range.getNumRows(), 1)
    .getValues();
  var headers = normalizeHeaders_(arrayTranspose_(headersTmp)[0]);
  return getObjects(arrayTranspose_(range.getValues()), headers);
}

// For every row of data in data, generates an object that contains the data. Names of
// object fields are defined in keys.
// Arguments:
//   - data: JavaScript 2d array
//   - keys: Array of Strings that define the property names for the objects to create
function getObjects_(data, keys) {
  var objects = [];
  for (var i = 0; i < data.length; ++i) {
    var object = {};
    var hasData = false;
    for (var j = 0; j < data[i].length; ++j) {
      var cellData = data[i][j];
      if (isCellEmpty_(cellData)) {
        continue;
      }
      object[keys[j]] = cellData;
      hasData = true;
    }
    if (hasData) {
      objects.push(object);
    }
  }
  return objects;
}

// Returns an Array of normalized Strings.
// Arguments:
//   - headers: Array of Strings to normalize
function normalizeHeaders_(headers) {
  var keys = [];
  for (var i = 0; i < headers.length; ++i) {
    var key = normalizeHeader_(headers[i]);
    if (key.length > 0) {
      keys.push(key);
    }
  }
  return keys;
}

// Normalizes a string, by removing all alphanumeric characters and using mixed case
// to separate words. The output will always start with a lower case letter.
// This function is designed to produce JavaScript object property names.
// Arguments:
//   - header: string to normalize
// Examples:
//   "First Name" -> "firstName"
//   "Market Cap (millions) -> "marketCapMillions
//   "1 number at the beginning is ignored" -> "numberAtTheBeginningIsIgnored"
function normalizeHeader_(header) {
  var key = "";
  var upperCase = false;
  for (var i = 0; i < header.length; ++i) {
    var letter = header[i];
    if (letter == " " && key.length > 0) {
      upperCase = true;
      continue;
    }
    if (!isAlnum_(letter)) {
      continue;
    }
    if (key.length == 0 && isDigit_(letter)) {
      continue; // first character must be a letter
    }
    if (upperCase) {
      upperCase = false;
      key += letter.toUpperCase();
    } else {
      key += letter.toLowerCase();
    }
  }
  return key;
}

// Returns true if the cell where cellData was read from is empty.
// Arguments:
//   - cellData: string
function isCellEmpty_(cellData) {
  return typeof cellData == "string" && cellData == "";
}

// Returns true if the character char is alphabetical, false otherwise.
function isAlnum_(char) {
  return (
    (char >= "A" && char <= "Z") ||
    (char >= "a" && char <= "z") ||
    isDigit_(char)
  );
}

// Returns true if the character char is a digit, false otherwise.
function isDigit_(char) {
  return char >= "0" && char <= "9";
}

// Given a JavaScript 2d Array, this function returns the transposed table.
// Arguments:
//   - data: JavaScript 2d Array
// Returns a JavaScript 2d Array
// Example: arrayTranspose([[1,2,3],[4,5,6]]) returns [[1,4],[2,5],[3,6]].
function arrayTranspose_(data) {
  if (data.length == 0 || data[0].length == 0) {
    return null;
  }

  var ret = [];
  for (var i = 0; i < data[0].length; ++i) {
    ret.push([]);
  }

  for (var i = 0; i < data.length; ++i) {
    for (var j = 0; j < data[i].length; ++j) {
      ret[j][i] = data[i][j];
    }
  }

  return ret;
}
