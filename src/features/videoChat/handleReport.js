export function submitReport(
  reportReason,
  isConnected,
  socketRef,
  setReportReason,
  setShowReportModal
) {
  if (reportReason.trim() && isConnected && socketRef.current) {
    socketRef.current.emit('report-user', { reportReason });
    setReportReason('');
    setShowReportModal(false);
    alert('Report submitted. Thank you for keeping our community safe.');
  }
}
