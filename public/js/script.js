document.addEventListener('DOMContentLoaded', async () => {
    initHeaderScroll();
    initMobileMenu();
    initInfoSidebar();
    initThemeSwitch();
    initScrollReveal();
    initCardHoverEffect();
    initContactForm();
    initSwiperPortfolio();
    initScrollProgress();
    initCursorGlow();
    initFooterMapLink();
    initFooterAddressLink();
    initPortfolioRedirection();
    
    // Fetch and load dynamic service-specific portfolio works
    await loadServiceSpecificProjects();

    // Initialize homepage dynamic portfolio grid with 6-card default limit and View More pagination
    await initHomepagePortfolio();
    
    initPortfolioFilter();
    initMobileSubmenu();
});

/* ========================================================================
   HEADER SCROLL
   ======================================================================== */
function initHeaderScroll() {
    const header = document.querySelector('header');
    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
}

/* ========================================================================
   MOBILE DRAWER MENU
   ======================================================================== */
function initMobileMenu() {
    const navBtn = document.querySelector('.nav-btn');
    const closeBtn = document.querySelector('.sidebar .close-btn');
    const overlay = document.querySelector('.sidebar-overlay');
    const sidebar = document.querySelector('.sidebar');

    if (!navBtn || !closeBtn || !overlay || !sidebar) return;

    const openMenu = () => {
        overlay.classList.add('active');
        sidebar.classList.add('active');
    };

    const closeMenu = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };

    navBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // Close menu when clicking link
    const menuLinks = document.querySelectorAll('.menu li a');
    menuLinks.forEach(link => link.addEventListener('click', closeMenu));
}

/* ========================================================================
   INFO SIDEBAR
   ======================================================================== */
function initInfoSidebar() {
    const infoBtn = document.querySelector('.info-btn');
    const closeBtn = document.querySelector('.info-sidebar .close-info-btn');
    const overlay = document.querySelector('.info-sidebar-overlay');
    const sidebar = document.querySelector('.info-sidebar');

    if (!infoBtn || !closeBtn || !overlay || !sidebar) return;

    const openSidebar = () => {
        overlay.classList.add('active');
        sidebar.classList.add('active');
    };

    const closeSidebar = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };

    infoBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
}

/* ========================================================================
   THEME SWITCH (LIGHT / DARK)
   ======================================================================== */
function initThemeSwitch() {
    const themeBtn = document.getElementById('themeSwitch');
    const themeIcon = document.getElementById('themeIcon');
    const logoImg = document.getElementById('logoImg');
    const footerLogoImg = document.getElementById('footerLogoImg');
    const sidebarLogoImg = document.getElementById('sidebarLogoImg');
    const infoSidebarLogoImg = document.getElementById('infoSidebarLogoImg');

    if (!themeBtn) return;

    const updateLogos = (isLight) => {
        const logoPath = isLight ? './image/logo-dark.png' : './image/logo-light.png';
        if (logoImg) logoImg.src = logoPath;
        if (footerLogoImg) footerLogoImg.src = logoPath;
        if (sidebarLogoImg) sidebarLogoImg.src = logoPath;
        if (infoSidebarLogoImg) infoSidebarLogoImg.src = logoPath;
    };

    const setTheme = (isLight) => {
        if (isLight) {
            document.documentElement.classList.add('lightmode');
            themeIcon.className = 'fas fa-sun';
            localStorage.setItem('lightmode', 'active');
        } else {
            document.documentElement.classList.remove('lightmode');
            themeIcon.className = 'fas fa-moon';
            localStorage.removeItem('lightmode');
        }
        updateLogos(isLight);
    };

    // Load initial state
    const isLightModeActive = localStorage.getItem('lightmode') === 'active';
    setTheme(isLightModeActive);

    themeBtn.addEventListener('click', () => {
        const currentMode = document.documentElement.classList.contains('lightmode');
        setTheme(!currentMode);
    });
}

/* ========================================================================
   SCROLL REVEAL (INTERSECTION OBSERVER)
   ======================================================================== */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal-in');
    if (reveals.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(el => observer.observe(el));
}



