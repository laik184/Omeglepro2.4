// ✅ handleFeedback.js — Final Optimized Version
export function submitFeedback(
  feedback,
  socketRef,
  setFeedback,
  setShowFeedbackModal,
  showToast // optional callback for UI message
) {
  const socket = socketRef?.current;

  if (!feedback.trim()) {
    showToast?.("⚠️ Please enter your feedback before submitting!");
    return;
  }

  if (!socket) {
    showToast?.("❌ Connection error — unable to send feedback.");
    return;
  }

  try {
    socket.emit("submit-feedback", { feedback });
    console.log("[Feedback] Sent:", feedback);

    // Optional acknowledgment listener
    socket.once("feedback-confirmed", () => {
      showToast?.("✅ Thank you! Your feedback was received.");
    });

    // Reset UI state
    setFeedback("");
    setShowFeedbackModal(false);
  } catch (err) {
    console.error("[Feedback] Error sending feedback:", err);
    showToast?.("❌ Failed to send feedback. Please try again.");
  }
}
