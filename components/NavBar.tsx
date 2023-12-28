import { useState } from "react";

import styles from "./NavBar.module.css";
import React from "react";
import myImage from "../public/favicon/IBelieveICanShibe_edited_50x50.png";

import Link from "next/link";
import Image from "next/image";

const NavBar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleMenuClick = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <div className={styles.navBar}>
            <header className={styles.header}>
                <div className={styles.menuIcon} onClick={handleMenuClick}>
                    <div></div>
                    <div></div>
                </div>
                <div className={isMenuOpen ? styles.fullScreenNavOpen: styles.fullScreenNav}>
                    <ul>
                        <li><Link href="/" className={styles.menuLink}>About.</Link></li>
                        <li><Link href="/contact" className={styles.menuLink}>Contact.</Link></li>
                        <li><Link href="/projects" className={styles.menuLink}>Portfolio.</Link></li>
                    </ul>
                    <Image src={myImage.src} alt="shibe" onClick={() => console.log('shibeee')} width={50} height={50}/>
                </div>
            </header>
        </div>
    );
};

export default NavBar;

