import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import OmegleWeb from './Components/OmegleWeb.jsx';
import ChatInterface from './Components/ChatInterface.jsx';
import VideoRoom from './Components/VideoRoom.jsx';
import ChatRoom from './Components/ChatRoom.jsx';
import PrivacyPolicy from './Components/PrivacyPolicy.jsx';
import TermsConditions from './Components/TermsConditions.jsx';
import About from './Components/About.jsx';
import Contact from './Components/Contact.jsx';
import NewEra from './Components/NewEra.jsx';
import WelcomeToOmegleWeb from './Components/WelcomeToOmegleWeb.jsx';
import GlobalCommunity from './Components/GlobalCommunity.jsx';
import PrivacyFocusedDesign from './Components/PrivacyFocusedDesign.jsx';
import NoAppNeeded from './Components/NoAppNeeded.jsx';
import SuperiorExperience from './Components/SuperiorExperience.jsx';
import ReadyToJoin from './Components/ReadyToJoin.jsx';
import GlobalConnectionPlatform from './Components/GlobalConnectionPlatform.jsx';
import SafetyFirst from './Components/SafetyFirst.jsx';
import YourNextAdventure from './Components/YourNextAdventure.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<OmegleWeb />} />
        <Route path="/chat" element={<ChatInterface />} />
        <Route path="/video" element={<VideoRoom />} /> {/* new route for video chat */}
        <Route path="/chatroom" element={<ChatRoom />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/new-era" element={<NewEra />} />
        <Route path="/welcome" element={<WelcomeToOmegleWeb />} />
        <Route path="/global-community" element={<GlobalCommunity />} />
        <Route path="/privacy-design" element={<PrivacyFocusedDesign />} />
        <Route path="/no-app-needed" element={<NoAppNeeded />} />
        <Route path="/superior-experience" element={<SuperiorExperience />} />
        <Route path="/ready-to-join" element={<ReadyToJoin />} />
        <Route path="/global-connection-platform" element={<GlobalConnectionPlatform />} />
        <Route path="/safety-first" element={<SafetyFirst />} />
        <Route path="/your-next-adventure" element={<YourNextAdventure />} />
      </Routes>
    </Router>
  );
}

export default App;