/* ========================================================================
   CARD MOUSE HOVER SHINE EFFECT
   ======================================================================== */
function initCardHoverEffect() {
    const cards = document.querySelectorAll('.glass-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

/* ========================================================================
   SWIPER PORTFOLIO
   ======================================================================== */
function initSwiperPortfolio() {
    if (typeof Swiper !== 'undefined' && document.querySelector('.portfolio-slider')) {
        new Swiper('.portfolio-slider', {
            slidesPerView: 1,
            spaceBetween: 30,
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                640: {
                    slidesPerView: 1.5,
                },
                992: {
                    slidesPerView: 2.5,
                }
            }
        });
    }
}

/* ========================================================================
   CONTACT FORM SUBMISSION
   ======================================================================== */
function initContactForm() {
    const form = document.getElementById('contactForm');
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMsg = document.getElementById('toastMessage');

    if (!form || !toast) return;

    const showToast = (message, isSuccess) => {
        toast.className = `toast-notification show ${isSuccess ? 'success' : 'error'}`;
        toastIcon.className = `fa-solid ${isSuccess ? 'fa-circle-check' : 'fa-circle-exclamation'}`;
        toastMsg.textContent = message;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        const serviceSelect = document.getElementById('service');
        const service = serviceSelect ? serviceSelect.value : 'reels';
        const phoneInput = document.getElementById('phone');
        const phone = phoneInput ? phoneInput.value : '';

        // Basic validations
        if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) {
            showToast('Please fill in all required fields (Name, Email, Phone, Message).', false);
            return;
        }

        // Generate WhatsApp message and redirect
        const serviceText = serviceSelect ? serviceSelect.options[serviceSelect.selectedIndex].text : 'Not specified';
        const whatsappMessage = `*New Website Inquiry - Design Shaper Studio*\n\n` +
            `*Name:* ${name.trim()}\n` +
            `*Email:* ${email.trim()}\n` +
            `*Phone:* ${phone.trim() || 'N/A'}\n` +
            `*Service:* ${serviceText}\n` +
            `*Message:* ${message.trim()}`;

        const encodedMessage = encodeURIComponent(whatsappMessage);
        
        // Detect if user is on mobile or desktop to open directly
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
        const whatsappUrl = `${baseUrl}?phone=918155937300&text=${encodedMessage}`;
        
        // Open WhatsApp in a new tab immediately (avoiding browser popup blocker)
        window.open(whatsappUrl, '_blank');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, phone, service, message })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Thank you! Redirecting to WhatsApp...', true);
                form.reset();
            } else {
                form.reset();
            }
        } catch (error) {
            console.error('Submission error:', error);
            form.reset();
        }
    });
}

/* ========================================================================
   SCROLL PROGRESS BAR
   ======================================================================== */
function initScrollProgress() {
    // Create the scroll progress bar if it doesn't exist
    let progressBar = document.getElementById('scroll-progress');
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.id = 'scroll-progress';
        document.body.prepend(progressBar);
    }

    const handleScrollProgress = () => {
        const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
        progressBar.style.width = scrolled + '%';
    };

    window.addEventListener('scroll', handleScrollProgress);
}

/* ========================================================================
   CURSOR FOLLOW GLOW EFFECT
   ======================================================================== */
function initCursorGlow() {
    // Disable on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    let cursorGlow = document.getElementById('cursor-glow');
    if (!cursorGlow) {
        cursorGlow = document.createElement('div');
        cursorGlow.id = 'cursor-glow';
        document.body.appendChild(cursorGlow);
    }

    document.addEventListener('mousemove', (e) => {
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });
}

/* ========================================================================
   PORTFOLIO FILTER GRID
   ======================================================================== */
function initPortfolioFilter() {
    const tabs = document.querySelectorAll('.portfolio-tab-btn');
    if (tabs.length === 0) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Reset limit back to 6 when switching tabs
            portfolioLimit = 6;

            // Re-render matching projects
            renderPortfolioGrid();

            // Refresh pagination buttons
            updatePortfolioButton();
        });
    });
}


