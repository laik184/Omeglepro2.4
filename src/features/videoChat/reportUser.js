export function reportUser(socket, isConnected, reportReason, setReportReason, setShowModal) {
  if (reportReason.trim() && isConnected && socket) {
    socket.emit('report-user', { reportReason });
    setReportReason('');
    setShowModal(false);
    alert('Report submitted. Thank you for keeping our community safe.');
  }
}
