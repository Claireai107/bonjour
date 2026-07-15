/**
 * @template T
 * @param {Array<{date: string, result: T}> | undefined} reports
 * @param {T | null} latestResult
 * @returns {Array<{date: string, result: T}>}
 */
function buildReportHistory(reports, latestResult) {
  if (reports?.length) return [...reports].reverse();
  return latestResult ? [{ date: "", result: latestResult }] : [];
}

/** @param {number} selection @param {number} historyLength */
function clampReportSelection(selection, historyLength) {
  if (historyLength <= 0) return 0;
  return Math.max(0, Math.min(selection, historyLength - 1));
}

module.exports = { buildReportHistory, clampReportSelection };