/* ========================================================================
   MOBILE SUB-MENU TOGGLE
   ======================================================================== */
function initMobileSubmenu() {
    const toggles = document.querySelectorAll('.sub-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const parent = toggle.closest('.menu-item-has-children');
            const subMenu = parent.querySelector('.sub-menu');
            toggle.classList.toggle('active');
            subMenu.classList.toggle('open');
        });
    });
}

/* ========================================================================
   DYNAMIC PORTFOLIO LOADING
   ======================================================================== */
async function loadDynamicProjects() {
    const portfolioGrid = document.querySelector('.portfolio-grid');
    if (!portfolioGrid) return;

    try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        
        if (data.success && data.projects && data.projects.length > 0) {
            const categoryLabels = {
                'graphics': 'graphics design',
                'branding': 'branding identity',
                'packaging': 'packaging design',
                'social-media': 'social media design',
                'video': 'video ads',
                'marketing': 'digital marketing'
            };

            // Prepend elements so they appear in reverse chronological order
            data.projects.forEach(project => {
                const itemWrapper = document.createElement('div');
                itemWrapper.className = 'col-lg-3 col-md-4 col-sm-6 col-6 portfolio-item-wrapper reveal-in visible';
                itemWrapper.setAttribute('data-category', project.category);

                const label = categoryLabels[project.category] || project.category;
                
                const showThumbnail = project.thumbnailPath ? true : false;
                
                let mediaHTML = '';
                if (showThumbnail) {
                    mediaHTML = `<img src="${project.thumbnailPath}" alt="${project.title}">`;
                } else {
                    mediaHTML = project.fileType === 'video' 
                        ? `<video src="${project.imagePath}" autoplay loop muted playsinline class="portfolio-video-thumb"></video>`
                        : `<img src="${project.imagePath}" alt="${project.title}">`;
                }

                const mediaUrls = project.mediaPaths ? project.mediaPaths.join(',') : project.imagePath;
                const mediaTypes = project.mediaTypes ? project.mediaTypes.join(',') : project.fileType;

                itemWrapper.innerHTML = `
                    <div class="portfolio-grid-card" data-project-id="${project.id}" data-media-urls="${mediaUrls}" data-media-types="${mediaTypes}">
                        ${mediaHTML}
                        <div class="portfolio-hover-overlay">
                            <h3 class="portfolio-hover-title cls-sep">${project.title}</h3>
                            <span class="portfolio-hover-category">${label}</span>
                            <div class="portfolio-hover-btn">
                                <i class="fa-solid fa-arrow-right"></i>
                            </div>
                            <span class="portfolio-hover-link-text">see full work</span>
                        </div>
                    </div>
                `;

                portfolioGrid.insertBefore(itemWrapper, portfolioGrid.firstChild);
            });
        }
    } catch (error) {
        console.error('Error loading dynamic projects:', error);
    }
}

/* ========================================================================
   DYNAMIC SERVICE-SPECIFIC PORTFOLIO LOADING
   ======================================================================== */
