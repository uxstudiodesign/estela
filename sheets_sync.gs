// ============================================
// ESTELA — Google Sheets Sync (Iscrizioni + Check-in)
// ============================================
//
// SETUP:
// 1. Open Google Apps Script (script.google.com), create new project
// 2. Paste this file
// 3. Go to Project Settings > Script Properties, add:
//      SUPABASE_URL        — e.g. https://xxx.supabase.co
//      SUPABASE_SERVICE_KEY — service_role secret key (Supabase > Settings > API > service_role)
//      SHEET_ID            — Google Sheets spreadsheet ID (from the URL)
// 4. Deploy as Web App:
//      Deploy > New deployment > Web app
//      Execute as: Me | Who has access: Anyone
//      Copy the Web App URL
// 5. Configure Supabase Database Webhooks (Dashboard > Database > Webhooks):
//      Webhook 1: sheets_sync_registrations
//        Table: registrations | Events: INSERT, UPDATE, DELETE
//        HTTP POST to your Web App URL
//      Webhook 2: sheets_sync_checkins
//        Table: checkins | Events: INSERT, UPDATE, DELETE
//        HTTP POST to your Web App URL
// 6. Run installTrigger() once manually to activate the 5-minute fallback sync
// 7. Authorize permissions when prompted

/**
 * Column headers written to every tab.
 */
var HEADERS = [
  'Registration Date',
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Company',
  'Role',
  'Origin',
  'Breakfast 29',
  'Breakfast 30',
  'Breakfast 01',
  'Sunset 29',
  'Sunset 30',
  'Check-in Breakfast 29',
  'Check-in Breakfast 30',
  'Check-in Breakfast 01',
  'Check-in Sunset 29',
  'Check-in Sunset 30',
  'Sponsor Consent',
];

/**
 * Checkin lookup keys matching event_type + '_' + event_day from the checkins table.
 */
var CHECKIN_KEYS = [
  'colazione_2025-04-29',
  'colazione_2025-04-30',
  'colazione_2025-05-01',
  'sunset_2025-04-29',
  'sunset_2025-04-30',
];

/**
 * Webhook handler — triggered by Supabase Database Webhooks.
 * Runs a full sync on every database change (registrations or checkins).
 */
