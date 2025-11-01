export function createReportHandler(
  socketRef,
  isConnected,
  setReportReason,
  setShowReportModal
) {
  const handleReportSubmit = (reportReason) => {
    if (reportReason.trim() && isConnected && socketRef.current) {
      socketRef.current.emit('report-user', { reportReason });
      setReportReason('');
      setShowReportModal(false);
      alert('Report submitted. Thank you for keeping our community safe.');
      return true;
    }
    return false;
  };

  return { handleReportSubmit };
}
