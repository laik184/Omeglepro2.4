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

  useEffect(() => {
    const startCamera = async () => {
      const isSecure = window.location.protocol === 'https:';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (!isSecure && !isLocalhost) {
        const httpsError = 'WebRTC requires HTTPS connection. Please access this site via HTTPS.';
        console.error(httpsError);
        setCameraError(httpsError);
        alert(httpsError);
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const browserError = 'Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Edge.';
        console.error(browserError);
        setCameraError(browserError);
        alert(browserError);
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      try {
        console.log('Requesting camera and microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }, 
          audio: true 
        });
        
        console.log('Camera access granted. Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
        streamRef.current = stream;
        
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
        if (userPreviewRef.current) {
          userPreviewRef.current.srcObject = stream;
        }

        qualityManagerRef.current = new AdaptiveQualityManager();
        videoModeratorRef.current = new VideoModerator();
        console.log('Camera initialized successfully');
      } catch (error) {
        console.error('Camera initialization failed:', error.name, error.message);
        
        let errorMessage = 'Unable to access camera and microphone.';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Camera and microphone access was denied. Please allow permissions in your browser settings and refresh the page.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera or microphone found. Please connect a camera and microphone to use video chat.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera or microphone is already in use by another application. Please close other apps and try again.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Your camera does not support the requested video quality. Trying lower quality...';
        } else if (error.name === 'TypeError') {
          errorMessage = 'Camera access blocked. Make sure you are using HTTPS or localhost.';
        }
        
        setCameraError(errorMessage);
        alert(errorMessage);
        
        setTimeout(() => {
          navigate('/');
        }, 2000);
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
    const socketConfig = {
      transports: ['websocket', 'polling'],
      secure: window.location.protocol === 'https:',
      rejectUnauthorized: false
    };
    
    const socket = io("http://localhost:5000", socketConfig); 
    socketRef.current = socket;

    socket.emit('join-room', 'video');

    socket.on('user-count', (count) => {
      setOnlineCount(count);
    });

    socket.on('searching', () => {
      setIsSearching(true);
      setIsConnected(false);
      setIsTyping(false);
      currentStrangerIdRef.current = null;
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      
      if (strangerVideoRef.current) {
        strangerVideoRef.current.srcObject = null;
      }
    });

    const createPeerConnection = (strangerId, retryCount = 0) => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }

      if (!streamRef.current) {
        console.error('No local stream available');
        return;
      }

      const tracks = streamRef.current.getTracks();
      if (!tracks || tracks.length === 0) {
        console.error('Stream has no tracks available');
        return;
      }
      console.log(`Local stream has ${tracks.length} tracks:`, tracks.map(t => `${t.kind} (${t.label})`));

      const isInitiator = socket.id > strangerId;
      
      const iceServerSets = [
        [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      ];

      const currentIceServers = iceServerSets[Math.min(retryCount, iceServerSets.length - 1)];
      console.log(`Creating peer connection (attempt ${retryCount + 1}) with ICE servers:`, currentIceServers);

      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: true,
        stream: streamRef.current,
        config: {
          iceServers: currentIceServers,
          iceTransportPolicy: 'all',
          iceCandidatePoolSize: 10
        }
      });

      let isConnected = false;

      connectionTimeoutRef.current = setTimeout(() => {
        if (!isConnected && peerRef.current === peer) {
          console.warn('Peer connection timeout after 10 seconds');
          
          if (retryCount < 2) {
            console.log(`Retrying connection (attempt ${retryCount + 2})...`);
            
            peer.destroy();
            peerRef.current = null;
            
            setTimeout(() => {
              if (currentStrangerIdRef.current === strangerId) {
                createPeerConnection(strangerId, retryCount + 1);
              }
            }, 1000);
          } else {
            setMessages(prev => [...prev, { 
              text: 'Unable to establish video connection. Finding new partner...', 
              sender: 'system' 
            }]);
            peer.destroy();
            peerRef.current = null;
            
            if (socketRef.current) {
              socketRef.current.emit('skip-stranger');
            }
          }
        }
      }, 10000);

      peer.on('signal', (signal) => {
        socket.emit('webrtc-signal', { signal });
      });

      peer.on('connect', () => {
        isConnected = true;
        console.log('Peer connection established successfully');
        connectionRetryCountRef.current = 0;
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      });

      peer.on('stream', (remoteStream) => {
        isConnected = true;
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
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
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      });

      peerRef.current = peer;
      connectionRetryCountRef.current = retryCount;
      console.log(`WebRTC peer created. I am ${isInitiator ? 'initiator' : 'responder'}`);
    };

    socket.on('matched', (data) => {
      setIsSearching(false);
      setIsConnected(true);
      setShowConnectedMsg(true);
      currentStrangerIdRef.current = data.strangerId;
      connectionRetryCountRef.current = 0;
      
      setTimeout(() => {
        setShowConnectedMsg(false);
      }, 6000);
      
      createPeerConnection(data.strangerId, 0);
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

    socket.on('stranger-typing', () => {
      setIsTyping(true);
    });

    socket.on('stranger-stop-typing', () => {
      setIsTyping(false);
    });

    socket.on('stranger-disconnected', () => {
      setMessages(prev => [...prev, { text: 'Stranger has disconnected.', sender: 'system' }]);
      setIsConnected(false);
      setIsSearching(false);
      setIsTyping(false);
      currentStrangerIdRef.current = null;
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      
      if (strangerVideoRef.current && strangerVideoRef.current.srcObject) {
        const stream = strangerVideoRef.current.srcObject;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped remote media track:', track.kind);
        });
        strangerVideoRef.current.srcObject = null;
        console.log('Remote video element cleaned up and all tracks stopped');
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
      setIsTyping(false);
      currentStrangerIdRef.current = null;
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      
      if (strangerVideoRef.current && strangerVideoRef.current.srcObject) {
        const stream = strangerVideoRef.current.srcObject;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped remote media track:', track.kind);
        });
        strangerVideoRef.current.srcObject = null;
        console.log('Remote video element cleaned up and all tracks stopped');
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

    socket.on('webrtc-error', (data) => {
      console.error('WebRTC error:', data);
      
      if (data.code === 'PARTNER_DISCONNECTED') {
        setMessages(prev => [...prev, { text: 'Partner disconnected during connection.', sender: 'system' }]);
        setIsConnected(false);
        setIsSearching(false);
        
        if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
        }
        if (strangerVideoRef.current && strangerVideoRef.current.srcObject) {
          const stream = strangerVideoRef.current.srcObject;
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped remote media track on error:', track.kind);
          });
          strangerVideoRef.current.srcObject = null;
        }
      } else if (data.code === 'NO_PARTNER') {
        console.warn('Attempted to send signal without partner');
      } else {
        setMessages(prev => [...prev, { text: 'Connection error occurred. Please try again.', sender: 'system' }]);
      }
    });

    socket.on('connection-error', (data) => {
      console.error('Connection error:', data);
      setMessages(prev => [...prev, { text: 'Connection error. Reconnecting...', sender: 'system' }]);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setMessages(prev => [...prev, { text: 'Failed to connect. Please check your internet connection.', sender: 'system' }]);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      setMessages(prev => [...prev, { text: 'Reconnected successfully!', sender: 'system' }]);
    });

    const waitForStreamAndMatch = () => {
      if (streamRef.current && streamRef.current.getTracks().length > 0) {
        console.log('Camera ready, starting matching with tracks:', streamRef.current.getTracks().map(t => t.kind));
        socket.emit('start-matching');
      } else {
        console.log('Waiting for camera stream to be ready...');
        setTimeout(waitForStreamAndMatch, 100);
      }
    };
    
    waitForStreamAndMatch();

    return () => {
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      socket.emit('leave-room', 'video');
      socket.disconnect();
    };
  }, [navigate]);

  const handleExit = () => navigate('/chat');

  const handleTyping = (newMessage) => {
    setMessage(newMessage);
    
    if (socketRef.current && isConnected) {
      if (newMessage.length > 0) {
        socketRef.current.emit('typing');
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          if (socketRef.current && isConnected) {
            socketRef.current.emit('stop-typing');
          }
        }, 1000);
      } else {
        socketRef.current.emit('stop-typing');
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    }
  };
  
  const handleSendMessage = () => {
    if (message.trim() && isConnected && socketRef.current) {
      setMessages(prev => [...prev, { text: message, sender: 'you' }]);
      socketRef.current.emit('send-message', { message });
      socketRef.current.emit('stop-typing');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
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

    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isConnected && socketRef.current) {
      socketRef.current.emit('skip-stranger');
      setMessages([]);
      setIsSearching(true);
      setIsConnected(false);
    } else if (isSearching && socketRef.current) {
      socketRef.current.emit('leave-room', 'video');
      setIsSearching(false);
      console.log('Stopped searching for partner');
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

  // WebRTC helper functions
  const handleICECandidate = (event) => {
    if (event.candidate && socketRef.current && isConnected) {
      console.log('Sending ICE candidate to peer:', event.candidate);
      socketRef.current.emit('webrtc-signal', {
        signal: {
          type: 'ice-candidate',
          candidate: event.candidate
        }
      });
    } else if (!event.candidate) {
      console.log('All ICE candidates have been sent');
    }
  };

  const handleTrackEvent = (event) => {
    console.log('Received remote track:', event.track.kind);
    if (strangerVideoRef.current && event.streams && event.streams[0]) {
      strangerVideoRef.current.srcObject = event.streams[0];
      console.log('Remote stream attached to video element');

      // Start quality monitoring
      if (qualityManagerRef.current && streamRef.current && peerRef.current?._pc) {
        qualityManagerRef.current.monitorConnectionQuality(
          peerRef.current._pc,
          streamRef.current,
          (quality) => {
            setVideoQuality(quality);
            console.log(`Video quality adjusted to: ${quality}`);
          }
        );
      }

      // Start video content moderation
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
  };

  const connectToSocketServer = () => {
    if (socketRef.current) {
      console.log('Socket already connected');
      return socketRef.current;
    }

    console.log('Connecting to socket server...');
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected with ID:', socket.id);
      socket.emit('join-room', 'video');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      setIsSearching(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return socket;
  };

  const endCall = () => {
    console.log('Ending call and cleaning up resources...');

    // Stop monitoring services
    if (qualityManagerRef.current) {
      qualityManagerRef.current.stopMonitoring();
      console.log('Quality monitoring stopped');
    }

    if (videoModeratorRef.current) {
      videoModeratorRef.current.stopMonitoring();
      setModerationWarning(null);
      console.log('Video moderation stopped');
    }

    // Destroy peer connection
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
      console.log('Peer connection destroyed');
    }

    // Clear remote video and stop all media tracks
    if (strangerVideoRef.current && strangerVideoRef.current.srcObject) {
      const stream = strangerVideoRef.current.srcObject;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped remote media track on endCall:', track.kind);
      });
      strangerVideoRef.current.srcObject = null;
      console.log('Remote video cleared and all tracks stopped');
    }

    // Notify server
    if (socketRef.current && isConnected) {
      socketRef.current.emit('skip-stranger');
      console.log('Server notified of call end');
    }

    // Reset state
    setMessages([]);
    setIsConnected(false);
    setIsSearching(false);
    setVideoQuality('high');

    console.log('Call ended successfully');
  };

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
            onKeyDown={handleKeyDown}
          />
          <button className="video-send-btn" onClick={handleSendMessage} disabled={!isConnected}>
            ➤
          </button>
          <button className="video-new-btn" onClick={handleNewOrSkip}>
            {isConnected ? '⏭ Skip' : isSearching ? '⏹ Stop' : '🔄 New'}
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
