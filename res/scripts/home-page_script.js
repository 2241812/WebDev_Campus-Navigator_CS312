
        document.addEventListener('DOMContentLoaded', () => {
            // --- Your updated script logic ---
            const compassButton = document.getElementById('compass-btn');
            const bravoImage = document.getElementById('bravo-img');
            const introScreen = document.getElementById('intro-screen');
            const loadingScreen = document.getElementById('loading-screen');
            const welcomeText = document.getElementById('welcome-text');
            const transitionBg = document.getElementById('transition-bg');

            if (compassButton && bravoImage && introScreen && welcomeText && transitionBg) {
                // Hover effect logic
                compassButton.addEventListener('mouseenter', () => {
                    bravoImage.classList.add('bravo-hover-effect');
                });
                compassButton.addEventListener('mouseleave', () => {
                    bravoImage.classList.remove('bravo-hover-effect');
                });

                // Click logic
                compassButton.addEventListener('click', () => {
                    bravoImage.classList.remove('bravo-hover-effect');
                    compassButton.style.pointerEvents = 'none';
                    welcomeText.classList.add('text-fade-out');
                    introScreen.classList.add('zoom-effect'); // Zooms the whole intro screen
                    transitionBg.classList.add('bg-fade-in');

                    // Timeout to switch screens (1 second)
                    setTimeout(() => {
                        introScreen.classList.add('hidden');
                        loadingScreen.classList.remove('hidden');
                        loadingScreen.classList.add('fade-in');
                        
                        console.log("Loading screen visible.");
                    }, 1000); // 1-second delay for screen switch

                    // Timeout to navigate (2 seconds total)
                    // This ensures the loading screen is visible for a moment
                    // before navigation happens.
                    setTimeout(() => {
                        console.log("Navigating to the main map page (main map page.html)...");
                        window.location.href = 'mainpage.html';
                    }, 2000); // 2-second total delay from click
                });
            } else {
                console.warn('One or more required elements not found.');
            }
        });
