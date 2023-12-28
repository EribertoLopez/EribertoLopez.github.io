import React, { useState } from 'react';
import styles from './LandingPage.module.css';

const LandingPage = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleMenuClick = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <div className={styles.landing}>
            <a className={styles.menuLink} href="/posts">Blog.</a>
            <a className={styles.menuLink} href="/projects">Projects.</a>
            <a className={styles.menuLink} href="/lab">Lab.</a>
            <a className={styles.menuLink} href="/mscs">MSCS.</a>
        </div>
    );
};

export default LandingPage;