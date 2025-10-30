import socketState from '../socketState.js';
import { sendReportEmail } from '../helpers/emailService.js';

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
    
    if (!socketState.getIPReport(reportedIP)) {
      socketState.initializeIPReport(reportedIP);
    }
    
    const reportData = socketState.getIPReport(reportedIP);
    
    if (reportData.reporters.has(reporterIP)) {
      socket.emit('report-failed', { message: 'You have already reported this user.' });
      return;
    }
    
    reportData.reporters.add(reporterIP);
    reportData.count += 1;
    reportData.reasons.push(data.reportReason || 'No reason provided');
    socketState.setReportCooldown(socket.id, now);
    
    console.log(`User ${partnerId} (${reportedIP}) reported by ${socket.id} (${reporterIP}). Total unique reports: ${reportData.count}`);
    
    await sendReportEmail(reportedIP, data.reportReason, reportData.count);
    
    if (reportData.count >= 4 && !socketState.isIPBlocked(reportedIP)) {
      socketState.blockIP(reportedIP);
      console.log(`IP ${reportedIP} has been blocked after ${reportData.count} unique reports`);
      
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
