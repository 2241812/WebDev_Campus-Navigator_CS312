/**
 * home-page_script.js
 *
 * Handles the animations and navigation for the introductory (home) page.
 * - Adds a hover effect to the 'Bravo' mascot when hovering over the compass.
 * - Manages the click event on the compass button to:
 * 1. Trigger a fade-out/zoom animation on the intro screen.
 * 2. Show a loading screen.
 * 3. Navigate to the main map page (mainpage.html) after a short delay.
 */
document.addEventListener('DOMContentLoaded', () => {
    /**
     * @description Caches all necessary DOM elements for the script.
     */
    const elements = {
        compassButton: document.getElementById('compass-btn'),
        bravoImage: document.getElementById('bravo-img'),
        introScreen: document.getElementById('intro-screen'),
        loadingScreen: document.getElementById('loading-screen'),
        welcomeText: document.getElementById('welcome-text'),
        transitionBg: document.getElementById('transition-bg')
    };

    /**
     * @description Checks if all required elements are present in the DOM.
     * @returns {boolean} True if all elements exist, false otherwise.
     */
    const allElementsExist = () => {
        // Iterate over the keys in the elements object
        for (const key in elements) {
            if (!elements[key]) {
                // Log a specific warning for the missing element
                console.warn(`Initialization failed: Element with ID '${key}' not found.`);
                return false;
            }
        }
        return true;
    };

    /**
     * @description Attaches all event listeners for the page.
     */
    const attachEventListeners = () => {
        // --- Hover Effects ---
        // Add a hover class to the mascot when mousing over the compass
        elements.compassButton.addEventListener('mouseenter', () => {
            elements.bravoImage.classList.add('bravo-hover-effect');
        });

        // Remove the hover class when the mouse leaves the compass
        elements.compassButton.addEventListener('mouseleave', () => {
            elements.bravoImage.classList.remove('bravo-hover-effect');
        });

        // --- Click Navigation ---
        // Handle the main navigation click
        elements.compassButton.addEventListener('click', handleCompassClick);
    };

    /**
     * @description Handles the click event on the compass button, triggering
     * the transition and navigation sequence.
     */
    const handleCompassClick = () => {
        // 1. Clean up and initiate animations
        elements.bravoImage.classList.remove('bravo-hover-effect');
        elements.compassButton.style.pointerEvents = 'none'; // Prevent double-clicking
        elements.welcomeText.classList.add('text-fade-out');
        elements.introScreen.classList.add('zoom-effect'); // Zooms the whole intro screen
        elements.transitionBg.classList.add('bg-fade-in'); // Fades in a background overlay

        // 2. Switch to the loading screen after the initial fade/zoom (1s)
        setTimeout(() => {
            elements.introScreen.classList.add('hidden');
            elements.loadingScreen.classList.remove('hidden');
            elements.loadingScreen.classList.add('fade-in');

            console.log("Loading screen visible.");
        }, 1000); // Must match the duration of the zoom/fade CSS animations

        // 3. Navigate to the main page after the loading screen has been visible (2s total)
        setTimeout(() => {
            console.log("Navigating to the main map page (mainpage.html)...");
            window.location.href = 'mainpage.html';
        }, 2000); // Total delay from click to navigation
    };

    // --- Script Entry Point ---
    // Only run the script if all required elements are found
    if (allElementsExist()) {
        attachEventListeners();
    } else {
        console.error("Could not initialize home page script due to missing elements.");
    }
});