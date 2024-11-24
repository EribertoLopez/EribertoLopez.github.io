import React from 'react';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

const Sidebar = () => {
  return (
    <div className="fixed w-80 h-screen bg-neutral-800 p-8 flex flex-col justify-between">
      <div>
        <h1 className="text-4xl font-bold mb-4">John Doe</h1>
        <p className="text-neutral-400 mb-8">Full-stack developer passionate about creating beautiful and functional web experiences.</p>
        
        <nav>
          <ul className="space-y-4">
            <li>
              <a href="/latest" className="text-lg hover:text-blue-400 transition-colors">Latest</a>
            </li>
            <li>
              <a href="/projects" className="text-lg hover:text-blue-400 transition-colors">Projects</a>
            </li>
            <li>
              <a href="/about" className="text-lg hover:text-blue-400 transition-colors">About</a>
            </li>
            <li>
              <a href="/contact" className="text-lg hover:text-blue-400 transition-colors">Contact</a>
            </li>
          </ul>
        </nav>
      </div>
      
      <div className="flex space-x-4">
        <a href="https://github.com" className="text-neutral-400 hover:text-white transition-colors">
          <Github size={20} />
        </a>
        <a href="https://twitter.com" className="text-neutral-400 hover:text-white transition-colors">
          <Twitter size={20} />
        </a>
        <a href="https://linkedin.com" className="text-neutral-400 hover:text-white transition-colors">
          <Linkedin size={20} />
        </a>
        <a href="mailto:contact@example.com" className="text-neutral-400 hover:text-white transition-colors">
          <Mail size={20} />
        </a>
      </div>
    </div>
  );
};

export default Sidebar;