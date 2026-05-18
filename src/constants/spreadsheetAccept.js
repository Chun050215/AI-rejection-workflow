/** 檔案選擇器 accept（含 Numbers MIME，macOS 才會顯示 .numbers） */
export const SPREADSHEET_ACCEPT = [
  '.csv',
  '.txt',
  '.tsv',
  '.xlsx',
  '.xls',
  '.ods',
  '.numbers',
  'text/csv',
  'text/plain',
  'text/tab-separated-values',
  'application/vnd.apple.numbers',
  'application/x-iwork-numbers-sffnumbers',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument.spreadsheet',
].join(',');

export const NUMBERS_FILE_ACCEPT =
  '.numbers,application/vnd.apple.numbers,application/x-iwork-numbers-sffnumbers';
