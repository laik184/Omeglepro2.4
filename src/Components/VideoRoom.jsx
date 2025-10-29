import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import '../style/VideoRoom.css';
import { AdaptiveQualityManager } from '../service/adaptiveQuality.js';
import { VideoModerator } from '../service/videoModeration.js';

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
  const navigate = useNavigate();
  const userVideoRef = useRef(null);
  const strangerVideoRef = useRef(null);
  const userPreviewRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const qualityManagerRef = useRef(null);
  const videoModeratorRef = useRef(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }, 
          audio: true 
        });
        
        streamRef.current = stream;
        
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
        if (userPreviewRef.current) {
          userPreviewRef.current.srcObject = stream;
        }

        qualityManagerRef.current = new AdaptiveQualityManager();
        videoModeratorRef.current = new VideoModerator();
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Camera/microphone access required for video chat');
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      if (qualityManagerRef.current) {
        qualityManagerRef.current.stopMonitoring();
      }
      if (videoModeratorRef.current) {
        videoModeratorRef.current.stopMonitoring();
      }
    };
  }, []);

  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.emit('join-room', 'video');

    socket.on('user-count', (count) => {
      setOnlineCount(count);
    });

    socket.on('searching', () => {
      setIsSearching(true);
      setIsConnected(false);
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (strangerVideoRef.current) {
        strangerVideoRef.current.srcObject = null;
      }
    });

    socket.on('matched', (data) => {
      setIsSearching(false);
      setIsConnected(true);
      
      if (!streamRef.current) {
        console.error('No local stream available');
        return;
      }

      const isInitiator = socket.id > data.strangerId;

      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: true,
        stream: streamRef.current,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peer.on('signal', (signal) => {
        socket.emit('webrtc-signal', { signal });
      });

      peer.on('stream', (remoteStream) => {
        if (strangerVideoRef.current) {
          strangerVideoRef.current.srcObject = remoteStream;
          console.log('Received remote stream');

          if (qualityManagerRef.current && streamRef.current) {
            qualityManagerRef.current.monitorConnectionQuality(
              peer._pc,
              streamRef.current,
              (quality) => {
                setVideoQuality(quality);
                console.log(`Video quality adjusted to: ${quality}`);
              }
            );
          }

          if (videoModeratorRef.current) {
            setTimeout(() => {
              videoModeratorRef.current.startMonitoring(
                strangerVideoRef.current,
                (violation) => {
                  setModerationWarning(violation);
                  console.warn('Content moderation violation:', violation);
                  
                  if (violation.shouldBlock && socketRef.current) {
                    socketRef.current.emit('report-user', { 
                      reportReason: `Automated: ${violation.reason}` 
                    });
                    handleNewOrSkip();
                  }
                },
                false
              );
            }, 2000);
          }
        }
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
      });

      peer.on('close', () => {
        console.log('Peer connection closed');
      });

      peerRef.current = peer;
      console.log(`WebRTC peer created. I am ${isInitiator ? 'initiator' : 'responder'}`);
    });

    socket.on('webrtc-signal', (data) => {
      if (peerRef.current) {
        try {
          peerRef.current.signal(data.signal);
        } catch (err) {
          console.error('Error signaling peer:', err);
        }
      } else {
        console.warn('Received WebRTC signal but no peer exists');
      }
    });

    socket.on('receive-message', (data) => {
      setMessages(prev => [...prev, { text: data.text, sender: 'stranger' }]);
    });

    socket.on('stranger-disconnected', () => {
      setMessages(prev => [...prev, { text: 'Stranger has disconnected.', sender: 'system' }]);
      setIsConnected(false);
      setIsSearching(false);
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (strangerVideoRef.current) {
        strangerVideoRef.current.srcObject = null;
      }
      if (qualityManagerRef.current) {
        qualityManagerRef.current.stopMonitoring();
      }
      if (videoModeratorRef.current) {
        videoModeratorRef.current.stopMonitoring();
        setModerationWarning(null);
      }
    });

    socket.on('you-disconnected', () => {
      setMessages(prev => [...prev, { text: 'You have disconnected.', sender: 'system' }]);
      setIsConnected(false);
      setIsSearching(false);
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (strangerVideoRef.current) {
        strangerVideoRef.current.srcObject = null;
      }
      if (qualityManagerRef.current) {
        qualityManagerRef.current.stopMonitoring();
      }
      if (videoModeratorRef.current) {
        videoModeratorRef.current.stopMonitoring();
        setModerationWarning(null);
      }
    });

    socket.on('blocked', (data) => {
      alert(data.message);
      navigate('/chat');
    });

    socket.on('report-success', (data) => {
      alert(data.message);
    });

    socket.on('report-failed', (data) => {
      alert(data.message);
    });

    socket.emit('start-matching');

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      socket.emit('leave-room', 'video');
      socket.disconnect();
    };
  }, [navigate]);

  const handleExit = () => navigate('/chat');
  
  const handleSendMessage = () => {
    if (message.trim() && isConnected && socketRef.current) {
      setMessages(prev => [...prev, { text: message, sender: 'you' }]);
      socketRef.current.emit('send-message', { message });
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewOrSkip = () => {
    if (qualityManagerRef.current) {
      qualityManagerRef.current.stopMonitoring();
    }
    if (videoModeratorRef.current) {
      videoModeratorRef.current.stopMonitoring();
      setModerationWarning(null);
    }

    if (isConnected && socketRef.current) {
      socketRef.current.emit('skip-stranger');
      setMessages([]);
      setIsSearching(true);
      setIsConnected(false);
    } else {
      setMessages([]);
      setIsSearching(true);
      setIsConnected(false);
      if (socketRef.current) {
        socketRef.current.emit('start-matching');
      }
    }
  };

  const handleFeedbackSubmit = () => {
    if (feedback.trim() && socketRef.current) {
      socketRef.current.emit('submit-feedback', { feedback });
      setFeedback('');
      setShowFeedbackModal(false);
      alert('Thank you for your feedback!');
    }
  };

  const handleReportSubmit = () => {
    if (reportReason.trim() && isConnected && socketRef.current) {
      socketRef.current.emit('report-user', { reportReason });
      setReportReason('');
      setShowReportModal(false);
      alert('Report submitted. Thank you for keeping our community safe.');
    }
  };

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
            <div className="searching-message">Looking for people online</div>
            <div className="searching-message">Looking for people online</div>
          </div>
        )}

        {!isSearching && messages.length > 0 && (
          <div className="video-messages-container">
            {messages.map((msg, idx) => (
              <div key={idx} className={`video-message ${msg.sender}`}>
                {msg.sender === 'stranger' && <strong>Stranger: </strong>}
                {msg.sender === 'you' && <strong>You: </strong>}
                {msg.text}
              </div>
            ))}
          </div>
        )}
        
        <div className="video-input-section">
          <input
            type="text"
            className="video-message-input"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="video-send-btn" onClick={handleSendMessage} disabled={!isConnected}>
            ➤
          </button>
          <button className="video-new-btn" onClick={handleNewOrSkip}>
            {isConnected ? '⏭ Skip' : '● New'}
          </button>
        </div>
      </div>

      {/* Feedback Modal */}
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

      {/* Report Modal */}
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
