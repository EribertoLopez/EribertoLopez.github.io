import React from 'react';
// import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
// import Home from './Home';
// import Projects from './Projects';
// import Blog from './Blog';
import Sidebar from './Sidebar';
// import { Sections } from '../ConfigUtils';
import { Sections, themes } from '../lib/ConfigUtils';
import styles from './ContentArea.module.css'
const ContentArea = ({currentTheme, onThemeChange}: {currentTheme: string, onThemeChange: (t: Sections) => void}) => {
  // return (
  //   // <main className="flex-1 bg-gray-900" style={{"paddingLeft": '30%'}}>
  //   <main className={styles.contentArea}>
  //   {/* <main className="flex-1 bg-gray-900 contentArea" > */}
  //         <article className="p-6">
  //           <h2 className="text-3xl font-bold mb-2">Hitting The Road - {currentTheme}</h2>
  //           <p className="text-gray-400 mb-6">30 June 2018</p>
  //           <img 
  //             src="/api/placeholder/800/400" 
  //             alt="Road through forest" 
  //             className="w-full rounded-lg mb-6"
  //           />
  //         </article>
  //         <article className="p-6">
  //           <h2 className="text-3xl font-bold mb-2">Hitting The Road 2</h2>
  //           <p className="text-gray-400 mb-6">30 June 2019</p>
  //           <img 
  //             src="/api/placeholder/800/400" 
  //             alt="Road through forest" 
  //             className="w-full rounded-lg mb-6"
  //           />
  //         </article>
  //         <article className="p-6">
  //           <h2 className="text-3xl font-bold mb-2">Hitting The Road</h2>
  //           <p className="text-gray-400 mb-6">30 June 2018</p>
  //           <img 
  //             src="/api/placeholder/800/400" 
  //             alt="Road through forest" 
  //             className="w-full rounded-lg mb-6"
  //           />
  //         </article>
  //         <article className="p-6">
  //           <h2 className="text-3xl font-bold mb-2">Hitting The Road 2</h2>
  //           <p className="text-gray-400 mb-6">30 June 2019</p>
  //           <img 
  //             src="/api/placeholder/800/400" 
  //             alt="Road through forest" 
  //             className="w-full rounded-lg mb-6"
  //           />
  //         </article>
  //       </main>
  // );
  return (
    <div className={`${styles.contentArea} w-full min-h-screen`}>
      <div className="max-w-4xl mx-auto p-8">
        <section className="mb-20">
          <div className="relative h-[500px] mb-8">
            <img 
              // src="https://images.unsplash.com/photo-1469474968028-56623f02e42e"
              src={themes[currentTheme]}
              alt="Nature landscape"
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent rounded-lg"></div>
            <div className="absolute bottom-8 left-8">
              <h2 className="text-4xl font-bold mb-2">Latest Adventure</h2>
              <p className="text-neutral-300">Posted on March 14, 2024</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="group cursor-pointer">
                <div className="relative h-64 mb-4">
                  <img 
                    src={`https://images.unsplash.com/photo-${item + 1}?auto=format&fit=crop&w=800`}
                    alt={`Project ${item}`}
                    className="w-full h-full object-cover rounded-lg group-hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute top-4 right-4 bg-neutral-900/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={16} />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Project Title {item}</h3>
                <p className="text-neutral-400">A brief description of the project and its key features.</p>
              </div>
            ))}
          </div>

          <div className="prose prose-invert max-w-none">
            <h2 className="text-3xl font-bold mb-6">Latest Posts</h2>
            {[1, 2, 3].map((post) => (
              <article key={post} className="mb-12">
                <h3 className="text-2xl font-semibold mb-4">Blog Post Title {post}</h3>
                <p className="text-neutral-400 mb-4">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
                  incididunt ut labore et dolore magna aliqua.
                </p>
                <a href="#" className="text-blue-400 hover:text-blue-300 inline-flex items-center">
                  Read More <ExternalLink size={16} className="ml-2" />
                </a>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ContentArea;