import React, { useState } from 'react';
import styles from './LandingPage.module.css';

const LandingPage = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleMenuClick = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <div className={styles.landing}>
            {/* <header className={styles.header}>
                <div className={styles.menuIcon} onClick={handleMenuClick}>
                    <div></div>
                    <div></div>
                </div>
                {isMenuOpen && (
                    <nav className={styles.fullScreenNav}>
                        <ul>
                            <li><a className={styles.menu_link} href="/posts">Blog</a></li>
                            <li><a className={styles.menu_link} href="/projects">Projects</a></li>
                            <li><a className={styles.menu_link} href="/lab">Lab</a></li>
                        </ul>
                    </nav>
                )}
                <h1>Welcome to My Portfolio</h1>
            </header> */}
            <section id="blog" className={styles.blog}>
                <div className={styles.h1}>Blog</div>
                {/* Blog content */}
            </section>
            <section id="projects" className={styles.projects}>
                <div className={styles.h1}>Projects</div>
                {/* Projects content */}
            </section>
            <section id="lab" className={styles.lab}>
                <div className={styles.h1}>Lab</div>
                {/* Lab content */}
            </section>
        </div>
    );
};

export default LandingPage;