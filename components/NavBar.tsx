import { useState } from "react";
import Link from "next/link";
import styles from "./NavBar.module.css";

const NavBar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleMenuClick = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleNavClose = () => {
        setIsMenuOpen(false);
    };
    // TODO: Would be interesting to practice some CSS animations here, by animating the periods of each menuLink when hovering
    return (
        <div className={styles.landing}>
            <header className={styles.header}>
                <div className={styles.menuIcon} onClick={handleMenuClick}>
                    <div></div>
                    <div></div>
                </div>
                {isMenuOpen && (
                    <div className={styles.fullScreenNav}>
                        <div className={styles.menuIcon} onClick={handleNavClose}>
                            <div></div>
                            <div></div>
                        </div>
                        <ul>
                            <li><a className={styles.menuLink} href="/posts">Blog.</a></li>
                            <li><a className={styles.menuLink} href="/projects">Projects.</a></li>
                            <li><a className={styles.menuLink} href="/lab">Lab.</a></li>
                        </ul>
                    </div>
                )}
                <h1>Welcome to My Portfolio</h1>
            </header>
        </div>
    );
};


export default NavBar;
