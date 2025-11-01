export function createFeedbackHandler(socketRef, setFeedback, setShowFeedbackModal) {
  const handleFeedbackSubmit = (feedback) => {
    if (feedback.trim() && socketRef.current) {
      socketRef.current.emit('submit-feedback', { feedback });
      setFeedback('');
      setShowFeedbackModal(false);
      alert('Thank you for your feedback!');
      return true;
    }
    return false;
  };

  return { handleFeedbackSubmit };
}