async function loadServiceSpecificProjects() {
    const serviceGrid = document.getElementById('service-portfolio-grid');
    if (!serviceGrid) return;

    const category = serviceGrid.getAttribute('data-service-category');
    if (!category) return;

    try {
        serviceGrid.innerHTML = ''; // Clear static defaults immediately
        
        const response = await fetch('/api/projects');
        const data = await response.json();
        
        if (data.success && data.projects && data.projects.length > 0) {
            const categoryLabels = {
                'graphics': 'graphics design',
                'branding': 'branding identity',
                'packaging': 'packaging design',
                'social-media': 'social media design',
                'video': 'video ads',
                'marketing': 'digital marketing'
            };

            const label = categoryLabels[category] || category;

            // Filter projects matching this category
            const filteredProjects = data.projects.filter(p => p.category === category);

            if (filteredProjects.length === 0) {
                showNoProjectsMessage(serviceGrid);
                return;
            }

            // Prepend elements so they appear in reverse chronological order
            filteredProjects.forEach(project => {
                const colWrapper = document.createElement('div');
                colWrapper.className = 'col-lg-3 col-md-4 col-sm-6 col-6 mb-4 reveal-in visible';

                const showThumbnail = project.thumbnailPath ? true : false;
                
                let mediaHTML = '';
                if (showThumbnail) {
                    mediaHTML = `<img src="${project.thumbnailPath}" alt="${project.title}">`;
                } else {
                    mediaHTML = project.fileType === 'video' 
                        ? `<video src="${project.imagePath}" autoplay loop muted playsinline class="portfolio-video-thumb"></video>`
                        : `<img src="${project.imagePath}" alt="${project.title}">`;
                }

                const mediaUrls = project.mediaPaths ? project.mediaPaths.join(',') : project.imagePath;
                const mediaTypes = project.mediaTypes ? project.mediaTypes.join(',') : project.fileType;

                colWrapper.innerHTML = `
                    <div class="portfolio-grid-card" data-project-id="${project.id}" data-media-urls="${mediaUrls}" data-media-types="${mediaTypes}">
                        ${mediaHTML}
                        <div class="portfolio-hover-overlay">
                            <h3 class="portfolio-hover-title cls-sep">${project.title}</h3>
                            <span class="portfolio-hover-category">${label}</span>
                            <div class="portfolio-hover-btn">
                                <i class="fa-solid fa-arrow-right"></i>
                            </div>
                            <span class="portfolio-hover-link-text">see project details</span>
                        </div>
                    </div>
                `;

                serviceGrid.insertBefore(colWrapper, serviceGrid.firstChild);
            });
        } else {
            showNoProjectsMessage(serviceGrid);
        }
    } catch (error) {
        console.error('Error loading service specific projects:', error);
        showNoProjectsMessage(serviceGrid);
    }
}

function showNoProjectsMessage(container) {
    container.innerHTML = `
        <div class="text-center py-5 w-100 reveal-in visible" style="grid-column: 1 / -1;">
            <h3 class="text-white mb-2">No projects uploaded yet</h3>
            <p class="text-white-50">New works will be showcased here soon.</p>
        </div>
    `;
}

/* ========================================================================
   DYNAMIC HOMEPAGE PORTFOLIO GRID & PAGINATION SYSTEM
   ======================================================================== */
let portfolioLimit = 8;
let combinedProjects = [];

async function initHomepagePortfolio() {
    const portfolioGrid = document.querySelector('.portfolio-grid');
    if (!portfolioGrid) return;

    try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        
        // Define default fallback projects
        const defaultProjects = [
            {
                id: "default-graphics",
                title: "creative agency post templates",
                category: "graphics",
                imagePath: "./image/graphics-design.png",
                fileType: "image"
            },
            {
                id: "default-branding",
                title: "corporate brand identity guidelines",
                category: "branding",
                imagePath: "./image/branding-identity.png",
                fileType: "image"
            },
            {
                id: "default-packaging",
                title: "minimalist box product packaging",
                category: "packaging",
                imagePath: "./image/packaging-design.png",
                fileType: "image"
            },
            {
                id: "default-social",
                title: "high-retention instagram carousel",
                category: "social-media",
                imagePath: "./image/social-media-design.png",
                fileType: "image"
            },
            {
                id: "default-video",
                title: "high-energy promotional video ad",
                category: "video",
                imagePath: "./image/video-ads.png",
                fileType: "image"
            },
            {
                id: "default-marketing",
                title: "targeted social media ad campaign",
                category: "marketing",
                imagePath: "./image/digital-marketing.png",
                fileType: "image"
            }
        ];

        let uploadedProjects = [];
        if (data.success && data.projects && data.projects.length > 0) {
            uploadedProjects = [...data.projects];
            // Sort uploaded projects by newest first
            uploadedProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        // Combine: uploaded projects only (no demo fallback items)
        combinedProjects = [...uploadedProjects];

        // Initial render
        renderPortfolioGrid();

        // Create pagination wrapper
        createPortfolioButton();

    } catch (error) {
        console.error('Error initializing homepage portfolio:', error);
    }
}

