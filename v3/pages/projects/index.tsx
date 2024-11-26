import { useState, useCallback } from 'react';
import ContentArea from '../../components/ContentArea';
import { themes, Sections } from '../../lib/ConfigUtils';
import SidebarLayout from '../../components/SidebarLayout';

export default function Index() {
  const [currentTheme, setCurrentTheme] = useState<string>(themes[Sections.Projects]);
  const handleThemeChange = useCallback((theme: Sections) => {
    setCurrentTheme(themes[theme]);
  }, [themes])

  return (

    <SidebarLayout
      headTitle={`Projects | Eriberto Lopez`}
      currentTheme={Sections.Projects}
      onThemeChange={handleThemeChange}
    >
      <ContentArea currentTheme={Sections.Projects} onThemeChange={handleThemeChange} />
    </SidebarLayout>
  )
}

