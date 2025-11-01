// ✅ handleReport.js — Final Optimized Version
export function submitReport(
  reportReason,
  isConnected,
  socketRef,
  setReportReason,
  setShowReportModal,
  showToast // optional callback for UI feedback
) {
  const socket = socketRef?.current;

  // 🧠 Validate input
  if (!reportReason.trim() || reportReason.trim().length < 5) {
    showToast?.("⚠️ Please provide a valid reason (min 5 characters).");
    return;
  }

  if (!isConnected || !socket) {
    showToast?.("❌ Cannot submit report — connection lost.");
    return;
  }

  try {
    socket.emit("report-user", { reportReason });
    console.log("[Report] Sent:", reportReason);

    // ✅ Optional server acknowledgment
    socket.once("report-confirmed", () => {
      showToast?.("✅ Report received. Thank you for helping keep the platform safe.");
    });

    // 🧹 Reset UI state
    setReportReason("");
    setShowReportModal(false);
  } catch (err) {
    console.error("[Report] Error:", err);
    showToast?.("❌ Failed to submit report. Please try again later.");
  }
}