function renderPortfolioGrid() {
    const portfolioGrid = document.querySelector('.portfolio-grid');
    if (!portfolioGrid) return;

    portfolioGrid.innerHTML = '';

    const categoryLabels = {
        'graphics': 'graphics design',
        'branding': 'branding identity',
        'packaging': 'packaging design',
        'social-media': 'social media design',
        'video': 'video ads',
        'marketing': 'digital marketing'
    };

    const activeTab = document.querySelector('.portfolio-tab-btn.active');
    const filter = activeTab ? activeTab.getAttribute('data-filter') : 'all';

    const filteredProjects = filter === 'all'
        ? combinedProjects
        : combinedProjects.filter(p => p.category === filter);

    if (filteredProjects.length === 0) {
        portfolioGrid.innerHTML = `
            <div class="text-center py-5 w-100 reveal-in visible" style="grid-column: 1 / -1;">
                <h3 class="text-white mb-2">No projects uploaded yet</h3>
                <p class="text-white-50">New works will be showcased here soon.</p>
            </div>
        `;
        return;
    }

    const visibleProjects = filteredProjects.slice(0, portfolioLimit);

    visibleProjects.forEach(project => {
        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'col-lg-3 col-md-4 col-sm-6 col-6 portfolio-item-wrapper reveal-in visible';
        itemWrapper.setAttribute('data-category', project.category);

        const label = categoryLabels[project.category] || project.category;
        
        const showThumbnail = project.thumbnailPath ? true : false;
        
        let mediaHTML = '';
        if (showThumbnail) {
            mediaHTML = `<img src="${project.thumbnailPath}" alt="${project.title}">`;
        } else {
            mediaHTML = project.fileType === 'video' 
                ? `<video src="${project.imagePath}" autoplay loop muted playsinline class="portfolio-video-thumb"></video>`
                : `<img src="${project.imagePath}" alt="${project.title}">`;
        }

        const mediaUrls = project.mediaPaths ? project.mediaPaths.join(',') : project.imagePath;
        const mediaTypes = project.mediaTypes ? project.mediaTypes.join(',') : project.fileType;

        itemWrapper.innerHTML = `
            <div class="portfolio-grid-card" data-project-id="${project.id}" data-media-urls="${mediaUrls}" data-media-types="${mediaTypes}">
                ${mediaHTML}
                <div class="portfolio-hover-overlay">
                    <h3 class="portfolio-hover-title cls-sep">${project.title}</h3>
                    <span class="portfolio-hover-category">${label}</span>
                    <div class="portfolio-hover-btn">
                        <i class="fa-solid fa-arrow-right"></i>
                    </div>
                    <span class="portfolio-hover-link-text">see full work</span>
                </div>
            </div>
        `;

        portfolioGrid.appendChild(itemWrapper);
    });

    if (window.ScrollReveal) {
        window.ScrollReveal().sync();
    }
}

function createPortfolioButton() {
    const portfolioGrid = document.querySelector('.portfolio-grid');
    if (!portfolioGrid) return;

    const heroContainer = portfolioGrid.parentElement;
    if (!heroContainer) return;

    let btnContainer = document.getElementById('portfolio-btn-container');
    if (!btnContainer) {
        btnContainer = document.createElement('div');
        btnContainer.id = 'portfolio-btn-container';
        btnContainer.className = 'text-center mt-5 reveal-in visible';
        heroContainer.appendChild(btnContainer);
    }

    updatePortfolioButton();
}

