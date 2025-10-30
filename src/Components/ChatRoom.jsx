import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import '../style/ChatRoom.css';

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
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  // FIX: Track message delivery status
  const [deliveredMessages, setDeliveredMessages] = useState(new Set());

  const handleSendMessage = () => {
    if (message.trim() && isConnected && socketRef.current) {
      // FIX: Generate unique messageId for delivery tracking
      const messageId = Date.now();
      setMessages(prev => [...prev, { text: message, sender: 'you', id: messageId, delivered: false }]);
      socketRef.current.emit('send-message', { message, messageId });
      socketRef.current.emit('stop-typing');
      setMessage('');
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    
    if (isConnected && socketRef.current && e.target.value.length > 0) {
      socketRef.current.emit('typing');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('stop-typing');
      }, 1000);
    } else if (socketRef.current) {
      socketRef.current.emit('stop-typing');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleExit = () => navigate('/chat');

  const handleNewOrSkip = () => {
    if (isConnected && socketRef.current) {
      socketRef.current.emit('skip-stranger');
      setMessages([]);
      setIsSearching(true);
      setIsConnected(false);
      setStrangerTyping(false);
    } else {
      setMessages([]);
      setIsSearching(true);
      setIsConnected(false);
      setStrangerTyping(false);
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
      const partnerId = socketRef.current.id;
      socketRef.current.emit('report-user', { reportReason });
      setReportReason('');
      setShowReportModal(false);
      alert('Report submitted. Thank you for keeping our community safe.');
    }
  };

  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.emit('join-room', 'text');

    socket.on('user-count', (count) => {
      setOnlineCount(count);
    });

    socket.on('searching', () => {
      setIsSearching(true);
      setIsConnected(false);
    });

    socket.on('matched', () => {
      setIsSearching(false);
      setIsConnected(true);
      setShowConnectedMsg(true);
      
      setTimeout(() => {
        setShowConnectedMsg(false);
      }, 6000);
    });

    socket.on('receive-message', (data) => {
      setMessages(prev => [...prev, { text: data.text, sender: 'stranger' }]);
      setStrangerTyping(false);
    });

    socket.on('stranger-typing', () => {
      setStrangerTyping(true);
    });

    socket.on('stranger-stop-typing', () => {
      setStrangerTyping(false);
    });

    socket.on('stranger-disconnected', () => {
      setMessages(prev => [...prev, { text: 'Stranger has disconnected.', sender: 'system' }]);
      setIsConnected(false);
      setIsSearching(false);
      setStrangerTyping(false);
    });

    socket.on('you-disconnected', () => {
      setMessages(prev => [...prev, { text: 'You have disconnected.', sender: 'system' }]);
      setIsConnected(false);
      setIsSearching(false);
      setStrangerTyping(false);
    });

    socket.on('blocked', (data) => {
      alert(data.message);
      navigate('/chat');
    });

    socket.on('feedback-received', (data) => {
      setMessages(prev => [...prev, { text: data.message, sender: 'system' }]);
    });

    socket.on('report-success', (data) => {
      setMessages(prev => [...prev, { text: data.message, sender: 'system' }]);
      if (data.blocked) {
        setMessages(prev => [...prev, { text: 'The reported user has been automatically blocked.', sender: 'system' }]);
      }
    });

    socket.on('report-failed', (data) => {
      alert(data.message);
    });

    // FIX: Handle message delivery acknowledgment
    socket.on('message-delivered', (data) => {
      setDeliveredMessages(prev => new Set(prev).add(data.messageId));
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, delivered: true } : msg
      ));
      console.log('Message delivered:', data.messageId);
    });

    // FIX: Handle rate limiting notification
    socket.on('message-rate-limited', (data) => {
      console.warn('Rate limited:', data.message);
      setMessages(prev => [...prev, { 
        text: '⚠️ ' + data.message, 
        sender: 'system' 
      }]);
    });

    socket.emit('start-matching');

    return () => {
      socket.emit('leave-room', 'text');
      socket.disconnect();
    };
  }, [navigate]);

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
          <div className="searching-message">Looking for someone you can chat with...</div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.sender}`}>
                {msg.sender === 'stranger' && <strong>Stranger: </strong>}
                {msg.sender === 'you' && <strong>You: </strong>}
                {msg.text}
                {/* FIX: Show delivery checkmark for sent messages */}
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
          {isConnected ? '⏭ Skip' : '● New'}
        </button>
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

export default TextChat;
