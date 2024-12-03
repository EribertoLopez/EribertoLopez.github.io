import React from 'react';
import styles from './ContentArea.module.css'

const ContentArea = ({children}: {children: React.ReactElement}) => {
  return (
    <div className={`${styles.contentArea}`}>
      <div className="mx-auto p-8">{children}</div>
    </div>
  );
};

export default ContentArea;