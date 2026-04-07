document.addEventListener('DOMContentLoaded', () => {
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const slideNum = document.getElementById('slideNum');
    const navDots = document.getElementById('navDots');
    const progressFill = document.getElementById('progressFill');

    let currentSlide = 0;
    const totalSlides = slides.length;

    // Initialize Lucide Icons
    lucide.createIcons();

    // Create Navigation Dots
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('div');
        dot.classList.add('nav-dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i));
        navDots.appendChild(dot);
    }

    const dots = document.querySelectorAll('.nav-dot');

    function updateControls() {
        slideNum.textContent = `${(currentSlide + 1).toString().padStart(2, '0')} / ${totalSlides.toString().padStart(2, '0')}`;
        
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });

        // Use fraction of total slides for progress fill
        const progressPercent = ((currentSlide + 1) / totalSlides) * 100;
        progressFill.style.height = `${progressPercent}%`;

        // Slide activation
        slides.forEach((slide, index) => {
            if (index === currentSlide) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });
    }

    function goToSlide(n) {
        currentSlide = (n + totalSlides) % totalSlides;
        updateControls();
    }

    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        goToSlide(currentSlide - 1);
    }

    // Keyboard & Clicks
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
            nextSlide();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            prevSlide();
        }
    });

    // Touch Support
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', (e) => {
        let touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) nextSlide();
        if (touchEndX - touchStartX > 50) prevSlide();
    });

    // Initial state
    updateControls();
});
