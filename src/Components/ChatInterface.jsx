import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/ChatInterface.css';

function ChatInterface() {
  const [interestInput, setInterestInput] = useState('');
  const [interests, setInterests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [chatType, setChatType] = useState('');
  const [isCollegeMode, setIsCollegeMode] = useState(false);
  const [collegeEmail, setCollegeEmail] = useState('');
  const [showCollegeVerification, setShowCollegeVerification] = useState(false);
  const navigate = useNavigate();

  const handleAddInterest = () => {
    if (interestInput.trim() && interests.length < 10) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (indexToRemove) => {
    setInterests(interests.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddInterest();
    }
  };

  const handleStartChat = () => {
    if (isCollegeMode && !collegeEmail.endsWith('.edu')) {
      setShowCollegeVerification(true);
      return;
    }
    setChatType('text');
    setShowModal(true);
  };

  const handleVideoChat = () => {
    if (isCollegeMode && !collegeEmail.endsWith('.edu')) {
      setShowCollegeVerification(true);
      return;
    }
    setChatType('video');
    setShowModal(true);
  };

  const handleAgree = () => {
    setShowModal(false);
    const chatState = {
      interests,
      isCollegeMode,
      collegeEmail: isCollegeMode ? collegeEmail : null
    };
    
    if (chatType === 'video') {
      navigate('/video', { state: chatState });
    } else {
      navigate('/chatroom', { state: chatState });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowCollegeVerification(false);
  };

  return (
    <div className="chat-interface">
      <header className="chat-header">
        <div className="header-center">
          <img src="/assets/logo.png" alt="Logo" className="header-logo" />
          <div className="header-info">
            <h1 className="header-title">omegle.com</h1>
            <p className="header-tagline">Talk to strangers!</p>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="info-card card--red">
          <h4 className="feature-title">⚠️ Important Notice</h4>
          <p className="card-text">By using Omegle, you accept the terms at the bottom. You must be 18+ or 13+ with parental permission.</p>
        </div>

        <div className="info-card card--blue">
          <h4 className="feature-title">📱 Mobile Video Chat</h4>
          <p className="card-text">Mobile video chat is an experimental new feature.</p>
          <p className="card-text">📹 Video is monitored, so keep it clean!</p>
          <p className="card-text">Go to <span className="link-text">an adult site</span> instead if that's what you want.</p>
        </div>

        <div className="info-card card--purple">
          <div className="chat-buttons">
            <button className="chat-btn start-chat-btn" onClick={handleStartChat}>
              {isCollegeMode ? '🎓 START COLLEGE CHAT' : 'START A CHAT'}
            </button>
            <button className="chat-btn video-btn" onClick={handleVideoChat}>
              VIDEO
            </button>
          </div>
        </div>

        <div className="info-card card--green">
          <h4 className="feature-title">🎯 Meet strangers with your interests!</h4>
          
          <div className="interests-input">
            <button className="add-btn" onClick={handleAddInterest}>+</button>
            <input 
              type="text" 
              placeholder="Add your interests (max 10)" 
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>

          {interests.length > 0 && (
            <div className="interests-tags">
              {interests.map((interest, index) => (
                <span key={index} className="interest-tag">
                  {interest}
                  <button 
                    className="remove-tag-btn" 
                    onClick={() => handleRemoveInterest(index)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="info-card card--college">
          <h4 className="feature-title">🎓 College Student Mode</h4>
          <p className="card-text">
            Connect with verified college students. Requires .edu email address.
          </p>
          
          <div className="college-mode-toggle">
            <label className="toggle-label">
              <input 
                type="checkbox" 
                checked={isCollegeMode}
                onChange={(e) => setIsCollegeMode(e.target.checked)}
              />
              <span className="toggle-text">Enable College Mode</span>
            </label>
          </div>

          {isCollegeMode && (
            <div className="college-email-input">
              <input 
                type="email" 
                placeholder="Enter your .edu email address" 
                value={collegeEmail}
                onChange={(e) => setCollegeEmail(e.target.value)}
                className="email-input"
              />
              <p className="email-note">
                ℹ️ Your email is used for verification only and not stored.
              </p>
            </div>
          )}
        </div>

      </main>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">📋 Terms & Conditions</h2>
            <div className="modal-body">
              <p className="modal-text">
                This site is for educational purposes and content creators only. You are responsible for anything you upload or share. Illegal or inappropriate actions are your liability. The site owner is not responsible for user actions. Use at your own risk.
              </p>
              {isCollegeMode && (
                <p className="modal-text college-terms">
                  🎓 By using College Mode, you confirm that you are a verified college student with a valid .edu email address.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="agree-btn" onClick={handleAgree}>
                ✓ Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {showCollegeVerification && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">❌ Invalid Email</h2>
            <div className="modal-body">
              <p className="modal-text">
                College Mode requires a valid .edu email address. Please enter your college email or disable College Mode to continue.
              </p>
            </div>
            <div className="modal-footer">
              <button className="agree-btn" onClick={handleCloseModal}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatInterface;
