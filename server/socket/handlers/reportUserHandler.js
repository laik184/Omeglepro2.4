import socketState from '../socketState.js';
import { sendReportEmail } from '../helpers/emailService.js';
import database from '../../database/db.js';

export function reportUserHandler(socket, io) {
  return async (data) => {
    const reporterIP = socketState.getSocketIP(socket.id) || 'unknown';
    const pairings = socketState.getPairings();
    const partnerId = pairings.get(socket.id);
    
    if (!partnerId) {
      socket.emit('report-failed', { message: 'No active chat to report.' });
      return;
    }
    
    const now = Date.now();
    const lastReport = socketState.getReportCooldown(socket.id);
    if (lastReport && now - lastReport < 60000) {
      const waitTime = Math.ceil((60000 - (now - lastReport)) / 1000);
      socket.emit('report-failed', { message: `Please wait ${waitTime} seconds before reporting again.` });
      return;
    }
    
    const reportedIP = socketState.getSocketIP(partnerId);
    
    if (!reportedIP) {
      console.log('Could not find IP for reported user');
      return;
    }
    
    if (database.hasReportedIP(reporterIP, reportedIP)) {
      socket.emit('report-failed', { message: 'You have already reported this user.' });
      return;
    }
    
    const reportAdded = database.addReport(reportedIP, reporterIP, data.reportReason || 'No reason provided');
    
    if (!reportAdded) {
      socket.emit('report-failed', { message: 'Failed to submit report. Please try again.' });
      return;
    }
    
    socketState.setReportCooldown(socket.id, now);
    
    const reportCount = database.getReportCount(reportedIP);
    
    console.log(`User ${partnerId} (${reportedIP}) reported by ${socket.id} (${reporterIP}). Total unique reports: ${reportCount}`);
    
    await sendReportEmail(reportedIP, data.reportReason, reportCount);
    
    if (reportCount >= 4 && !database.isIPBlocked(reportedIP)) {
      database.blockIP(reportedIP, data.reportReason || 'Multiple user reports', reportCount);
      socketState.blockIP(reportedIP);
      
      console.log(`IP ${reportedIP} has been blocked after ${reportCount} unique reports`);
      
      const reportedSocket = io.sockets.sockets.get(partnerId);
      if (reportedSocket) {
        reportedSocket.emit('blocked', { 
          message: 'You have been blocked due to multiple reports.' 
        });
        reportedSocket.disconnect(true);
      }
      
      socket.emit('report-success', { 
        message: 'Report submitted. User has been blocked.',
        blocked: true 
      });
    } else {
      socket.emit('report-success', { 
        message: 'Report submitted. Thank you for keeping our community safe.',
        blocked: false 
      });
    }
  };
}