function updatePortfolioButton() {
    const btnContainer = document.getElementById('portfolio-btn-container');
    if (!btnContainer) return;

    const activeTab = document.querySelector('.portfolio-tab-btn.active');
    const filter = activeTab ? activeTab.getAttribute('data-filter') : 'all';

    const filteredProjects = filter === 'all'
        ? combinedProjects
        : combinedProjects.filter(p => p.category === filter);

    const totalProjects = filteredProjects.length;

    if (totalProjects === 0) {
        btnContainer.innerHTML = '';
        return;
    }

    if (portfolioLimit === 8) {
        if (totalProjects <= 8) {
            btnContainer.innerHTML = `
                <a href="service.html" class="btn-primary-gradient px-5 py-3 text-decoration-none d-inline-flex align-items-center gap-2">View All Works <i class="fa-solid fa-arrow-right"></i></a>
            `;
        } else {
            btnContainer.innerHTML = `
                <button id="btn-portfolio-more" class="btn-outline-glass px-5 py-3">View More <i class="fa-solid fa-circle-plus"></i></button>
            `;
            
            document.getElementById('btn-portfolio-more').addEventListener('click', () => {
                portfolioLimit = 12;
                renderPortfolioGrid();
                updatePortfolioButton();
            });
        }
    } else if (portfolioLimit === 12) {
        btnContainer.innerHTML = `
            <a href="service.html" class="btn-primary-gradient px-5 py-3 text-decoration-none d-inline-flex align-items-center gap-2">View All Works <i class="fa-solid fa-arrow-right"></i></a>
        `;
    }
}

/* ========================================================================
   CLICKABLE FOOTER MAP & ADDRESS REDIRECTS
   ======================================================================== */
function initFooterMapLink() {
    const footerMap = document.querySelector('.footer-map');
    if (footerMap) {
        footerMap.style.position = 'relative';
        if (!footerMap.querySelector('.map-overlay-link')) {
            const overlay = document.createElement('a');
            overlay.className = 'map-overlay-link';
            overlay.href = 'https://www.google.com/maps/dir//Design+Shaper+Studio,+312,+AR+Mall,+nr.+Panvel+Point,+Mota+Varachha,+Surat,+Gujarat+394101/@21.2378788,72.8633633,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3be04f05932c91f3:0x1b07e5622cb7e97f!2m2!1d72.8730725!2d21.2354592?entry=ttu&g_ep=EgoyMDI2MDgxMi4wIKXMDSoASAFQAw%3D%3D';
            overlay.target = '_blank';
            overlay.title = 'Open in Google Maps';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.zIndex = '5';
            overlay.style.cursor = 'pointer';
            footerMap.appendChild(overlay);
        }
    }
}

function initFooterAddressLink() {
    const footerLinks = document.querySelectorAll('.footer-col ul.footer-links li');
    footerLinks.forEach(li => {
        if (li.textContent.includes('Location:')) {
            const span = li.querySelector('span.text-white');
            if (span) {
                const addressText = li.textContent.replace('Location:', '').trim();
                li.innerHTML = `<span class="text-white">Location:</span> <a href="https://www.google.com/maps/dir//Design+Shaper+Studio,+312,+AR+Mall,+nr.+Panvel+Point,+Mota+Varachha,+Surat,+Gujarat+394101/@21.2378788,72.8633633,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3be04f05932c91f3:0x1b07e5622cb7e97f!2m2!1d72.8730725!2d21.2354592?entry=ttu&g_ep=EgoyMDI2MDgxMi4wIKXMDSoASAFQAw%3D%3D" target="_blank" class="text-white-50 text-decoration-none" style="transition: color 0.3s;" onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='var(--text-secondary)'">${addressText}</a>`;
            }
        }
    });

    const contactInfoCards = document.querySelectorAll('.contact-info-card');
    contactInfoCards.forEach(card => {
        const title = card.querySelector('h4');
        const desc = card.querySelector('p');
        if (title && title.textContent.includes('Address') && desc) {
            const addressText = desc.textContent;
            desc.innerHTML = `<a href="https://www.google.com/maps/dir//Design+Shaper+Studio,+312,+AR+Mall,+nr.+Panvel+Point,+Mota+Varachha,+Surat,+Gujarat+394101/@21.2378788,72.8633633,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3be04f05932c91f3:0x1b07e5622cb7e97f!2m2!1d72.8730725!2d21.2354592?entry=ttu&g_ep=EgoyMDI2MDgxMi4wIKXMDSoASAFQAw%3D%3D" target="_blank" class="text-white-50 text-decoration-none" style="transition: color 0.3s;" onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='var(--text-secondary)'">${addressText}</a>`;
        }
    });
}

