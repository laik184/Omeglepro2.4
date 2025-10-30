import socketState from '../socketState.js';
import { sendFeedbackEmail } from '../helpers/emailService.js';

export function submitFeedbackHandler(socket, io) {
  return async (data) => {
    const userIP = socketState.getSocketIP(socket.id) || 'unknown';
    const feedback = data.feedback;
    
    console.log(`Feedback received from ${socket.id} (${userIP}): ${feedback}`);
    
    await sendFeedbackEmail(feedback, userIP);
    socket.emit('feedback-received', { message: 'Thank you for your feedback!' });
  };
}
