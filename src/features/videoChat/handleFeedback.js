export function submitFeedback(
  feedback,
  socketRef,
  setFeedback,
  setShowFeedbackModal
) {
  if (feedback.trim() && socketRef.current) {
    socketRef.current.emit('submit-feedback', { feedback });
    setFeedback('');
    setShowFeedbackModal(false);
    alert('Thank you for your feedback!');
  }
}