/* ========================================================================
   PORTFOLIO CARD REDIRECTION TO DETAILS PAGE
   ======================================================================== */
function initPortfolioRedirection() {
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.portfolio-grid-card');
        if (!card) return;

        let projectId = card.getAttribute('data-project-id');
        if (!projectId) {
            const titleEl = card.querySelector('.portfolio-hover-title');
            const title = titleEl ? titleEl.textContent.trim().toLowerCase() : '';
            
            if (title.includes('agency post')) {
                projectId = 'default-graphics';
            } else if (title.includes('brand identity')) {
                projectId = 'default-branding';
            } else if (title.includes('box product') || title.includes('box print')) {
                projectId = 'default-packaging';
            } else if (title.includes('instagram') || title.includes('feed grids')) {
                projectId = 'default-social';
            } else if (title.includes('video') || title.includes('reels cuts') || title.includes('funnel')) {
                projectId = 'default-video';
            } else if (title.includes('targeted') || title.includes('campaign')) {
                projectId = 'default-marketing';
            } else {
                // Generic fallback mapping based on category attribute or class
                const parentItem = card.closest('.portfolio-item-wrapper');
                const cat = parentItem ? parentItem.getAttribute('data-category') : '';
                if (cat === 'graphics') projectId = 'default-graphics';
                else if (cat === 'branding') projectId = 'default-branding';
                else if (cat === 'packaging') projectId = 'default-packaging';
                else if (cat === 'social-media') projectId = 'default-social';
                else if (cat === 'video') projectId = 'default-video';
                else if (cat === 'marketing') projectId = 'default-marketing';
            }
        }

        if (projectId) {
            window.location.href = 'project-details.html?id=' + projectId;
        }
    });
}

