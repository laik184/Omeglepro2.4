// Feedback handler for text chat
export function createFeedbackHandler(socketRef, setFeedback, setShowModal) {
  const handleFeedbackSubmit = () => {
    if (!socketRef?.current) {
      console.warn("[Feedback] Socket not ready");
      return;
    }

    const feedbackText = typeof setFeedback === 'function' ? null : setFeedback;
    
    if (feedbackText && feedbackText.trim()) {
      socketRef.current.emit('submit-feedback', { feedback: feedbackText });
      if (typeof setFeedback === 'function') {
        setFeedback('');
      }
      if (typeof setShowModal === 'function') {
        setShowModal(false);
      }
      console.log("[Feedback] Submitted successfully");
    } else {
      console.warn("[Feedback] Empty feedback text");
    }
  };

  return { handleFeedbackSubmit };
}