function doPost(e) {
  try {
    syncFromSupabase();
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Health check / manual trigger endpoint.
 * Open the Web App URL in a browser to run a sync and verify it works.
 */
function doGet(e) {
  try {
    syncFromSupabase();
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', synced_at: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Main sync function — called by webhook (doPost), manual trigger (doGet),
 * or every 5 minutes by the time-based fallback trigger.
 *
 * Fetches all registrations + checkins from Supabase and writes to 3 Google Sheets tabs.
 */
function syncFromSupabase() {
  var props = PropertiesService.getScriptProperties();
  var supabaseUrl = props.getProperty('SUPABASE_URL');
  var supabaseKey = props.getProperty('SUPABASE_SERVICE_KEY');
  var sheetId = props.getProperty('SHEET_ID');

  if (!supabaseUrl || !supabaseKey || !sheetId) {
    throw new Error(
      'Missing script properties. Set SUPABASE_URL, SUPABASE_SERVICE_KEY, and SHEET_ID in Project Settings > Script Properties.'
    );
  }

  var fetchOptions = {
    headers: {
      apikey: supabaseKey,
      Authorization: 'Bearer ' + supabaseKey,
    },
    muteHttpExceptions: true,
  };

  // Fetch registrations
  var regResponse = UrlFetchApp.fetch(
    supabaseUrl + '/rest/v1/registrations?select=*&order=created_at.asc',
    fetchOptions
  );

  if (regResponse.getResponseCode() !== 200) {
    throw new Error('Supabase registrations API error (' + regResponse.getResponseCode() + '): ' + regResponse.getContentText());
  }

  var registrations = JSON.parse(regResponse.getContentText());

  // Fetch all checkins
  var checkinResponse = UrlFetchApp.fetch(
    supabaseUrl + '/rest/v1/checkins?select=registration_id,event_type,event_day',
    fetchOptions
  );

  var checkinLookup = {};
  if (checkinResponse.getResponseCode() === 200) {
    var checkins = JSON.parse(checkinResponse.getContentText());
    for (var i = 0; i < checkins.length; i++) {
      var c = checkins[i];
      var key = c.event_type + '_' + c.event_day;
      if (!checkinLookup[c.registration_id]) {
        checkinLookup[c.registration_id] = {};
      }
      checkinLookup[c.registration_id][key] = true;
    }
  }

  var ss = SpreadsheetApp.openById(sheetId);

  // Tab 1: All registrations
  writeToTab(ss, 'All Registrations', registrations, checkinLookup);

  // Tab 2: Breakfast only (registered for at least one breakfast seminar)
  writeToTab(
    ss,
    'Breakfast',
    registrations.filter(function (r) {
      return r.colazione_29 || r.colazione_30 || r.colazione_01;
    }),
    checkinLookup
  );

  // Tab 3: Sunset only (registered for at least one sunset cocktail)
  writeToTab(
    ss,
    'Sunset',
    registrations.filter(function (r) {
      return r.sunset_29 || r.sunset_30;
    }),
    checkinLookup
  );
}

/**
 * Writes registration + checkin data to a named sheet tab.
 * Creates the tab if it doesn't exist.
 * Overwrites all content on every run.
 */
function writeToTab(ss, tabName, rows, checkinLookup) {
  var sheet = ss.getSheetByName(tabName);

  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }

  // Clear all existing content
  sheet.clearContents();

  if (rows.length === 0) {
    // Write headers only
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    formatHeaderRow(sheet);
    return;
  }

  var data = rows.map(function (r) {
    var regCheckins = checkinLookup[r.id] || {};
    return [
      r.created_at ? formatTimestamp(r.created_at) : '',
      r.nome || '',
      r.cognome || '',
      r.email || '',
      r.telefono || '',
      r.azienda || '',
      r.ruolo || '',
      r.provenienza || '',
      r.colazione_29 ? 'Yes' : 'No',
      r.colazione_30 ? 'Yes' : 'No',
      r.colazione_01 ? 'Yes' : 'No',
      r.sunset_29 ? 'Yes' : 'No',
      r.sunset_30 ? 'Yes' : 'No',
      regCheckins[CHECKIN_KEYS[0]] ? 'Yes' : 'No',
      regCheckins[CHECKIN_KEYS[1]] ? 'Yes' : 'No',
      regCheckins[CHECKIN_KEYS[2]] ? 'Yes' : 'No',
      regCheckins[CHECKIN_KEYS[3]] ? 'Yes' : 'No',
      regCheckins[CHECKIN_KEYS[4]] ? 'Yes' : 'No',
      r.consenso_sponsor ? 'Yes' : 'No',
    ];
  });

  var allRows = [HEADERS].concat(data);
  sheet.getRange(1, 1, allRows.length, HEADERS.length).setValues(allRows);
  formatSheet(sheet, rows.length);
}

/**
 * Applies visual formatting to the sheet:
 * - Dark header with white text
 * - Green/red backgrounds for check-in columns
 * - Alternating row colors
 * - Auto-resize columns
 * - Borders
 */
function formatSheet(sheet, dataRowCount) {
  var numCols = HEADERS.length;
  var numRows = dataRowCount + 1; // +1 for header

  // — Header row: dark navy background, white bold text —
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight('bold');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setBackground('#1B2A4A');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  if (dataRowCount === 0) return;

  var dataRange = sheet.getRange(2, 1, dataRowCount, numCols);

  // — Alternating row colors —
  for (var row = 2; row <= numRows; row++) {
    var rowRange = sheet.getRange(row, 1, 1, numCols);
    if (row % 2 === 0) {
      rowRange.setBackground('#F8F9FA');
    } else {
      rowRange.setBackground('#FFFFFF');
    }
  }

  // — Check-in columns: green for Yes, red for No (columns 14-18) —
  var checkinStartCol = 14; // 'Check-in Breakfast 29'
  var checkinEndCol = 18;   // 'Check-in Sunset 30'
  for (var row = 2; row <= numRows; row++) {
    for (var col = checkinStartCol; col <= checkinEndCol; col++) {
      var cell = sheet.getRange(row, col);
      var value = cell.getValue();
      if (value === 'Yes') {
        cell.setBackground('#D4EDDA');
        cell.setFontColor('#155724');
        cell.setFontWeight('bold');
      } else if (value === 'No') {
        cell.setBackground('#F8D7DA');
        cell.setFontColor('#721C24');
      }
    }
  }

  // — Event registration columns: light blue for Yes (columns 9-13) —
  var eventStartCol = 9;  // 'Breakfast 29'
  var eventEndCol = 13;   // 'Sunset 30'
  for (var row = 2; row <= numRows; row++) {
    for (var col = eventStartCol; col <= eventEndCol; col++) {
      var cell = sheet.getRange(row, col);
      if (cell.getValue() === 'Yes') {
        cell.setBackground('#D1ECF1');
        cell.setFontColor('#0C5460');
      }
    }
  }

  // — Center-align Yes/No columns (9-18) and Sponsor Consent (19) —
  sheet.getRange(2, 9, dataRowCount, 11).setHorizontalAlignment('center');

  // — Light borders on all data —
  var fullRange = sheet.getRange(1, 1, numRows, numCols);
  fullRange.setBorder(true, true, true, true, true, true, '#DEE2E6', SpreadsheetApp.BorderStyle.SOLID);

  // — Auto-resize columns —
  for (var col = 1; col <= numCols; col++) {
    sheet.autoResizeColumn(col);
  }
}

/**
 * Converts an ISO 8601 timestamp to dd/MM/yyyy HH:mm (Europe/Madrid).
 */
function formatTimestamp(isoString) {
  var date = new Date(isoString);
  return Utilities.formatDate(date, 'Europe/Madrid', 'dd/MM/yyyy HH:mm');
}

/**
 * Run this function ONCE manually to install the 5-minute fallback sync trigger.
 * It removes any existing triggers for syncFromSupabase first to avoid duplicates.
 */
function installTrigger() {
  // Remove existing triggers for this function
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'syncFromSupabase') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('syncFromSupabase')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Trigger installed: syncFromSupabase will run every 5 minutes as fallback.');
}