window.openLightboxModal = function(urls, types, title, startIdx = 0) {
    const existing = document.getElementById('portfolio-lightbox-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'portfolio-lightbox-modal';
    modal.className = 'lightbox-modal';
    
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(10, 10, 12, 0.98)';
    modal.style.backdropFilter = 'blur(15px)';
    modal.style.zIndex = '99999';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';
    
    let currentIdx = startIdx;
    
    // Generate inner HTML
    let sliderContentHTML = '';
    if (urls.length > 1) {
        // Multi-media Slider
        let slidesHTML = '';
        let dotsHTML = '';
        
        urls.forEach((url, index) => {
            const isVideo = types[index] === 'video';
            const displayStyle = index === startIdx ? 'block' : 'none';
            
            let slideMedia = '';
            if (isVideo) {
                slideMedia = `<video src="${url}" controls ${index === startIdx ? 'autoplay' : ''} controlslist="nodownload" class="lightbox-media" style="max-width: 90%; max-height: 75vh; width: 650px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); object-fit: contain;"></video>`;
            } else {
                slideMedia = `<img src="${url}" alt="${title}" class="lightbox-media" style="max-width: 90%; max-height: 75vh; width: 650px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); object-fit: contain;">`;
            }
            
            slidesHTML += `
                <div class="lightbox-slide" data-index="${index}" style="display: ${displayStyle}; width: 100%; text-align: center;">
                    ${slideMedia}
                </div>
            `;
            
            dotsHTML += `
                <span class="lightbox-dot ${index === startIdx ? 'active' : ''}" data-index="${index}" style="height: 10px; width: 10px; margin: 0 5px; background-color: ${index === startIdx ? 'var(--accent-color, #ff4b2b)' : '#bbb'}; border-radius: 50%; display: inline-block; cursor: pointer; transition: background-color 0.2s;"></span>
            `;
        });
        
        sliderContentHTML = `
            <div class="lightbox-slider-container" style="position: relative; width: 100%; display: flex; align-items: center; justify-content: center;">
                <button class="slider-prev" style="position: absolute; left: 3%; background: rgba(255,255,255,0.1); border: none; color: #fff; font-size: 30px; cursor: pointer; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 100001;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">&#10094;</button>
                
                <div class="lightbox-slides-wrapper" style="width: 100%; display: flex; align-items: center; justify-content: center;">
                    ${slidesHTML}
                </div>
                
                <button class="slider-next" style="position: absolute; right: 3%; background: rgba(255,255,255,0.1); border: none; color: #fff; font-size: 30px; cursor: pointer; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 100001;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">&#10095;</button>
            </div>
            
            <div class="lightbox-dots-container" style="margin-top: 15px; text-align: center; z-index: 100001;">
                ${dotsHTML}
            </div>
        `;
    } else {
        // Single media
        const url = urls[0];
        const isVideo = types[0] === 'video';
        
        let mediaHTML = '';
        if (isVideo) {
            mediaHTML = `<video src="${url}" controls autoplay controlslist="nodownload" class="lightbox-media" style="max-width: 90%; max-height: 75vh; width: 650px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); object-fit: contain;"></video>`;
        } else {
            mediaHTML = `<img src="${url}" alt="${title}" class="lightbox-media" style="max-width: 90%; max-height: 75vh; width: 650px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); object-fit: contain;">`;
        }
        
        sliderContentHTML = `
            <div class="lightbox-content" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%;">
                ${mediaHTML}
            </div>
        `;
    }

    modal.innerHTML = `
        <button class="lightbox-close" style="position: absolute; top: 20px; right: 20px; background: none; border: none; color: #fff; font-size: 45px; cursor: pointer; transition: transform 0.2s; z-index: 100002;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">&times;</button>
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
            ${sliderContentHTML}
            <h4 style="color: #fff; margin-top: 20px; font-weight: 600; font-size: 20px; text-transform: capitalize; letter-spacing: 0.5px; z-index: 100001; text-align: center;">${title}</h4>
        </div>
    `;

    document.body.appendChild(modal);

    // Disable right click on all media elements
    modal.querySelectorAll('.lightbox-media').forEach(mediaEl => {
        mediaEl.addEventListener('contextmenu', e => e.preventDefault());
    });

    // Slider Logic
    if (urls.length > 1) {
        const slides = modal.querySelectorAll('.lightbox-slide');
        const dots = modal.querySelectorAll('.lightbox-dot');
        
        const showSlide = (idx) => {
            // Stop any currently playing videos
            slides.forEach(slide => {
                const videoEl = slide.querySelector('video');
                if (videoEl) {
                    videoEl.pause();
                    videoEl.currentTime = 0;
                }
                slide.style.display = 'none';
            });
            
            dots.forEach(dot => {
                dot.style.backgroundColor = '#bbb';
                dot.classList.remove('active');
            });
            
            // Show new slide
            currentIdx = (idx + urls.length) % urls.length;
            const activeSlide = slides[currentIdx];
            activeSlide.style.display = 'block';
            
            // Autoplay video on the active slide
            const activeVideo = activeSlide.querySelector('video');
            if (activeVideo) {
                activeVideo.play().catch(e => console.log('Video autoplay blocked:', e));
            }
            
            const activeDot = dots[currentIdx];
            activeDot.style.backgroundColor = 'var(--accent-color, #ff4b2b)';
            activeDot.classList.add('active');
        };

        const prevBtn = modal.querySelector('.slider-prev');
        const nextBtn = modal.querySelector('.slider-next');
        if (prevBtn) prevBtn.addEventListener('click', () => showSlide(currentIdx - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => showSlide(currentIdx + 1));
        
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const idx = parseInt(dot.getAttribute('data-index'), 10);
                showSlide(idx);
            });
        });
    }

    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);

    const closeBtn = modal.querySelector('.lightbox-close');
    const closeModal = () => {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 300);
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('lightbox-content') || e.target.parentElement === modal) {
            closeModal();
        }
    });

    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        } else if (urls.length > 1) {
            if (e.key === 'ArrowRight') {
                const nextBtn = modal.querySelector('.slider-next');
                if (nextBtn) nextBtn.click();
            } else if (e.key === 'ArrowLeft') {
                const prevBtn = modal.querySelector('.slider-prev');
                if (prevBtn) prevBtn.click();
            }
        }
    };
    document.addEventListener('keydown', escHandler);
}
