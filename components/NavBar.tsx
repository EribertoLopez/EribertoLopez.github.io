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
    // TODO: Would be interesting to practice some CSS animations here, by animating the periods of each menuLink when
    return (
        <div className={styles.navBar}>
            <header className={styles.header}>
                <div className={styles.menuIcon} onClick={handleMenuClick}>
                    <div></div>
                    <div></div>
                </div>
                    <div className={isMenuOpen ? styles.fullScreenNavOpen: styles.fullScreenNav}>
                        <ul>
                            <li><a className={styles.menuLink} href="/">About.</a></li>
                            <li><a className={styles.menuLink} href="/contact">Contact.</a></li>
                            <li><a className={styles.menuLink} href="/projects">Portfolio.</a></li>
                        </ul>
                    </div>
                <h1>Welcome to My Portfolio</h1>
            </header>
        </div>
    );
};


export default NavBar;
