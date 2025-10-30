export function submitFeedback(socket, feedback, setFeedback, setShowModal) {
  if (feedback.trim() && socket) {
    socket.emit('submit-feedback', { feedback });
    setFeedback('');
    setShowModal(false);
    alert('Thank you for your feedback!');
  }
}
