import React from 'react';
import { Github, Twitter, Linkedin, Mail, ExternalLink } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';

function App() {
  return (
    // <div >
    <div className="flex min-h-screen bg-neutral-900 text-white">
      <Sidebar />
      <ContentArea />
      {/* <div>
        <ContentArea />
      </div> */}
    </div>
  );
}

export default App;