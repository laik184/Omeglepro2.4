import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/ChatRoom.css';

import { useSocketConnection } from '../features/textChat/useSocketConnection.js';
import { createMessageHandlers } from '../features/textChat/useMessageHandling.js';
import { useTypingIndicator } from '../features/textChat/useTypingIndicator.js';
import { createMatchControls } from '../features/textChat/useMatchControls.js';
import { createFeedbackHandler } from '../features/textChat/useFeedback.js';
import { createReportHandler } from '../features/textChat/useReport.js';
import { createKeyboardHandlers } from '../features/textChat/useKeyboardHandlers.js';

function TextChat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSearching, setIsSearching] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [strangerTyping, setStrangerTyping] = useState(false);
  const [showConnectedMsg, setShowConnectedMsg] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [deliveredMessages, setDeliveredMessages] = useState(new Set());
  
  const navigate = useNavigate();

  const socketRef = useSocketConnection({
    onUserCount: (count) => setOnlineCount(count),
    
    onSearching: () => {
      setIsSearching(true);
      setIsConnected(false);
    },
    
    onMatched: () => {
      setIsSearching(false);
      setIsConnected(true);
      setShowConnectedMsg(true);
      setTimeout(() => setShowConnectedMsg(false), 6000);
    },
    
    onReceiveMessage: (data) => {
      setMessages(prev => [...prev, { text: data.text, sender: 'stranger' }]);
      setStrangerTyping(false);
    },
    
    onStrangerTyping: () => setStrangerTyping(true),
    onStrangerStopTyping: () => setStrangerTyping(false),
    
    onStrangerDisconnected: () => {
      setMessages(prev => [...prev, { text: 'Stranger has disconnected.', sender: 'system' }]);
      setIsConnected(false);
      setIsSearching(false);
      setStrangerTyping(false);
    },
    
    onYouDisconnected: () => {
      setMessages(prev => [...prev, { text: 'You have disconnected.', sender: 'system' }]);
      setIsConnected(false);
      setIsSearching(false);
      setStrangerTyping(false);
    },
    
    onBlocked: (data) => {
      alert(data.message);
      navigate('/chat');
    },
    
    onFeedbackReceived: (data) => {
      setMessages(prev => [...prev, { text: data.message, sender: 'system' }]);
    },
    
    onReportSuccess: (data) => {
      setMessages(prev => [...prev, { text: data.message, sender: 'system' }]);
      if (data.blocked) {
        setMessages(prev => [...prev, { text: 'The reported user has been automatically blocked.', sender: 'system' }]);
      }
    },
    
    onReportFailed: (data) => {
      alert(data.message);
    },
    
    onMessageDelivered: (data) => {
      setDeliveredMessages(prev => new Set(prev).add(data.messageId));
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, delivered: true } : msg
      ));
      console.log('Message delivered:', data.messageId);
    },
    
    onMessageRateLimited: (data) => {
      console.warn('Rate limited:', data.message);
      setMessages(prev => [...prev, { 
        text: '⚠️ ' + data.message, 
        sender: 'system' 
      }]);
    },
    
    onConnectionError: (data) => {
      console.error('Connection error:', data);
      setMessages(prev => [...prev, { text: 'Connection error. Reconnecting...', sender: 'system' }]);
    },
    
    onConnectError: (error) => {
      setMessages(prev => [...prev, { text: 'Failed to connect. Please check your internet connection.', sender: 'system' }]);
    },
    
    onReconnect: (attemptNumber) => {
      setMessages(prev => [...prev, { text: 'Reconnected successfully!', sender: 'system' }]);
    }
  });

  const { handleTypingStart, typingTimeoutRef } = useTypingIndicator(socketRef, isConnected);
  
  const { handleSendMessage: sendMessage } = createMessageHandlers(socketRef, isConnected, setMessages);
  
  const { handleNewOrSkip } = createMatchControls(
    socketRef,
    isConnected,
    isSearching,
    setMessages,
    setIsSearching,
    setIsConnected,
    setStrangerTyping
  );
  
  const { handleFeedbackSubmit: submitFeedback } = createFeedbackHandler(
    socketRef,
    setFeedback,
    setShowFeedbackModal
  );
  
  const { handleReportSubmit: submitReport } = createReportHandler(
    socketRef,
    isConnected,
    setReportReason,
    setShowReportModal
  );

  const handleSendMessage = () => {
    if (sendMessage(message)) {
      setMessage('');
    }
  };

  const { handleKeyDown } = createKeyboardHandlers(handleSendMessage);

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    handleTypingStart(e.target.value.length > 0);
  };

  const handleExit = () => navigate('/chat');

  return (
    <div className="chat-room">
      <header className="chat-header">
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
        <div className="online-status">
          <span className="eye-icon">👁</span> {onlineCount} online
        </div>
      </header>

      <div className="messages-container">
        {showConnectedMsg && (
          <div className="connected-message">Connected! You can now start chatting.</div>
        )}
        {isSearching ? (
          <div className="searching-message">
            <span className="connecting-text">Connecting</span>
            <span className="connecting-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </span>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.sender}`}>
                {msg.sender === 'stranger' && <strong>Stranger: </strong>}
                {msg.sender === 'you' && <strong>You: </strong>}
                {msg.text}
                {msg.sender === 'you' && msg.delivered && <span className="delivery-check"> ✓</span>}
              </div>
            ))}
            {strangerTyping && (
              <div className="typing-indicator">
                <strong>Stranger is typing</strong>
                <span className="typing-dots">
                  <span>.</span><span>.</span><span>.</span>
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="chat-input-section">
        <button className="add-btn-chat">+</button>
        <input
          type="text"
          className="message-input"
          placeholder={isConnected ? "Type your message..." : "Waiting for connection..."}
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          disabled={!isConnected}
        />
        <button className="send-btn" onClick={handleSendMessage} disabled={!isConnected}>
          ➤
        </button>
        <button className={`new-btn ${isConnected ? 'skip-btn' : ''}`} onClick={handleNewOrSkip}>
          {isConnected ? '⏭ Skip' : isSearching ? '⏹ Stop' : '🔄 New'}
        </button>
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
              <button className="modal-btn submit-btn" onClick={() => submitFeedback(feedback)}>
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
              <button className="modal-btn submit-btn" onClick={() => submitReport(reportReason)} disabled={!reportReason}>
                Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TextChat;
