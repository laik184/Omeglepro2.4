import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/VideoRoom.css';

import { initializeCamera, cleanupCamera } from '../features/videoChat/initializeCamera.js';
import { setupSocketConnection, cleanupSocket } from '../features/videoChat/socketHandlers.js';
import { createPeerConnectionManager } from '../features/videoChat/peerConnectionManager.js';
import { setupMessageHandlers } from '../features/videoChat/handleMessages.js';
import { handleSkipNew } from '../features/videoChat/handleSkipNew.js';
import { submitFeedback } from '../features/videoChat/handleFeedback.js';
import { submitReport } from '../features/videoChat/handleReport.js';

function VideoChat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSearching, setIsSearching] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [videoQuality, setVideoQuality] = useState('high');
  const [moderationWarning, setModerationWarning] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [showConnectedMsg, setShowConnectedMsg] = useState(false);
  
  const navigate = useNavigate();
  const userVideoRef = useRef(null);
  const strangerVideoRef = useRef(null);
  const userPreviewRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const qualityManagerRef = useRef(null);
  const videoModeratorRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const connectionRetryCountRef = useRef(0);
  const currentStrangerIdRef = useRef(null);
  const isConnectedRef = useRef(false);
  const isSearchingRef = useRef(true);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    isSearchingRef.current = isSearching;
  }, [isSearching]);

  function handleNewOrSkipClick() {
    handleSkipNew(
      isConnectedRef.current,
      isSearchingRef.current,
      socketRef,
      qualityManagerRef,
      videoModeratorRef,
      typingTimeoutRef,
      setMessages,
      setIsSearching,
      setIsConnected,
      setIsTyping,
      setModerationWarning
    );
  }

  function handleFeedbackSubmit() {
    submitFeedback(
      feedback,
      socketRef,
      setFeedback,
      setShowFeedbackModal
    );
  }

  function handleReportSubmit() {
    submitReport(
      reportReason,
      isConnected,
      socketRef,
      setReportReason,
      setShowReportModal
    );
  }

  const handleExit = () => navigate('/chat');

  useEffect(() => {
    initializeCamera(
      streamRef,
      userVideoRef,
      userPreviewRef,
      qualityManagerRef,
      videoModeratorRef,
      setCameraError,
      navigate
    );

    return () => {
      cleanupCamera(
        streamRef,
        peerRef,
        qualityManagerRef,
        videoModeratorRef
      );
    };
  }, []);

  useEffect(() => {
    const createPeerConnection = createPeerConnectionManager({
      socketRef,
      peerRef,
      streamRef,
      strangerVideoRef,
      qualityManagerRef,
      videoModeratorRef,
      connectionTimeoutRef,
      currentStrangerIdRef,
      connectionRetryCountRef,
      setMessages,
      setVideoQuality,
      setModerationWarning,
      onHandleNewOrSkip: handleNewOrSkipClick
    });

    setupSocketConnection({
      socketRef,
      peerRef,
      streamRef,
      strangerVideoRef,
      qualityManagerRef,
      videoModeratorRef,
      connectionTimeoutRef,
      typingTimeoutRef,
      currentStrangerIdRef,
      setOnlineCount,
      setIsSearching,
      setIsConnected,
      setIsTyping,
      setMessages,
      setShowConnectedMsg,
      setVideoQuality,
      setModerationWarning,
      onCreatePeerConnection: createPeerConnection,
      onHandleNewOrSkip: handleNewOrSkipClick,
      navigate
    });

    return () => {
      cleanupSocket(socketRef, peerRef, typingTimeoutRef, setIsTyping);
    };
  }, [navigate]);

  const { handleTyping, handleSendMessage, handleKeyDown } = setupMessageHandlers(
    socketRef,
    isConnected,
    setMessages,
    setMessage,
    typingTimeoutRef
  );

  if (cameraError) {
    return (
      <div className="video-chat-room">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#1a1a2e',
          color: '#fff',
          textAlign: 'center',
          padding: '20px'
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '20px'
          }}>📹❌</div>
          <h2 style={{ marginBottom: '20px' }}>Camera Access Required</h2>
          <p style={{ 
            maxWidth: '500px', 
            marginBottom: '30px',
            fontSize: '16px',
            lineHeight: '1.5'
          }}>{cameraError}</p>
          <p style={{ opacity: 0.7 }}>Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-chat-room">
      <header className="video-header">
        <div className="header-left">
          <button className="exit-btn" onClick={handleExit}>
            ← Exit
          </button>
          <div className="menu-container">
            <button className="menu-btn" onClick={() => setShowMenu(!showMenu)}>
              ⋮
            </button>
            {showMenu && (
              <div className="dropdown-menu">
                <button className="menu-item" onClick={() => { setShowFeedbackModal(true); setShowMenu(false); }}>
                  📝 Feedback
                </button>
                <button className="menu-item" onClick={() => { setShowReportModal(true); setShowMenu(false); }}>
                  🚩 Report
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="header-center">
          <img src="/assets/logo.png" alt="Logo" className="header-logo" />
          <div className="header-info">
            <h1 className="header-title">omegle.com</h1>
            <p className="header-tagline">Talk to strangers!</p>
          </div>
        </div>
        <div className="header-right">
          <div className="quality-indicator">
            {videoQuality === 'high' && '🟢 HD'}
            {videoQuality === 'medium' && '🟡 SD'}
            {videoQuality === 'low' && '🔴 Low'}
          </div>
          <div className="online-status">
            <span className="eye-icon">👁</span> {onlineCount} online
          </div>
        </div>
      </header>

      {moderationWarning && (
        <div className="moderation-alert">
          ⚠️ Content Warning: {moderationWarning.reason} (Violations: {moderationWarning.violationCount})
          {moderationWarning.shouldBlock && ' - Auto-skipping...'}
        </div>
      )}

      <div className="video-section">
        <div className="stranger-video">
          {isSearching ? (
            <div className="video-placeholder">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <video 
              ref={strangerVideoRef}
              autoPlay 
              playsInline
              className="stranger-video-element"
            />
          )}
          <div className="video-label">Stranger</div>
        </div>
        
        <div className="user-video">
          <video 
            ref={userVideoRef}
            autoPlay 
            muted 
            playsInline
            className="user-video-element"
          />
          <div className="video-label">You</div>
        </div>

        <div className="user-preview">
          <video 
            ref={userPreviewRef}
            autoPlay 
            muted 
            playsInline
            className="preview-video-element"
          />
        </div>
      </div>

      <div className="video-chat-bottom">
        {isSearching && (
          <div className="searching-messages">
            <div className="connecting-indicator">
              <span className="connecting-text">Connecting</span>
              <span className="connecting-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </span>
            </div>
          </div>
        )}

        {showConnectedMsg && !isSearching && (
          <div className="connected-message">
            <div className="connected-text">
              ✅ Connected! You can now start video.
            </div>
          </div>
        )}

        {!isSearching && (messages.length > 0 || isTyping) && (
          <div className="video-messages-container">
            {messages.map((msg, idx) => (
              <div key={idx} className={`video-message ${msg.sender}`}>
                {msg.sender === 'stranger' && <strong>Stranger: </strong>}
                {msg.sender === 'you' && <strong>You: </strong>}
                {msg.text}
              </div>
            ))}
            {isTyping && (
              <div className="video-message stranger typing-indicator">
                <strong>Stranger: </strong>
                <span className="typing-dots">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </span>
              </div>
            )}
          </div>
        )}
        
        <div className="video-input-section">
          <input
            type="text"
            className="video-message-input"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, message)}
          />
          <button className="video-send-btn" onClick={() => handleSendMessage(message)} disabled={!isConnected}>
            ➤
          </button>
          <button className="video-new-btn" onClick={handleNewOrSkipClick}>
            {isConnected ? '⏭ Skip' : isSearching ? '⏹ Stop' : '🔄 New'}
          </button>
        </div>
      </div>

      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">📝 Send Feedback</h2>
            <div className="modal-body">
              <textarea
                className="feedback-textarea"
                placeholder="Share your thoughts, suggestions, or report bugs..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows="6"
              />
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel-btn" onClick={() => setShowFeedbackModal(false)}>
                Cancel
              </button>
              <button className="modal-btn submit-btn" onClick={handleFeedbackSubmit}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">🚩 Report User</h2>
            <div className="modal-body">
              <p className="modal-text">Why are you reporting this user?</p>
              <select 
                className="report-select"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                <option value="">Select a reason...</option>
                <option value="Inappropriate content">Inappropriate content</option>
                <option value="Harassment">Harassment</option>
                <option value="Spam">Spam</option>
                <option value="Underage user">Underage user</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel-btn" onClick={() => setShowReportModal(false)}>
                Cancel
              </button>
              <button className="modal-btn submit-btn" onClick={handleReportSubmit} disabled={!reportReason}>
                Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoChat;
