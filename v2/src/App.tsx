import React, { useCallback, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';
import { themes, Sections } from './ConfigUtils';


function App() {
  const [currentTheme, setCurrentTheme] = useState<string>(themes[Sections.Home]);
  const handleThemeChange = useCallback((theme: Sections) => {
    setCurrentTheme(themes[theme]);
  }, [themes])
  return (
    <div className="flex min-h-screen bg-neutral-900 text-white">
      <Sidebar currentTheme={currentTheme} onThemeChange={handleThemeChange} />
      <ContentArea currentTheme={currentTheme} onThemeChange={handleThemeChange} />
    </div>
  );
}

export default App;