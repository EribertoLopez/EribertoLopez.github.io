import React, { useState } from 'react';
import styles from './LandingPage.module.css';
import Link from 'next/link';

const LandingPage = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleMenuClick = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <div className={styles.landing}>
            <Link className={styles.menuLink} href="/posts">Blog.</Link>
            <Link className={styles.menuLink} href="/projects">Projects.</Link>
            <Link className={styles.menuLink} href="/lab">Lab.</Link>
            <Link className={styles.menuLink} href="/mscs">MSCS.</Link>
        </div>
    );
};

export default LandingPage;