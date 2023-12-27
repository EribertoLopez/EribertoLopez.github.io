import React, { useState } from 'react';
import styles from './LandingPage.module.css';

const LandingPage = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleMenuClick = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <div className={styles.landing}>
            <a className={styles.h1} href="/posts">Blog.</a>
            <a className={styles.h1} href="/projects">Projects.</a>
            <a className={styles.h1} href="/lab">Lab.</a>
            <a className={styles.h1} href="/mscs">MSCS.</a>
        </div>
    );
};

export default LandingPage;