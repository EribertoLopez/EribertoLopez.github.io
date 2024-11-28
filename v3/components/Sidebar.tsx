import React from 'react';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';
import Link from 'next/link';
import { Sections } from '../lib/ConfigUtils';
import styles from './SidebarLayout.module.css';


const Sidebar = ({currentTheme, onThemeChange}: {currentTheme: string, onThemeChange: (t: Sections) => void}) => {
  return (
    // <header></header>
    <div 
      className="fixed w-80 h-screen bg-neutral-800 p-8 flex flex-col justify-between"
      // className={styles.sidebarLayout}
      style={{ 
        // backgroundImage: 'url(src/images/me_infront_of_HPC_20180129_163043.jpg)' 
        // backgroundImage: 'url(src/images/20170108_123337.jpg)', 
        backgroundImage: `url(${currentTheme})`, 
        // backgroundImage: 'url(src/images/me_infront_of_HPC_20180129_163043.jpg)', 
        // backgroundSize: '175%', // Adjusts the size of the background image
        backgroundSize: 'cover', // Adjusts the size of the background image
        backgroundPosition: 'center', // Centers the background image
        backgroundPositionY: '100%',
        backgroundRepeat: 'no-repeat', // Prevents the background image from repeating
        width: '30%',
        right: 'auto',
        position: 'fixed'
        // width: '25rem'
      }}
    >
      {/* <div className={styles.overlay}></div> */}
      <div 
        id="OVERLAY"
        style={{
          zIndex: 1,
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          // background: 'linear-gradient(to bottom, rgba(22,27,33,0) 0%, rgba(22,27,33,0.01) 1%, rgba(22,27,33,0.7) 70%, rgba(22,27,33,0.7) 100%)',
          background: '-webkit-linear-gradient(top, rgba(22,27,33,0) 0%, rgba(22,27,33,0.01) 1%, rgba(22,27,33,0.7) 70%, rgba(22,27,33,0.7) 100%)',
          // background: '-moz-linear-gradient(top, rgba(22,27,33,0) 0%, rgba(22,27,33,0.01) 1%, rgba(22,27,33,0.7) 70%, rgba(22,27,33,0.7) 100%)',
        }}
      ></div>
      <div className={styles.headerImage}></div>
      <div id='MYINFO' style={{ marginTop: 'auto', zIndex: 2, position: 'relative' }}>
        <h1 className="text-4xl font-bold mb-4">Eriberto Lopez</h1>
        <p className="text-neutral-400 mb-8">Full-stack developer passionate about creating beautiful and functional web experiences.</p>
        
        <nav>
          <ul className="space-y-4">
            {Object.entries(Sections).map(([key, _]) => {
              console.log('key', key, Sections.Home, key == Sections.Home)
              return (
                <li key={key}>
                  <Link 
                    href={key == Sections.Home ? "/" : `/${key.toLowerCase()}`}
                    className="text-lg hover:text-blue-400 transition-colors"
                    onClick={(e) => {
                      // e.preventDefault();
                      onThemeChange(key as Sections)
                      // console.log(key)
                    }}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Link>
                  {/* <a 
                    href={key == Sections.Home ? "/" : `/${key.toLowerCase()}`}
                    className="text-lg hover:text-blue-400 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      onThemeChange(key as Sections)
                      // console.log(key)
                    }}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </a> */}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      
      <div id="SOCIALS" className="flex items-center justify-center space-x-4" style={{zIndex: 2, position: 'relative'}}>
      {/* <div id="SOCIALS" className="flex space-x-4" style={{zIndex: 2, position: ''}}> */}
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