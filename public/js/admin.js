let selectedFiles = [];
let selectedThumbnailFile = null;
let projectsList = [];
let leadsList = [];
let timelineChart = null;
let servicesChart = null;
let confirmModalCallback = null;
let confirmModal = null;
let detailsModal = null;
let clientModal = null;

// Task Tracker State variables
let tasksList = [];
let staffList = [];
let clientsList = [];
let packagesList = [];
let notificationsList = [];
let tasksDoughnutChart = null;
let staffReportChart = null;
let currentCalendarDate = new Date();
let packageModal = null;

// Internal Chat State
let chatContacts = [];
let activeChatPartnerId = null;
let chatPollInterval = null;
let lastUnreadCount = 0;
let originalTitle = document.title;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap Modals
    const confirmModalEl = document.getElementById('confirmModal');
    const detailsModalEl = document.getElementById('leadDetailsModal');
    const clientModalEl = document.getElementById('clientModal');
    const packageModalEl = document.getElementById('packageModal');
    if (confirmModalEl) confirmModal = new bootstrap.Modal(confirmModalEl);
    if (detailsModalEl) detailsModal = new bootstrap.Modal(detailsModalEl);
    if (clientModalEl) clientModal = new bootstrap.Modal(clientModalEl);
    if (packageModalEl) packageModal = new bootstrap.Modal(packageModalEl);

    checkAuthState();
    initThemeSwitchAdmin();
    initDragAndDrop();
    initLoginForm();
    initUploadForm();
    initLogout();
    initCursorGlow();
    initScrollProgress();
    initTabNavigation();
    initSearchAndFilters();
    initMobileSidebarToggle();
    initEditProjectForm();
    initTaskTrackerForm();
    initClientsManagement();
    initPackagesManagement();
    
    // Check for unread chat messages
    setTimeout(() => {
        if (localStorage.getItem('adminToken')) {
            updateAdminChatBadge();
            setInterval(updateAdminChatBadge, 10000);
            
            // Request desktop notification permission
            if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
            }
        }
    }, 1000);
});

// Toast notification helper
function showToast(message, isSuccess = true) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMsg = document.getElementById('toastMessage');

    if (!toast) return;

    toast.className = `toast-notification show ${isSuccess ? 'success' : 'error'}`;
    toastIcon.className = `fa-solid ${isSuccess ? 'fa-circle-check' : 'fa-circle-exclamation'}`;
    toastMsg.textContent = message;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Authentication Check
function checkAuthState() {
    const token = localStorage.getItem('adminToken');
    const dashboardPanel = document.getElementById('dashboardPanel');
    const adminSidebar = document.getElementById('adminSidebar');
    const mobileHeader = document.getElementById('mobileHeader');

    if (token) {
        if (dashboardPanel) dashboardPanel.style.display = 'block';
        if (adminSidebar) adminSidebar.style.display = '';
        if (mobileHeader) mobileHeader.style.display = '';
        
        // Fetch Admin Data
        loadAdminProjects();
        loadAdminLeads();
        loadStaff();
        loadPackages();
        loadClients();
        loadTasks();
    } else {
        window.location.href = '/dss?role=admin';
    }
}

// Login Process
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const tabAdmin = document.getElementById('loginTabAdmin');
    const tabStaff = document.getElementById('loginTabStaff');
    const portalTitle = document.getElementById('loginPortalTitle');
    const portalSubtitle = document.getElementById('loginPortalSubtitle');
    const usernameLabel = document.getElementById('loginUsernameLabel');
    const usernameInput = document.getElementById('usernameOrEmail');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const togglePasswordIcon = document.getElementById('togglePasswordIcon');

    let activeRole = 'admin'; // default role for admin.html

    const updateRoleUI = (role) => {
        activeRole = role;
        if (role === 'admin') {
            tabAdmin.classList.add('active');
            tabStaff.classList.remove('active');
            if (portalTitle) portalTitle.textContent = 'Admin Portal';
            if (portalSubtitle) portalSubtitle.textContent = 'Enter credentials to manage works';
            if (usernameLabel) usernameLabel.textContent = 'Username';
            if (usernameInput) {
                usernameInput.type = 'text';
                usernameInput.placeholder = 'e.g. admin';
                usernameInput.value = '';
            }
        } else {
            tabStaff.classList.add('active');
            tabAdmin.classList.remove('active');
            if (portalTitle) portalTitle.textContent = 'Staff Portal';
            if (portalSubtitle) portalSubtitle.textContent = 'Enter credentials to log attendance & tasks';
            if (usernameLabel) usernameLabel.textContent = 'Email Address';
            if (usernameInput) {
                usernameInput.type = 'email';
                usernameInput.placeholder = 'e.g. staff@dss.com';
                usernameInput.value = '';
            }
        }
    };

    if (tabAdmin) tabAdmin.addEventListener('click', () => updateRoleUI('admin'));
    if (tabStaff) tabStaff.addEventListener('click', () => updateRoleUI('staff'));

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            if (togglePasswordIcon) {
                togglePasswordIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameOrEmail = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        try {
            if (activeRole === 'admin') {
                // Call Admin Login API
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: usernameOrEmail, password })
                });
                const data = await response.json();

                if (response.ok && data.success) {
                    localStorage.setItem('adminToken', data.token);
                    document.cookie = `adminToken=${data.token}; path=/; max-age=86400; SameSite=Strict`;
                    showToast('Login successful! Welcome to DSS Panel.', true);
                    checkAuthState();
                    form.reset();
                } else {
                    showToast(data.message || 'Invalid username or password!', false);
                }
            } else {
                // Call Staff Login API
                const response = await fetch('/api/staff/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: usernameOrEmail, password })
                });
                const data = await response.json();

                if (response.ok && data.success) {
                    localStorage.setItem('staffToken', data.token);
                    document.cookie = `staffToken=${data.token}; path=/; max-age=86400; SameSite=Strict`;
                    showToast('Login successful! Redirecting to Staff Workspace...', true);
                    form.reset();
                    setTimeout(() => {
                        window.location.href = '/staff';
                    }, 1000);
                } else {
                    showToast(data.message || 'Invalid email or password!', false);
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Connection to server failed. Please try again.', false);
        }
    });
}

// Logout
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        document.cookie = "adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
        showToast('Logged out successfully.', true);
        checkAuthState();
    });
}

// Tab navigation controller
function initTabNavigation() {
    const links = document.querySelectorAll('.sidebar-menu .menu-link');
    const contents = document.querySelectorAll('.tab-content');

    links.forEach(link => {
        link.addEventListener('click', () => {
            const targetTab = link.getAttribute('data-tab');
            if (!targetTab) return;

            // Clear chat polling interval if switching away from messages tab
            if (targetTab !== 'messages' && chatPollInterval) {
                clearInterval(chatPollInterval);
                chatPollInterval = null;
            }

            // Update active menu link
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show/Hide tab content
            contents.forEach(content => {
                if (content.id === `tab-${targetTab}`) {
                    content.style.display = 'block';
                    // Trigger redraw of charts on dashboard tab select
                    if (targetTab === 'overview') {
                        setTimeout(() => {
                            if (timelineChart) timelineChart.resize();
                            if (servicesChart) servicesChart.resize();
                        }, 50);
                    }
                    if (targetTab === 'staff-attendance') {
                        loadAttendanceLogs();
                    }
                    if (targetTab === 'brand-logos-mgmt') {
                        loadBrandLogos();
                    }
                    if (targetTab === 'reviews-mgmt') {
                        loadReviews();
                    }
                    if (targetTab === 'messages') {
                        loadChatContacts();
                    }
                } else {
                    content.style.display = 'none';
                }
            });
        });
    });
}

// Mobile sidebar toggler
function initMobileSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('adminSidebar');
    if (!toggleBtn || !sidebar) return;

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('show');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 992 && sidebar.classList.contains('show') && !sidebar.contains(e.target) && e.target !== toggleBtn) {
            sidebar.classList.remove('show');
        }
    });

    // Close sidebar when clicking a link
    const links = sidebar.querySelectorAll('.menu-link');
    links.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 992) {
                sidebar.classList.remove('show');
            }
        });
    });
}

// Search and filters
function initSearchAndFilters() {
    const searchProjectsInput = document.getElementById('searchProjects');
    const filterProjCategorySelect = document.getElementById('filterProjectsCategory');
    if (searchProjectsInput) searchProjectsInput.addEventListener('input', filterProjects);
    if (filterProjCategorySelect) filterProjCategorySelect.addEventListener('change', filterProjects);

    const searchLeadsInput = document.getElementById('searchLeads');
    const filterLeadsServiceSelect = document.getElementById('filterLeadsService');
    const filterLeadsStatusSelect = document.getElementById('filterLeadsStatus');
    if (searchLeadsInput) searchLeadsInput.addEventListener('input', filterLeads);
    if (filterLeadsServiceSelect) filterLeadsServiceSelect.addEventListener('change', filterLeads);
    if (filterLeadsStatusSelect) filterLeadsStatusSelect.addEventListener('change', filterLeads);
}

// Filters implementation for Projects
function filterProjects() {
    const query = document.getElementById('searchProjects').value.toLowerCase().trim();
    const category = document.getElementById('filterProjectsCategory').value;
    const grid = document.getElementById('worksGrid');
    const emptyState = document.getElementById('projectsEmptyState');

    if (!grid) return;

    const cards = grid.querySelectorAll('.work-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const title = card.getAttribute('data-title').toLowerCase();
        const cat = card.getAttribute('data-category');

        const matchesQuery = title.includes(query);
        const matchesCategory = (category === 'all' || cat === category);

        if (matchesQuery && matchesCategory) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    if (visibleCount === 0 && projectsList.length > 0) {
        emptyState.style.display = 'block';
        grid.style.display = 'none';
    } else if (projectsList.length > 0) {
        emptyState.style.display = 'none';
        grid.style.display = 'grid';
    }
}

// Filters implementation for Leads
function filterLeads() {
    const query = document.getElementById('searchLeads').value.toLowerCase().trim();
    const service = document.getElementById('filterLeadsService').value;
    const status = document.getElementById('filterLeadsStatus').value;
    const tableBody = document.getElementById('leadsTableBody');
    const emptyState = document.getElementById('leadsEmptyState');

    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('tr.lead-row');
    let visibleCount = 0;

    rows.forEach(row => {
        const name = row.getAttribute('data-name').toLowerCase();
        const email = row.getAttribute('data-email').toLowerCase();
        const phone = row.getAttribute('data-phone').toLowerCase();
        const message = row.getAttribute('data-message').toLowerCase();
        const srv = row.getAttribute('data-service');
        const stat = row.getAttribute('data-status');

        const matchesQuery = name.includes(query) || email.includes(query) || phone.includes(query) || message.includes(query);
        const matchesService = (service === 'all' || srv === service);
        const matchesStatus = (status === 'all' || stat === status);

        if (matchesQuery && matchesService && matchesStatus) {
            row.style.display = 'table-row';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    const tableEl = tableBody.closest('table');
    if (visibleCount === 0 && leadsList.length > 0) {
        emptyState.style.display = 'block';
        if (tableEl) tableEl.style.display = 'none';
    } else if (leadsList.length > 0) {
        emptyState.style.display = 'none';
        if (tableEl) tableEl.style.display = 'table';
    }
}

// Confirmation modal helper
function showConfirmModal(message, onConfirm) {
    const modalMsg = document.getElementById('confirmModalMessage');
    const confirmBtn = document.getElementById('confirmModalBtn');
    if (!modalMsg || !confirmBtn || !confirmModal) return;

    modalMsg.textContent = message;
    confirmModalCallback = onConfirm;

    confirmBtn.onclick = async () => {
        if (confirmModalCallback) {
            await confirmModalCallback();
        }
        confirmModal.hide();
    };

    confirmModal.show();
}

// Drag and Drop File Upload Handling
function initDragAndDrop() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('projectFile');
    const previewContainer = document.getElementById('previewContainer');
    const previewMedia = document.getElementById('previewMedia');
    const removePreview = document.getElementById('removePreview');

    if (!dropzone || !fileInput) return;

    // Trigger click on file input when clicking dropzone
    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFilesSelect(e.target.files);
        }
    });

    // Drag-over styling
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFilesSelect(files);
        }
    });

    // Remove selected file and preview
    removePreview.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFiles = [];
        fileInput.value = '';
        previewMedia.innerHTML = '';
        previewContainer.style.display = 'none';
        dropzone.style.display = 'block';
        fileInput.required = true;
    });

    function handleFilesSelect(filesList) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
        
        // Convert FileList to array
        const files = Array.from(filesList);
        
        const validFiles = [];
        for (let file of files) {
            if (!allowedTypes.includes(file.type)) {
                showToast(`Skipped "${file.name}": Unsupported format.`, false);
                continue;
            }
            if (file.size > 20 * 1024 * 1024) {
                showToast(`Skipped "${file.name}": Exceeds 20MB limit.`, false);
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0 && selectedFiles.length === 0) return;

        // Merge files
        selectedFiles = [...selectedFiles, ...validFiles];
        
        previewMedia.innerHTML = '';
        
        // Render a grid of previews
        const gridDiv = document.createElement('div');
        gridDiv.className = 'd-grid';
        gridDiv.style.gridTemplateColumns = 'repeat(auto-fill, minmax(100px, 1fr))';
        gridDiv.style.gap = '10px';
        gridDiv.style.width = '100%';
        previewMedia.appendChild(gridDiv);

        selectedFiles.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.style.position = 'relative';
            previewItem.style.width = '100%';
            previewItem.style.paddingTop = '100%';
            previewItem.style.borderRadius = '6px';
            previewItem.style.overflow = 'hidden';
            previewItem.style.border = '1px solid rgba(255,255,255,0.1)';

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.innerHTML = '&times;';
            removeBtn.style.position = 'absolute';
            removeBtn.style.top = '3px';
            removeBtn.style.right = '3px';
            removeBtn.style.background = 'rgba(0,0,0,0.7)';
            removeBtn.style.color = '#fff';
            removeBtn.style.border = 'none';
            removeBtn.style.borderRadius = '50%';
            removeBtn.style.width = '18px';
            removeBtn.style.height = '18px';
            removeBtn.style.display = 'flex';
            removeBtn.style.alignItems = 'center';
            removeBtn.style.justifyContent = 'center';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.zIndex = '10';
            removeBtn.style.fontSize = '12px';
            removeBtn.style.lineHeight = '1';

            removeBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                selectedFiles.splice(index, 1);
                if (selectedFiles.length === 0) {
                    removePreview.click();
                } else {
                    handleFilesSelect([]); // Re-render preview grid
                }
            });

            previewItem.appendChild(removeBtn);

            if (file.type.startsWith('video/')) {
                const videoURL = URL.createObjectURL(file);
                const videoEl = document.createElement('video');
                videoEl.src = videoURL;
                videoEl.style.position = 'absolute';
                videoEl.style.top = '0';
                videoEl.style.left = '0';
                videoEl.style.width = '100%';
                videoEl.style.height = '100%';
                videoEl.style.objectFit = 'cover';
                videoEl.muted = true;
                videoEl.autoplay = true;
                videoEl.loop = true;
                previewItem.appendChild(videoEl);
            } else {
                const imgEl = document.createElement('img');
                imgEl.style.position = 'absolute';
                imgEl.style.top = '0';
                imgEl.style.left = '0';
                imgEl.style.width = '100%';
                imgEl.style.height = '100%';
                imgEl.style.objectFit = 'cover';
                
                const reader = new FileReader();
                reader.onload = (ev) => {
                    imgEl.src = ev.target.result;
                };
                reader.readAsDataURL(file);
                previewItem.appendChild(imgEl);
            }

            gridDiv.appendChild(previewItem);
        });

        dropzone.style.display = 'none';
        previewContainer.style.display = 'block';
        fileInput.required = false;
    }

    // Thumbnail zone handlers
    const thumbDropzone = document.getElementById('thumbnailDropzone');
    const thumbFileInput = document.getElementById('projectThumbnailFile');
    const thumbPreviewContainer = document.getElementById('thumbnailPreviewContainer');
    const thumbPreviewMedia = document.getElementById('previewThumbnailMedia');
    const removeThumbPreview = document.getElementById('removeThumbnailPreview');

    if (thumbDropzone && thumbFileInput) {
        thumbDropzone.addEventListener('click', () => thumbFileInput.click());

        thumbFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleThumbFileSelect(e.target.files[0]);
            }
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            thumbDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                thumbDropzone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            thumbDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                thumbDropzone.classList.remove('dragover');
            }, false);
        });

        thumbDropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleThumbFileSelect(files[0]);
            }
        });

        removeThumbPreview.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedThumbnailFile = null;
            thumbFileInput.value = '';
            thumbPreviewMedia.innerHTML = '';
            thumbPreviewContainer.style.display = 'none';
            thumbDropzone.style.display = 'block';
        });

        function handleThumbFileSelect(file) {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                showToast('Unsupported thumbnail format! Please upload an image.', false);
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                showToast('Thumbnail is too large! Maximum limit is 5MB.', false);
                return;
            }

            selectedThumbnailFile = file;
            thumbPreviewMedia.innerHTML = '';

            const reader = new FileReader();
            const imgEl = document.createElement('img');
            reader.onload = (e) => {
                imgEl.src = e.target.result;
            };
            reader.readAsDataURL(file);
            thumbPreviewMedia.appendChild(imgEl);

            thumbDropzone.style.display = 'none';
            thumbPreviewContainer.style.display = 'block';
        }
    }
}

// Project upload submission
function initUploadForm() {
    const form = document.getElementById('uploadForm');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadBtnText = document.getElementById('uploadBtnText');
    const uploadSpinner = document.getElementById('uploadSpinner');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('projectTitle').value.trim();
        const category = document.getElementById('projectCategory').value;
        const description = document.getElementById('projectDescription').value.trim();
        const token = localStorage.getItem('adminToken');

        if (selectedFiles.length === 0) {
            showToast('Please select at least one file to upload.', false);
            return;
        }

        if (!token) {
            showToast('Session expired. Please log in again.', false);
            checkAuthState();
            return;
        }

        // Setup loading state
        uploadBtn.disabled = true;
        uploadBtnText.style.display = 'none';
        uploadSpinner.style.display = 'inline-block';

        const formData = new FormData();
        formData.append('title', title);
        formData.append('category', category);
        formData.append('description', description);
        selectedFiles.forEach(file => {
            formData.append('workFiles', file);
        });
        if (selectedThumbnailFile) {
            formData.append('thumbnailFile', selectedThumbnailFile);
        }

        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Work published successfully!', true);
                form.reset();
                document.getElementById('removePreview').click();
                const removeThumb = document.getElementById('removeThumbnailPreview');
                if (removeThumb) removeThumb.click();
                loadAdminProjects();
                
                // Switch to projects tab
                const projectsTabLink = document.getElementById('tabLinkProjects');
                if (projectsTabLink) projectsTabLink.click();
            } else {
                showToast(data.message || 'Upload failed!', false);
            }
        } catch (error) {
            console.error('Upload request error:', error);
            showToast('An error occurred during upload. Check connection.', false);
        } finally {
            // Restore button state
            uploadBtn.disabled = false;
            uploadBtnText.style.display = 'inline-block';
            uploadSpinner.style.display = 'none';
        }
    });
}

// Load uploaded works on admin panel
async function loadAdminProjects() {
    const grid = document.getElementById('worksGrid');
    const loadingState = document.getElementById('projectsLoadingState');
    const emptyState = document.getElementById('projectsEmptyState');
    if (!grid) return;

    try {
        const response = await fetch('/api/projects');
        const data = await response.json();

        if (data.success && data.projects) {
            projectsList = data.projects;
            updateStatsCounters();

            if (projectsList.length === 0) {
                loadingState.style.display = 'none';
                emptyState.style.display = 'block';
                grid.style.display = 'none';
                return;
            }

            loadingState.style.display = 'none';
            emptyState.style.display = 'none';
            grid.style.display = 'grid';
            grid.innerHTML = '';

            const categoryLabels = {
                'graphics': 'Graphics Design',
                'branding': 'Branding Identity',
                'packaging': 'Packaging Design',
                'social-media': 'Social Media Design',
                'video': 'Video Ads',
                'marketing': 'Digital Marketing'
            };

            // Order projects by date descending
            const sortedProjects = [...projectsList].reverse();

            sortedProjects.forEach(proj => {
                const card = document.createElement('div');
                card.className = 'work-card';
                card.setAttribute('data-title', proj.title);
                card.setAttribute('data-category', proj.category);

                const mediaHTML = proj.fileType === 'video'
                    ? `<video src="${proj.imagePath}" muted loop playsinline autoplay></video>`
                    : `<img src="${proj.imagePath}" alt="${proj.title}" loading="lazy">`;

                const label = categoryLabels[proj.category] || proj.category;
                const dateStr = proj.createdAt ? new Date(proj.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

                card.innerHTML = `
                    <div class="work-media">
                        ${mediaHTML}
                    </div>
                    <div class="work-info">
                        <div class="work-title-text" title="${proj.title}">${proj.title}</div>
                        <div class="work-desc-text" title="${proj.description || 'No description provided.'}">${proj.description || 'No description provided.'}</div>
                        <div class="work-footer">
                            <span class="badge-dss">${label}</span>
                            <div class="d-flex align-items-center gap-2">
                                <span class="text-muted" style="font-size: 11px;">${dateStr}</span>
                                <button class="work-edit-btn" onclick="openEditProjectModal('${proj.id}')" title="Edit work" style="background: none; border: none; color: #ff9d1c; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button class="work-delete-btn" onclick="confirmDeleteProject('${proj.id}')" title="Delete work">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });

            filterProjects();
        }
    } catch (error) {
        console.error('Error fetching admin projects:', error);
        loadingState.innerHTML = `<span class="text-danger">Error loading projects from server.</span>`;
    }
}

// Delete a project confirmation
function confirmDeleteProject(id) {
    showConfirmModal('Are you sure you want to delete this portfolio work permanently? This action cannot be undone.', async () => {
        const token = localStorage.getItem('adminToken');
        try {
            const response = await fetch(`/api/projects/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Project deleted successfully.', true);
                loadAdminProjects();
            } else {
                showToast(data.message || 'Failed to delete project.', false);
            }
        } catch (error) {
            console.error('Delete request error:', error);
            showToast('Error connecting to the server.', false);
        }
    });
}
window.confirmDeleteProject = confirmDeleteProject;

// Load client leads
async function loadAdminLeads() {
    const tableBody = document.getElementById('leadsTableBody');
    const emptyState = document.getElementById('leadsEmptyState');
    if (!tableBody) return;

    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
        const response = await fetch('/api/admin/leads', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (data.success && data.leads) {
            leadsList = data.leads;
            updateStatsCounters();
            updateCharts();

            if (leadsList.length === 0) {
                tableBody.innerHTML = '';
                emptyState.style.display = 'block';
                const tableEl = tableBody.closest('table');
                if (tableEl) tableEl.style.display = 'none';
                return;
            }

            emptyState.style.display = 'none';
            const tableEl = tableBody.closest('table');
            if (tableEl) tableEl.style.display = 'table';
            tableBody.innerHTML = '';

            const serviceLabels = {
                'posts': 'Social Media Posts',
                'reels': 'Shorts / Reels',
                'branding': 'Branding Kit',
                'full-suite': 'Full Design Suite',
                'custom': 'Custom Requirement'
            };

            // Order leads by timestamp descending (newest first)
            const sortedLeads = [...leadsList].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            sortedLeads.forEach(lead => {
                const tr = document.createElement('tr');
                tr.className = 'lead-row';
                tr.setAttribute('data-id', lead.id);
                tr.setAttribute('data-name', lead.name);
                tr.setAttribute('data-email', lead.email);
                tr.setAttribute('data-phone', lead.phone);
                tr.setAttribute('data-message', lead.message);
                tr.setAttribute('data-service', lead.service);
                tr.setAttribute('data-status', lead.status);

                const date = new Date(lead.timestamp);
                const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                const serviceLabel = serviceLabels[lead.service] || lead.service;
                const messageSnippet = lead.message.length > 40 ? lead.message.substring(0, 40) + '...' : lead.message;

                tr.innerHTML = `
                    <td data-label="Date">
                        <span class="text-white fw-semibold">${dateStr}</span>
                        <div class="text-muted small" style="font-size: 11px;">${timeStr}</div>
                    </td>
                    <td data-label="Client">
                        <span class="text-white fw-bold">${lead.name}</span>
                        <div class="text-muted small" style="font-size: 12px;">${lead.email}</div>
                    </td>
                    <td data-label="Service">
                        <span class="badge-dss">${serviceLabel}</span>
                    </td>
                    <td data-label="Message Snippet">
                        <span class="text-muted" style="font-size: 14px;">${messageSnippet}</span>
                    </td>
                    <td data-label="Status">
                        <span class="lead-status-badge status-${lead.status}" onclick="cycleLeadStatus('${lead.id}', '${lead.status}')">
                            <i class="fa-solid ${lead.status === 'pending' ? 'fa-clock' : lead.status === 'contacted' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
                            ${lead.status}
                        </span>
                    </td>
                    <td data-label="Actions">
                        <div class="lead-actions justify-content-center">
                            <button class="lead-btn" onclick="viewLeadDetails('${lead.id}')" title="View full message">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <a class="lead-btn btn-whatsapp" href="${getWhatsAppLink(lead.phone, lead.name, serviceLabel)}" target="_blank" title="Chat on WhatsApp">
                                <i class="fa-brands fa-whatsapp"></i>
                            </a>
                            <button class="lead-btn btn-delete" onclick="confirmDeleteLead('${lead.id}')" title="Delete Inquiry">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            filterLeads();
        }
    } catch (error) {
        console.error('Error fetching admin leads:', error);
    }
}

// Cycle lead statuses sequentially
async function cycleLeadStatus(id, currentStatus) {
    let nextStatus = 'pending';
    if (currentStatus === 'pending') nextStatus = 'contacted';
    else if (currentStatus === 'contacted') nextStatus = 'spam';

    await updateLeadStatus(id, nextStatus);
}
window.cycleLeadStatus = cycleLeadStatus;

// Update Lead status call
async function updateLeadStatus(id, status) {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
        const response = await fetch(`/api/admin/leads/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast(`Lead status updated to ${status}.`, true);
            loadAdminLeads();
            const detailStatusSelect = document.getElementById('detailLeadStatusSelect');
            if (detailStatusSelect && detailStatusSelect.getAttribute('data-lead-id') === id) {
                detailStatusSelect.value = status;
            }
        } else {
            showToast(data.message || 'Failed to update status.', false);
        }
    } catch (error) {
        console.error('Status update request error:', error);
        showToast('Error connecting to the server.', false);
    }
}

// Format WhatsApp numbers (Indian specific prefix mapping)
function getWhatsAppLink(phone, name, service) {
    if (!phone || phone === 'N/A') return '#';
    
    let cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
        cleanPhone = cleanPhone.substring(1);
    }
    
    if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
    }
    
    const msg = `Hello ${name}, thank you for contacting Design Shaper Studio regarding "${service}". Let's discuss your requirements!`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

// Delete a lead confirmation modal
function confirmDeleteLead(id) {
    showConfirmModal('Are you sure you want to delete this lead inquiry permanently? This action cannot be undone.', async () => {
        const token = localStorage.getItem('adminToken');
        try {
            const response = await fetch(`/api/admin/leads/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Lead deleted successfully.', true);
                loadAdminLeads();
                const detailStatusSelect = document.getElementById('detailLeadStatusSelect');
                if (detailStatusSelect && detailStatusSelect.getAttribute('data-lead-id') === id) {
                    if (detailsModal) detailsModal.hide();
                }
            } else {
                showToast(data.message || 'Failed to delete lead.', false);
            }
        } catch (error) {
            console.error('Delete lead request error:', error);
            showToast('Error connecting to the server.', false);
        }
    });
}
window.confirmDeleteLead = confirmDeleteLead;

// Open Lead detail modal view
function viewLeadDetails(id) {
    const lead = leadsList.find(l => l.id === id);
    if (!lead || !detailsModal) return;

    const serviceLabels = {
        'posts': 'Social Media Posts',
        'reels': 'Shorts / Reels',
        'branding': 'Branding Kit',
        'full-suite': 'Full Design Suite',
        'custom': 'Custom Requirement'
    };

    document.getElementById('detailLeadName').textContent = lead.name;
    
    const emailLink = document.getElementById('detailLeadEmail');
    emailLink.textContent = lead.email;
    emailLink.href = `mailto:${lead.email}`;
    
    const phoneLink = document.getElementById('detailLeadPhone');
    phoneLink.textContent = lead.phone;
    phoneLink.href = lead.phone !== 'N/A' ? `tel:${lead.phone}` : '#';
    
    const serviceLabel = serviceLabels[lead.service] || lead.service;
    document.getElementById('detailLeadService').textContent = serviceLabel;
    
    const date = new Date(lead.timestamp);
    document.getElementById('detailLeadDate').textContent = date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const statusSelect = document.getElementById('detailLeadStatusSelect');
    statusSelect.value = lead.status;
    statusSelect.setAttribute('data-lead-id', lead.id);

    statusSelect.onchange = (e) => {
        updateLeadStatus(lead.id, e.target.value);
    };

    document.getElementById('detailLeadMessage').textContent = lead.message;

    // Actions panel
    const actionsContainer = document.getElementById('detailLeadActions');
    actionsContainer.innerHTML = `
        <a class="lead-btn btn-whatsapp px-3" href="${getWhatsAppLink(lead.phone, lead.name, serviceLabel)}" target="_blank" style="width: auto; gap: 8px;">
            <i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp
        </a>
        <a class="lead-btn px-3" href="mailto:${lead.email}" style="width: auto; gap: 8px;">
            <i class="fa-solid fa-envelope"></i> Email Client
        </a>
        ${lead.phone !== 'N/A' ? `
        <a class="lead-btn px-3" href="tel:${lead.phone}" style="width: auto; gap: 8px;">
            <i class="fa-solid fa-phone"></i> Call Client
        </a>` : ''}
        <button class="lead-btn btn-delete px-3 ms-2" onclick="confirmDeleteLead('${lead.id}')" style="width: auto; gap: 8px;">
            <i class="fa-solid fa-trash-can"></i> Delete
        </button>
    `;

    detailsModal.show();
}
window.viewLeadDetails = viewLeadDetails;

// Update Stats counters on Dashboard
function updateStatsCounters() {
    const statTotal = document.getElementById('statTotal');
    const statLeadsTotal = document.getElementById('statLeadsTotal');
    const statLeadsPending = document.getElementById('statLeadsPending');
    const statLeadsContacted = document.getElementById('statLeadsContacted');
    const pendingLeadsBadge = document.getElementById('pendingLeadsBadge');

    if (statTotal) {
        statTotal.textContent = projectsList.length;
    }

    if (statLeadsTotal) {
        statLeadsTotal.textContent = leadsList.length;
    }

    const pendingCount = leadsList.filter(l => l.status === 'pending').length;
    if (statLeadsPending) {
        statLeadsPending.textContent = pendingCount;
    }

    if (pendingLeadsBadge) {
        if (pendingCount > 0) {
            pendingLeadsBadge.textContent = pendingCount;
            pendingLeadsBadge.classList.remove('hide');
        } else {
            pendingLeadsBadge.classList.add('hide');
        }
    }

    if (statLeadsContacted) {
        statLeadsContacted.textContent = leadsList.filter(l => l.status === 'contacted').length;
    }
}

// Update Chart.js visualizations
function updateCharts() {
    const ctxTimeline = document.getElementById('leadsTimelineChart');
    const ctxServices = document.getElementById('leadsServicesChart');

    if (!ctxTimeline || !ctxServices) return;

    // --- Services Requested Chart (Doughnut) ---
    const serviceLabels = {
        'posts': 'Social Media Posts',
        'reels': 'Shorts / Reels',
        'branding': 'Branding Kit',
        'full-suite': 'Full Design Suite',
        'custom': 'Custom Requirement'
    };

    const counts = {};
    leadsList.forEach(l => {
        const label = serviceLabels[l.service] || l.service || 'Not specified';
        counts[label] = (counts[label] || 0) + 1;
    });

    const serviceLabelsArray = Object.keys(counts);
    const serviceDataArray = Object.values(counts);

    const isLight = document.documentElement.classList.contains('lightmode');
    const textSecondary = isLight ? '#52526b' : '#9a9ab0';
    const gridColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

    const chartColors = [
        '#fa9d1c', // primary accent orange
        '#ff5e3b', // red-orange
        '#ff2a5f', // pinkish red
        '#00e676', // success green
        '#00b8d4', // cyan info
        '#d500f9', // purple
        '#efbc2a'  // gold
    ];

    if (servicesChart) {
        servicesChart.data.labels = serviceLabelsArray;
        servicesChart.data.datasets[0].data = serviceDataArray;
        servicesChart.options.plugins.legend.labels.color = textSecondary;
        servicesChart.update();
    } else {
        servicesChart = new Chart(ctxServices, {
            type: 'doughnut',
            data: {
                labels: serviceLabelsArray,
                datasets: [{
                    data: serviceDataArray,
                    backgroundColor: chartColors,
                    borderColor: isLight ? '#ffffff' : '#0f0f15',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textSecondary,
                            font: { family: 'Quicksand', size: 12, weight: '500' }
                        }
                    }
                }
            }
        });
    }

    // --- Leads Timeline Chart (Area) ---
    const dates = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        dates[dateKey] = 0;
    }

    leadsList.forEach(l => {
        const dateKey = new Date(l.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (dates[dateKey] !== undefined) {
            dates[dateKey]++;
        }
    });

    const timelineLabels = Object.keys(dates);
    const timelineData = Object.values(dates);

    if (timelineChart) {
        timelineChart.data.labels = timelineLabels;
        timelineChart.data.datasets[0].data = timelineData;
        timelineChart.options.scales.x.ticks.color = textSecondary;
        timelineChart.options.scales.y.ticks.color = textSecondary;
        timelineChart.options.scales.x.grid.color = gridColor;
        timelineChart.options.scales.y.grid.color = gridColor;
        timelineChart.update();
    } else {
        timelineChart = new Chart(ctxTimeline, {
            type: 'line',
            data: {
                labels: timelineLabels,
                datasets: [{
                    label: 'Inquiries',
                    data: timelineData,
                    borderColor: '#fa9d1c',
                    backgroundColor: 'rgba(250, 157, 28, 0.15)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: '#ff5e3b',
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textSecondary, font: { family: 'Quicksand' } }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { 
                            color: textSecondary, 
                            font: { family: 'Quicksand' },
                            stepSize: 1,
                            precision: 0 
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

// Light & Dark theme toggle for Admin Panel
function initThemeSwitchAdmin() {
    const themeBtn = document.getElementById('themeSwitchAdmin');
    const themeIcon = document.getElementById('themeIconAdmin');
    const themeText = document.getElementById('themeTextAdmin');
    
    const themeBtnMobile = document.getElementById('themeSwitchAdminMobile');
    const themeIconMobile = document.getElementById('themeIconAdminMobile');

    const logoImg = document.getElementById('logoImg');
    const sidebarLogoImg = document.getElementById('sidebarLogoImg');
    const mobileLogo = document.getElementById('mobileLogo');

    if (!themeBtn) return;

    const updateLogos = (isLight) => {
        const logoPath = isLight ? './image/logo-dark.png' : './image/logo-light.png';
        if (logoImg) logoImg.src = logoPath;
        if (sidebarLogoImg) sidebarLogoImg.src = logoPath;
        if (mobileLogo) mobileLogo.src = logoPath;
    };

    const setTheme = (isLight) => {
        if (isLight) {
            document.documentElement.classList.add('lightmode');
            if (themeIcon) themeIcon.className = 'fas fa-sun';
            if (themeIconMobile) themeIconMobile.className = 'fas fa-sun';
            if (themeText) themeText.textContent = 'Light Mode';
            localStorage.setItem('lightmode', 'active');
        } else {
            document.documentElement.classList.remove('lightmode');
            if (themeIcon) themeIcon.className = 'fas fa-moon';
            if (themeIconMobile) themeIconMobile.className = 'fas fa-moon';
            if (themeText) themeText.textContent = 'Dark Mode';
            localStorage.removeItem('lightmode');
        }
        updateLogos(isLight);
        updateCharts(); // Refresh chart styles for new theme
    };

    const isLightModeActive = localStorage.getItem('lightmode') === 'active';
    setTheme(isLightModeActive);

    const toggleTheme = () => {
        const currentMode = document.documentElement.classList.contains('lightmode');
        setTheme(!currentMode);
    };

    themeBtn.addEventListener('click', toggleTheme);
    if (themeBtnMobile) themeBtnMobile.addEventListener('click', toggleTheme);
}

// Background Cursor Glow Effect
function initCursorGlow() {
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

// Top Scroll Progress Bar
function initScrollProgress() {
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

// ========================================================================
// EDIT PORTFOLIO WORK LOGIC
// ========================================================================
let editSelectedFiles = [];
let editExistingMediaPaths = [];
let editProjectModalInstance = null;

function initEditProjectForm() {
    const editModalEl = document.getElementById('editProjectModal');
    if (!editModalEl) return;
    
    editProjectModalInstance = new bootstrap.Modal(editModalEl);
    
    const editForm = document.getElementById('editProjectForm');
    const editFilesInput = document.getElementById('editProjectFiles');
    const editDropzone = document.getElementById('editDropzone');
    
    if (editDropzone && editFilesInput) {
        editDropzone.addEventListener('click', () => editFilesInput.click());
        
        editFilesInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleEditFilesSelect(e.target.files);
            }
        });
        
        // Drag events
        ['dragenter', 'dragover'].forEach(eventName => {
            editDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                editDropzone.classList.add('dragover');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            editDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                editDropzone.classList.remove('dragover');
            }, false);
        });
        
        editDropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt.files.length > 0) {
                handleEditFilesSelect(dt.files);
            }
        });
    }
    
    if (editForm) {
        editForm.addEventListener('submit', handleEditProjectSubmit);
    }
}

function handleEditFilesSelect(filesList) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    const files = Array.from(filesList);
    const validFiles = [];
    
    for (let file of files) {
        if (!allowedTypes.includes(file.type)) {
            showToast(`Skipped "${file.name}": Unsupported format.`, false);
            continue;
        }
        if (file.size > 20 * 1024 * 1024) {
            showToast(`Skipped "${file.name}": Exceeds 20MB limit.`, false);
            continue;
        }
        validFiles.push(file);
    }
    
    editSelectedFiles = [...editSelectedFiles, ...validFiles];
    renderEditNewFilesGrid();
}

function renderEditNewFilesGrid() {
    const grid = document.getElementById('editNewFilesPreviewGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    editSelectedFiles.forEach((file, index) => {
        const previewItem = document.createElement('div');
        previewItem.style.position = 'relative';
        previewItem.style.width = '100%';
        previewItem.style.paddingTop = '100%';
        previewItem.style.borderRadius = '6px';
        previewItem.style.overflow = 'hidden';
        previewItem.style.border = '1px solid rgba(255,255,255,0.1)';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.innerHTML = '&times;';
        removeBtn.style.position = 'absolute';
        removeBtn.style.top = '3px';
        removeBtn.style.right = '3px';
        removeBtn.style.background = 'rgba(0,0,0,0.7)';
        removeBtn.style.color = '#fff';
        removeBtn.style.border = 'none';
        removeBtn.style.borderRadius = '50%';
        removeBtn.style.width = '18px';
        removeBtn.style.height = '18px';
        removeBtn.style.display = 'flex';
        removeBtn.style.alignItems = 'center';
        removeBtn.style.justifyContent = 'center';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.zIndex = '10';
        removeBtn.style.fontSize = '12px';
        
        removeBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            editSelectedFiles.splice(index, 1);
            renderEditNewFilesGrid();
        });
        
        previewItem.appendChild(removeBtn);
        
        const mediaContainer = document.createElement('div');
        mediaContainer.style.position = 'absolute';
        mediaContainer.style.top = '0';
        mediaContainer.style.left = '0';
        mediaContainer.style.width = '100%';
        mediaContainer.style.height = '100%';
        
        const reader = new FileReader();
        if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.playsInline = true;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            mediaContainer.appendChild(video);
        } else {
            const img = document.createElement('img');
            reader.onload = (event) => {
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            mediaContainer.appendChild(img);
        }
        
        previewItem.appendChild(mediaContainer);
        grid.appendChild(previewItem);
    });
}

async function openEditProjectModal(projectId) {
    const project = projectsList.find(p => p.id === projectId);
    if (!project) return;
    
    document.getElementById('editProjectId').value = project.id;
    document.getElementById('editProjectTitle').value = project.title;
    document.getElementById('editProjectCategory').value = project.category;
    document.getElementById('editProjectDesc').value = project.description || '';
    
    // Clear selections
    editSelectedFiles = [];
    document.getElementById('editProjectFiles').value = '';
    document.getElementById('editNewFilesPreviewGrid').innerHTML = '';
    document.getElementById('editThumbnailFile').value = '';
    
    // Set existing paths
    editExistingMediaPaths = project.mediaPaths ? [...project.mediaPaths] : [project.imagePath];
    renderEditExistingFilesGrid(project);
    
    if (editProjectModalInstance) {
        editProjectModalInstance.show();
    }
}

function renderEditExistingFilesGrid(project) {
    const grid = document.getElementById('editExistingMediaGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    editExistingMediaPaths.forEach((path, index) => {
        const previewItem = document.createElement('div');
        previewItem.style.position = 'relative';
        previewItem.style.width = '100%';
        previewItem.style.paddingTop = '100%';
        previewItem.style.borderRadius = '6px';
        previewItem.style.overflow = 'hidden';
        previewItem.style.border = '1px solid rgba(255,255,255,0.1)';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.innerHTML = '&times;';
        removeBtn.style.position = 'absolute';
        removeBtn.style.top = '3px';
        removeBtn.style.right = '3px';
        removeBtn.style.background = 'rgba(230, 57, 70, 0.9)';
        removeBtn.style.color = '#fff';
        removeBtn.style.border = 'none';
        removeBtn.style.borderRadius = '50%';
        removeBtn.style.width = '18px';
        removeBtn.style.height = '18px';
        removeBtn.style.display = 'flex';
        removeBtn.style.alignItems = 'center';
        removeBtn.style.justifyContent = 'center';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.zIndex = '10';
        removeBtn.style.fontSize = '12px';
        
        removeBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            editExistingMediaPaths.splice(index, 1);
            renderEditExistingFilesGrid(project);
        });
        
        previewItem.appendChild(removeBtn);
        
        const mediaContainer = document.createElement('div');
        mediaContainer.style.position = 'absolute';
        mediaContainer.style.top = '0';
        mediaContainer.style.left = '0';
        mediaContainer.style.width = '100%';
        mediaContainer.style.height = '100%';
        
        const oldIndex = (project.mediaPaths || [project.imagePath]).indexOf(path);
        const fileType = oldIndex !== -1 ? (project.mediaTypes || [project.fileType])[oldIndex] : 'image';
        
        if (fileType === 'video') {
            const video = document.createElement('video');
            video.src = path;
            video.muted = true;
            video.playsInline = true;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            mediaContainer.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = path;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            mediaContainer.appendChild(img);
        }
        
        previewItem.appendChild(mediaContainer);
        grid.appendChild(previewItem);
    });
}

async function handleEditProjectSubmit(e) {
    e.preventDefault();
    
    const projectId = document.getElementById('editProjectId').value;
    const title = document.getElementById('editProjectTitle').value.trim();
    const category = document.getElementById('editProjectCategory').value;
    const description = document.getElementById('editProjectDesc').value.trim();
    const thumbnailFile = document.getElementById('editThumbnailFile').files[0];
    
    if (!title || !category) {
        showToast('Title and Category are required.', false);
        return;
    }
    
    if (editExistingMediaPaths.length === 0 && editSelectedFiles.length === 0) {
        showToast('At least one image or video is required.', false);
        return;
    }
    
    const submitBtn = document.getElementById('editProjectSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving Changes...';
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('keepMediaPaths', JSON.stringify(editExistingMediaPaths));
    
    editSelectedFiles.forEach(file => {
        formData.append('workFiles', file);
    });
    
    if (thumbnailFile) {
        formData.append('thumbnailFile', thumbnailFile);
    }
    
    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Portfolio work updated successfully!', true);
            if (editProjectModalInstance) {
                editProjectModalInstance.hide();
            }
            loadAdminProjects();
        } else {
            showToast(data.message || 'Error updating work.', false);
        }
    } catch (err) {
        console.error('Error submitting edit:', err);
        showToast('Server connection failed.', false);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
}

// ========================================================================
// TASK TRACKING & STAFF MANAGEMENT CONTROLLER
// ========================================================================

// Tab Switching Utility
function switchTab(tabName) {
    const links = document.querySelectorAll('.sidebar-menu .menu-link');
    const contents = document.querySelectorAll('.tab-content');
    
    links.forEach(link => {
        const targetTab = link.getAttribute('data-tab');
        if (targetTab === tabName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    contents.forEach(content => {
        if (content.id === `tab-${tabName}`) {
            content.style.display = 'block';
            if (tabName === 'calendar') {
                renderCalendar();
            }
        } else {
            content.style.display = 'none';
        }
    });
}
window.switchTab = switchTab;

// 1. Fetch data from backend APIs
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            }
        });
        const data = await response.json();
        if (data.success) {
            tasksList = data.tasks.sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (parseInt(a.id.replace('task-', '')) || 0);
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (parseInt(b.id.replace('task-', '')) || 0);
                return timeB - timeA;
            });
            loadNotifications();
            renderDashboard();
            renderAllTasks();
            renderCalendar();
            updateStaffWiseReport();
        }
    } catch (err) {
        console.error('Error loading tasks:', err);
    }
}

async function loadStaff() {
    try {
        const response = await fetch('/api/staff', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            }
        });
        const data = await response.json();
        if (data.success) {
            staffList = data.staff;
            
            // Populate select dropdown fields
            const assignSelect = document.getElementById('taskAssignee');
            const modalAssignSelect = document.getElementById('modalTaskAssignee');
            const dashboardFilter = document.getElementById('dashboardFilterStaff');
            const allFilter = document.getElementById('allFilterStaff');
            const reportSelect = document.getElementById('reportStaffSelector');
            
            if (assignSelect) {
                assignSelect.innerHTML = '<option value="" disabled selected>Select Staff Member</option>';
                staffList.forEach(s => {
                    assignSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.role})</option>`;
                });
            }
            if (modalAssignSelect) {
                modalAssignSelect.innerHTML = '<option value="" disabled selected>Select Staff Member</option>';
                staffList.forEach(s => {
                    modalAssignSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.role})</option>`;
                });
            }
            if (dashboardFilter) {
                dashboardFilter.innerHTML = '<option value="all">All Staff</option>';
                staffList.forEach(s => {
                    dashboardFilter.innerHTML += `<option value="${s.id}">${s.name}</option>`;
                });
            }
            if (allFilter) {
                allFilter.innerHTML = '<option value="all">All Staff</option>';
                staffList.forEach(s => {
                    allFilter.innerHTML += `<option value="${s.id}">${s.name}</option>`;
                });
            }
            if (reportSelect) {
                reportSelect.innerHTML = '';
                staffList.forEach(s => {
                    reportSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
                });
            }
            
            renderStaffTable();
            updateStaffWiseReport();
        }
    } catch (err) {
        console.error('Error loading staff:', err);
    }
}

async function loadClients() {
    try {
        const response = await fetch('/api/clients', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            }
        });
        const data = await response.json();
        if (data.success) {
            clientsList = data.clients;
            const clientCountEl = document.getElementById('statTotalClients');
            if (clientCountEl) {
                clientCountEl.textContent = clientsList.length;
            }
            
            // Populate Client selects in Assign Task forms
            const taskClientSelect = document.getElementById('taskClient');
            const modalTaskClientSelect = document.getElementById('modalTaskClient');
            if (taskClientSelect) {
                taskClientSelect.innerHTML = '<option value="" disabled selected>Select Client</option>';
                clientsList.forEach(c => {
                    taskClientSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                });
            }
            if (modalTaskClientSelect) {
                modalTaskClientSelect.innerHTML = '<option value="" disabled selected>Select Client</option>';
                clientsList.forEach(c => {
                    modalTaskClientSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                });
            }
            
            renderClientsTable();
        }
    } catch (err) {
        console.error('Error loading clients:', err);
    }
}

async function loadAttendanceLogs() {
    try {
        const response = await fetch('/api/attendance/admin/all', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            }
        });
        const data = await response.json();
        if (data.success) {
            renderAttendanceLogs(data.logs || []);
        }
    } catch (err) {
        console.error('Error loading attendance logs:', err);
    }
}
window.loadAttendanceLogs = loadAttendanceLogs;

function formatHours(hoursDecimal) {
    if (!hoursDecimal || hoursDecimal <= 0) return '0 hrs';
    const hrs = Math.floor(hoursDecimal);
    const mins = Math.round((hoursDecimal - hrs) * 60);
    
    if (hrs === 0) {
        return `${mins} mins`;
    } else if (mins === 0) {
        return `${hrs} hrs`;
    } else {
        return `${hrs}h ${mins}m`;
    }
}

function renderAttendanceLogs(logs) {
    const dailyTbody = document.getElementById('adminAttendanceTableBody');
    const monthlyTbody = document.getElementById('adminMonthlyHoursTableBody');
    const emptyState = document.getElementById('adminAttendanceEmptyState');
    if (!dailyTbody || !monthlyTbody) return;

    dailyTbody.innerHTML = '';
    monthlyTbody.innerHTML = '';

    // 1. Render Daily punch logs (filter for today's date in local time)
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const todayLogs = logs.filter(l => l.date === todayStr);

    if (todayLogs.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        todayLogs.forEach(l => {
            const tr = document.createElement('tr');
            
            const punchInTime = new Date(l.punchIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const punchOutTime = l.punchOut 
                ? new Date(l.punchOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : '<span class="text-warning italic">Working...</span>';
            
            const duration = l.punchOut 
                ? formatHours(l.totalHours)
                : '<span class="text-warning italic">Active</span>';

            let statusBadge = '';
            if (l.status === 'present') {
                statusBadge = '<span class="badge bg-success" style="font-weight: 600; padding: 4px 8px; color: #ffffff !important;">Present</span>';
            } else if (l.status === 'late') {
                statusBadge = '<span class="badge bg-warning text-dark" style="font-weight: 600; padding: 4px 8px; color: #000000 !important;">Late Punch</span>';
            } else if (l.status === 'half_day') {
                statusBadge = '<span class="badge bg-danger" style="font-weight: 600; padding: 4px 8px; color: #ffffff !important;">Half Day</span>';
            }

            tr.innerHTML = `
                <td data-label="Staff Name">
                    <span class="fw-bold text-white">${l.staffName}</span>
                </td>
                <td data-label="Date">${l.date}</td>
                <td data-label="Punch In">${punchInTime}</td>
                <td data-label="Punch Out">${punchOutTime}</td>
                <td data-label="Duration">${duration}</td>
                <td data-label="Status">${statusBadge}</td>
            `;
            dailyTbody.appendChild(tr);
        });
    }

    // 2. Render Monthly Attendance Hours Aggregation
    // Aggregate by staff name/id
    const summary = {};
    
    // Make sure all current staff members are listed, even if they have 0 logs
    staffList.forEach(s => {
        summary[s.id] = {
            name: s.name,
            role: s.role,
            presentDays: 0,
            latePunches: 0,
            workingHours: 0
        };
    });

    // Populate from logs
    logs.forEach(l => {
        if (!summary[l.staffId]) {
            summary[l.staffId] = {
                name: l.staffName,
                role: 'Staff',
                presentDays: 0,
                latePunches: 0,
                workingHours: 0
            };
        }
        summary[l.staffId].presentDays += 1;
        if (l.status === 'late') {
            summary[l.staffId].latePunches += 1;
        }
        if (l.punchOut) {
            summary[l.staffId].workingHours += l.totalHours;
        }
    });

    // Render summary rows
    Object.keys(summary).forEach(staffId => {
        const s = summary[staffId];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Staff Name">
                <span class="fw-bold text-white">${s.name}</span>
                <div class="text-white-50 small mt-1">${s.role}</div>
            </td>
            <td data-label="Total Present Days">${s.presentDays} days</td>
            <td data-label="Late Punches"><span class="badge ${s.latePunches > 0 ? 'bg-warning text-dark' : 'bg-transparent text-white-50 border'}" style="padding: 4px 8px; color: ${s.latePunches > 0 ? '#000000 !important' : 'inherit'};">${s.latePunches}</span></td>
            <td data-label="Total Working Hours" class="fw-bold text-warning">${formatHours(s.workingHours)}</td>
        `;
        monthlyTbody.appendChild(tr);
    });
}

// 2. Render functions
function renderDashboard() {
    const total = tasksList.length;
    const pending = tasksList.filter(t => t.status === 'pending').length;
    const review = tasksList.filter(t => t.status === 'under_review').length;
    const completed = tasksList.filter(t => t.status === 'completed').length;
    const inProgress = tasksList.filter(t => t.status === 'in_progress').length;
    
    document.getElementById('statTotalTasks').textContent = total;
    document.getElementById('statPendingTasks').textContent = pending;
    document.getElementById('statReviewTasks').textContent = inProgress;
    document.getElementById('statCompletedTasks').textContent = completed;
    
    const clientCountEl = document.getElementById('statTotalClients');
    if (clientCountEl) {
        clientCountEl.textContent = clientsList.length;
    }
    
    // Doughnut chart drawing
    renderDashboardDoughnutChart(pending, inProgress, completed);
    
    // Alert list
    renderDueThisWeek();
    
    // Table population
    renderRecentTasksTable();
    
    // Notifications badge
    updateNotificationsCount();
    
    // Unread Chat Messages count card
    updateAdminChatBadge();
}

function renderDashboardDoughnutChart(pending, inProgress, completed) {
    const ctx = document.getElementById('tasksDoughnutChart');
    if (!ctx) return;
    
    const isLight = document.documentElement.classList.contains('lightmode');
    const textSecondary = isLight ? '#52526b' : '#9a9ab0';
    
    const chartData = [pending, inProgress, completed];
    const chartLabels = ['Pending', 'In Progress', 'Completed'];
    const chartColors = ['#fa9d1c', '#00bbf9', '#00e676'];
    
    if (tasksDoughnutChart) {
        tasksDoughnutChart.data.datasets[0].data = chartData;
        tasksDoughnutChart.data.datasets[0].borderColor = 'transparent';
        tasksDoughnutChart.data.datasets[0].borderWidth = 0;
        tasksDoughnutChart.update();
    } else {
        tasksDoughnutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderColor: 'transparent',
                    borderWidth: 0,
                    hoverBorderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

function renderDueThisWeek() {
    const container = document.getElementById('tasksDueThisWeekContainer');
    if (!container) return;
    container.innerHTML = '';
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);
    
    const dueTasks = tasksList.filter(t => t.status !== 'completed').sort((a,b) => new Date(a.deadline) - new Date(b.deadline));
    
    if (dueTasks.length === 0) {
        container.innerHTML = `<div class="text-muted text-center py-4 small">No active tasks due this week.</div>`;
        return;
    }
    
    dueTasks.forEach(t => {
        const dDate = new Date(t.deadline + 'T00:00:00');
        dDate.setHours(0,0,0,0);
        
        let badgeClass = 'alert-ontrack';
        let badgeText = 'On Track';
        
        if (dDate < today) {
            badgeClass = 'alert-overdue';
            badgeText = 'Overdue';
        } else if (dDate.getTime() === today.getTime()) {
            badgeClass = 'alert-today';
            badgeText = 'Due Today';
        } else if (dDate <= endOfWeek) {
            badgeClass = 'alert-soon';
            badgeText = 'Due Soon';
        }
        
        const card = document.createElement('div');
        card.className = `task-alert-item ${badgeClass}`;
        
        const formattedDate = new Date(t.deadline + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        card.innerHTML = `
            <div>
                <div class="text-white fw-bold" style="font-size: 13px;">${t.title}</div>
                <div class="text-muted small" style="font-size: 11px; margin-top: 2px;">Assigned to: ${t.assignedTo.name}</div>
            </div>
            <div class="text-end">
                <span class="badge-status status-${t.status}" style="font-size: 10px; padding: 2px 8px; margin-bottom: 4px;">${t.status.replace('_', ' ')}</span>
                <div class="text-muted small" style="font-size: 10px;">${formattedDate} <span class="ms-1 ${badgeClass === 'alert-overdue' ? 'text-danger' : badgeClass === 'alert-today' ? 'text-warning' : 'text-success'} fw-bold">(${badgeText})</span></div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

let dashboardCurrentPage = 1;
const dashboardPageSize = 5;

function renderRecentTasksTable() {
    const tbody = document.getElementById('dashboardTasksTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const query = document.getElementById('dashboardSearchTask').value.toLowerCase().trim();
    const statusFilter = document.getElementById('dashboardFilterStatus').value;
    const staffFilter = document.getElementById('dashboardFilterStaff').value;
    
    let filtered = tasksList;
    
    if (query) {
        filtered = filtered.filter(t => t.title.toLowerCase().includes(query) || t.client.toLowerCase().includes(query));
    }
    if (statusFilter !== 'all') {
        filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (staffFilter !== 'all') {
        filtered = filtered.filter(t => t.assignedTo.id === staffFilter);
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No tasks found matching filters.</td></tr>`;
        return;
    }
    
    filtered.forEach(t => {
        const row = document.createElement('tr');
        const formattedDate = new Date(t.deadline + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        
        row.innerHTML = `
            <td data-label="Task Title">
                <div class="fw-bold text-white">${t.title}</div>
                <div class="text-muted small">${t.description ? t.description.slice(0, 45) + (t.description.length > 45 ? '...' : '') : 'No guidelines'}</div>
            </td>
            <td data-label="Client">${t.client}</td>
            <td data-label="Assigned To">
                <div class="d-flex align-items-center gap-2">
                    <div style="width: 26px; height: 26px; border-radius: 50%; background: ${t.assignedTo.avatarColor || '#fa9d1c'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">
                        ${t.assignedTo.name.charAt(0)}
                    </div>
                    <span class="text-white-50 small">${t.assignedTo.name}</span>
                </div>
            </td>
            <td data-label="Deadline">${formattedDate}</td>
            <td data-label="Status">
                <span class="badge-status status-${t.status}">${t.status.replace('_', ' ')}</span>
            </td>
            <td data-label="Priority"><span class="priority-text priority-${t.priority}">${t.priority}</span></td>
            <td data-label="Actions" class="text-center">
                <button class="btn-action-dss btn-action-delete" onclick="confirmDeleteTask('${t.id}')" title="Delete Task"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

let allTasksCurrentPage = 1;
const allTasksPageSize = 10;

function renderAllTasks() {
    const tbody = document.getElementById('allTasksTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const query = document.getElementById('allSearchTask').value.toLowerCase().trim();
    const statusFilter = document.getElementById('allFilterStatus').value;
    const staffFilter = document.getElementById('allFilterStaff').value;
    const priorityFilter = document.getElementById('allFilterPriority').value;
    
    let filtered = tasksList;
    
    if (query) {
        filtered = filtered.filter(t => t.title.toLowerCase().includes(query) || t.client.toLowerCase().includes(query));
    }
    if (statusFilter !== 'all') {
        filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (staffFilter !== 'all') {
        filtered = filtered.filter(t => t.assignedTo.id === staffFilter);
    }
    if (priorityFilter !== 'all') {
        filtered = filtered.filter(t => t.priority === priorityFilter);
    }
    
    const totalCount = filtered.length;
    const pageCount = Math.ceil(totalCount / allTasksPageSize);
    
    if (allTasksCurrentPage > pageCount) allTasksCurrentPage = Math.max(1, pageCount);
    
    const start = (allTasksCurrentPage - 1) * allTasksPageSize;
    const end = Math.min(start + allTasksPageSize, totalCount);
    
    const paginated = filtered.slice(start, end);
    
    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No tasks found matching filters.</td></tr>`;
        document.getElementById('allPaginationInfo').textContent = 'Showing 0 to 0 of 0 tasks';
        document.getElementById('allPaginationControls').innerHTML = '';
        return;
    }
    
    paginated.forEach(t => {
        const row = document.createElement('tr');
        const formattedDate = new Date(t.deadline + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        
        row.innerHTML = `
            <td data-label="Task Title">
                <div class="fw-bold text-white">${t.title}</div>
                <div class="text-muted small">${t.description || 'No specific guidelines.'}</div>
            </td>
            <td data-label="Client">${t.client}</td>
            <td data-label="Assigned To">
                <div class="d-flex align-items-center gap-2">
                    <div style="width: 26px; height: 26px; border-radius: 50%; background: ${t.assignedTo.avatarColor || '#fa9d1c'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">
                        ${t.assignedTo.name.charAt(0)}
                    </div>
                    <span class="text-white-50 small">${t.assignedTo.name}</span>
                </div>
            </td>
            <td data-label="Deadline">${formattedDate}</td>
            <td data-label="Status">
                <span class="badge-status status-${t.status}">${t.status.replace('_', ' ')}</span>
            </td>
            <td data-label="Priority"><span class="priority-text priority-${t.priority}">${t.priority}</span></td>
            <td data-label="Actions" class="text-center">
                <button class="btn-action-dss btn-action-delete" onclick="confirmDeleteTask('${t.id}')" title="Delete Task"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('allPaginationInfo').textContent = `Showing ${start + 1} to ${end} of ${totalCount} tasks`;
    
    const controls = document.getElementById('allPaginationControls');
    controls.innerHTML = '';
    
    if (pageCount > 1) {
        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.className = `btn btn-sm ${i === allTasksCurrentPage ? 'btn-warning text-dark fw-bold' : 'btn-outline-dss text-white'}`;
            btn.style.width = '30px';
            btn.style.height = '30px';
            btn.style.borderRadius = '50%';
            btn.textContent = i;
            btn.addEventListener('click', () => {
                allTasksCurrentPage = i;
                renderAllTasks();
            });
            controls.appendChild(btn);
        }
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendarGridDays');
    const monthTitle = document.getElementById('calMonthTitle');
    if (!grid || !monthTitle) return;
    grid.innerHTML = '';
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    monthTitle.textContent = currentCalendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // TRAILING PREVIOUS MONTH
    for (let i = firstDay - 1; i >= 0; i--) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell inactive-month';
        const dayNum = prevMonthTotalDays - i;
        cell.innerHTML = `<div class="calendar-date-num">${dayNum}</div>`;
        grid.appendChild(cell);
    }
    
    // ACTIVE CURRENT MONTH DAYS
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        
        const cellDate = new Date(year, month, day);
        cellDate.setHours(0,0,0,0);
        
        if (cellDate.getTime() === today.getTime()) {
            cell.classList.add('today-cell');
        }
        
        cell.innerHTML = `
            <div class="calendar-date-header d-flex justify-content-between align-items-center w-100 mb-1">
                <div class="calendar-date-num">${day}</div>
                <button class="calendar-add-task-btn" title="Assign task on this date">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        `;
        
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = tasksList.filter(t => t.deadline === dateString);
        
        dayTasks.forEach(t => {
            const tag = document.createElement('div');
            tag.className = 'calendar-task-tag';
            
            let color = '#fa9d1c';
            if (t.status === 'in_progress') color = '#00bbf9';
            else if (t.status === 'under_review') color = '#9b5de5';
            else if (t.status === 'completed') color = '#00e676';
            
            tag.style.background = color;
            tag.textContent = t.title;
            tag.title = `${t.title} (${t.assignedTo.name}) - Status: ${t.status.replace('_', ' ')}`;
            tag.addEventListener('click', (ev) => {
                ev.stopPropagation();
                showTaskAlertDetails(t);
            });
            cell.appendChild(tag);
        });
        
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => {
            const dateInput = document.getElementById('modalTaskDeadline');
            if (dateInput) {
                dateInput.value = dateString;
            }
            const modalEl = document.getElementById('assignTaskModal');
            let modalInst = bootstrap.Modal.getInstance(modalEl);
            if (!modalInst) {
                modalInst = new bootstrap.Modal(modalEl);
            }
            modalInst.show();
        });
        
        grid.appendChild(cell);
    }
    
    // LEADING NEXT MONTH DAYS
    const totalRendered = firstDay + totalDays;
    const remainder = (7 - (totalRendered % 7)) % 7;
    for (let day = 1; day <= remainder; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell inactive-month';
        cell.innerHTML = `<div class="calendar-date-num">${day}</div>`;
        grid.appendChild(cell);
    }
}

function showTaskAlertDetails(t) {
    const existing = document.getElementById('task-detail-modal-container');
    if (existing) existing.remove();
    
    const wrapper = document.createElement('div');
    wrapper.id = 'task-detail-modal-container';
    wrapper.innerHTML = `
        <div class="modal fade" id="taskDetailModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content custom-modal-content" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 16px;">
                    <div class="modal-header custom-modal-header border-bottom" style="border-color: var(--border-color) !important;">
                        <h5 class="modal-title text-white fw-bold">Task Parameters</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body custom-modal-body text-white p-4">
                        <h4 class="text-warning fw-bold mb-2">${t.title}</h4>
                        <div class="mb-3 d-flex gap-2 align-items-center">
                            <span class="badge-status status-${t.status}">${t.status.replace('_', ' ')}</span>
                            <span class="priority-text priority-${t.priority}" style="font-size: 11px;">${t.priority} Priority</span>
                        </div>
                        <hr style="border-color: var(--border-color); opacity: 0.1;">
                        <div class="mb-3">
                            <strong class="text-white-50 d-block small mb-1">Client:</strong>
                            <span>${t.client}</span>
                        </div>
                        <div class="mb-3">
                            <strong class="text-white-50 d-block small mb-1">Assigned Staff:</strong>
                            <div class="d-flex align-items-center gap-2 mt-1">
                                <div style="width: 24px; height: 24px; border-radius: 50%; background: ${t.assignedTo.avatarColor || '#fa9d1c'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700;">
                                    ${t.assignedTo.name.charAt(0)}
                                </div>
                                <span class="text-white-50">${t.assignedTo.name} (${t.assignedTo.role})</span>
                            </div>
                        </div>
                        <div class="mb-3">
                            <strong class="text-white-50 d-block small mb-1">Deadline Date:</strong>
                            <span>${new Date(t.deadline + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div class="mb-2">
                            <strong class="text-white-50 d-block small mb-1">Task Guidelines:</strong>
                            <p class="text-secondary small mt-1" style="background: rgba(0,0,0,0.15); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">${t.description || 'No specific guidelines provided.'}</p>
                        </div>
                    </div>
                    <div class="modal-footer custom-modal-footer border-top" style="border-color: var(--border-color) !important;">
                        <button type="button" class="btn btn-outline-dss" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(wrapper);
    const bsModal = new bootstrap.Modal(document.getElementById('taskDetailModal'));
    bsModal.show();
}

function updateStaffWiseReport() {
    const reportSelect = document.getElementById('reportStaffSelector');
    if (!reportSelect) return;
    
    const staffId = reportSelect.value;
    if (!staffId) return;
    
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;
    
    const staffTasks = tasksList.filter(t => t.assignedTo.id === staffId);
    
    const total = staffTasks.length;
    const pending = staffTasks.filter(t => t.status === 'pending').length;
    const review = staffTasks.filter(t => t.status === 'under_review').length;
    const completed = staffTasks.filter(t => t.status === 'completed').length;
    const inProgress = staffTasks.filter(t => t.status === 'in_progress').length;
    
    document.getElementById('reportTotalTasks').textContent = total;
    document.getElementById('reportPendingTasks').textContent = pending;
    document.getElementById('reportReviewTasks').textContent = inProgress;
    document.getElementById('reportCompletedTasks').textContent = completed;
    
    document.getElementById('reportChartTitle').textContent = `Task Distribution - ${staff.name}`;
    
    // Drawing chart
    const ctx = document.getElementById('staffReportChart');
    if (!ctx) return;
    
    const isLight = document.documentElement.classList.contains('lightmode');
    const textSecondary = isLight ? '#52526b' : '#9a9ab0';
    
    const chartData = [pending, inProgress, completed];
    const chartLabels = ['Pending', 'In Progress', 'Completed'];
    const chartColors = ['#fa9d1c', '#00bbf9', '#00e676'];
    
    if (staffReportChart) {
        staffReportChart.data.datasets[0].data = chartData;
        staffReportChart.data.datasets[0].borderColor = 'transparent';
        staffReportChart.data.datasets[0].borderWidth = 0;
        staffReportChart.update();
    } else {
        staffReportChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderColor: 'transparent',
                    borderWidth: 0,
                    hoverBorderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

function renderStaffTable() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (staffList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No staff members found.</td></tr>`;
        return;
    }
    
    staffList.forEach(s => {
        const staffTasks = tasksList.filter(t => t.assignedTo.id === s.id);
        const completedCount = staffTasks.filter(t => t.status === 'completed').length;
        const totalCount = staffTasks.length;
        
        const perfPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Staff Member">
                <div class="d-flex align-items-center gap-2">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: ${s.avatarColor || '#fa9d1c'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">
                        ${s.name.charAt(0)}
                    </div>
                    <div>
                        <div class="fw-bold text-white">${s.name}</div>
                        <div class="text-muted small" style="font-size: 11px;">ID: ${s.id}</div>
                    </div>
                </div>
            </td>
            <td data-label="Role">
                <div class="text-white">${s.role}</div>
                <div class="text-muted small" style="font-size: 11px; margin-top: 2px;"><i class="fa-solid fa-clock me-1"></i> ${s.shift || 'Full Time'} (${s.shiftTime || '10:00 AM - 07:00 PM'})</div>
            </td>
            <td data-label="Contact Info">
                <div class="text-white-50" style="font-size: 13px;">${s.email || 'N/A'}</div>
                <div class="text-muted small" style="font-size: 11px; margin-top: 2px;">${s.mobile || 'N/A'}</div>
            </td>
            <td data-label="Performance" class="text-center">
                <div class="d-flex align-items-center justify-content-center gap-2">
                    <div class="progress w-100" style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; max-width: 100px;">
                        <div class="progress-bar bg-success" role="progressbar" style="width: ${perfPercent}%;" aria-valuenow="${perfPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <span class="fw-bold text-success" style="font-size: 12px; min-width: 35px; text-align: right;">${perfPercent}%</span>
                </div>
                <div class="text-muted small" style="font-size: 10px; margin-top: 2px;">(${completedCount}/${totalCount} tasks completed)</div>
            </td>
            <td data-label="Actions" class="text-center">
                <div class="d-flex align-items-center justify-content-center gap-2">
                    <button class="btn btn-sm btn-outline-info" onclick="viewStaffDetails('${s.id}')" title="View Details"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn btn-sm btn-outline-warning" onclick="openEditStaffModal('${s.id}')" title="Edit Staff"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteStaff('${s.id}')" title="Delete Staff"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadNotifications() {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    notificationsList = [];
    
    tasksList.forEach(t => {
        if (t.status === 'completed') return;
        
        const dDate = new Date(t.deadline + 'T00:00:00');
        dDate.setHours(0,0,0,0);
        
        if (dDate < today) {
            notificationsList.push({
                id: 'notif-overdue-' + t.id,
                title: 'Overdue Alert',
                desc: `Task "${t.title}" assigned to ${t.assignedTo.name} is overdue since ${new Date(t.deadline + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}!`,
                time: 'Immediate attention required',
                type: 'overdue',
                icon: 'fa-circle-exclamation',
                iconColor: '#e63946',
                iconBg: 'rgba(230,57,70,0.1)'
            });
        } else if (dDate.getTime() === today.getTime()) {
            notificationsList.push({
                id: 'notif-today-' + t.id,
                title: 'Urgent Task Due Today',
                desc: `Task "${t.title}" assigned to ${t.assignedTo.name} must be completed today!`,
                time: 'Due today',
                type: 'today',
                icon: 'fa-triangle-exclamation',
                iconColor: '#fa9d1c',
                iconBg: 'rgba(250,157,28,0.1)'
            });
        }
    });
    
    container.innerHTML = '';
    
    if (notificationsList.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5" id="notificationsEmptyState">
                No active notifications or alerts. All tasks are on schedule!
            </div>
        `;
        return;
    }
    
    notificationsList.forEach(n => {
        const card = document.createElement('div');
        card.className = 'notification-card';
        card.innerHTML = `
            <div class="notification-icon-wrapper" style="background: ${n.iconBg}; color: ${n.iconColor};">
                <i class="fa-solid ${n.icon}"></i>
            </div>
            <div class="notification-info">
                <div class="notification-title">${n.title}</div>
                <div class="notification-desc">${n.desc}</div>
                <div class="notification-time">${n.time}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

function updateNotificationsCount() {
    const badge = document.getElementById('notificationCountBadge');
    if (!badge) return;
    
    const count = notificationsList.length;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// 3. Setup event listeners and forms
function initTaskTrackerForm() {
    // Assign Task form submit
    const assignForm = document.getElementById('assignTaskForm');
    if (assignForm) {
        assignForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('taskTitle').value.trim();
            const client = document.getElementById('taskClient').value.trim();
            const assignedToId = document.getElementById('taskAssignee').value;
            const deadline = document.getElementById('taskDeadline').value;
            const priority = document.getElementById('taskPriority').value;
            const description = document.getElementById('taskDescription').value.trim();
            
            const submitBtn = document.getElementById('assignTaskSubmitBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Assigning...';
            
            try {
                const response = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                    },
                    body: JSON.stringify({ title, client, assignedToId, deadline, priority, description })
                });
                const data = await response.json();
                if (data.success) {
                    showToast('Task assigned successfully!', true);
                    assignForm.reset();
                    await loadTasks();
                    switchTab('overview');
                } else {
                    showToast(data.message || 'Failed to assign task.', false);
                }
            } catch (err) {
                console.error(err);
                showToast('Connection failed.', false);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane me-2"></i> Assign Task';
            }
        });
    }

    // Modal Assign Task form submit
    const modalAssignForm = document.getElementById('modalAssignTaskForm');
    if (modalAssignForm) {
        modalAssignForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('modalTaskTitle').value.trim();
            const client = document.getElementById('modalTaskClient').value.trim();
            const assignedToId = document.getElementById('modalTaskAssignee').value;
            const deadline = document.getElementById('modalTaskDeadline').value;
            const priority = document.getElementById('modalTaskPriority').value;
            const description = document.getElementById('modalTaskDescription').value.trim();
            
            const submitBtn = document.getElementById('modalAssignTaskSubmitBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Assigning...';
            
            try {
                const response = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                    },
                    body: JSON.stringify({ title, client, assignedToId, deadline, priority, description })
                });
                const data = await response.json();
                if (data.success) {
                    showToast('Task assigned successfully!', true);
                    modalAssignForm.reset();
                    
                    // Close Bootstrap Modal
                    const modalEl = document.getElementById('assignTaskModal');
                    const modalInst = bootstrap.Modal.getInstance(modalEl);
                    if (modalInst) modalInst.hide();
                    
                    await loadTasks();
                    switchTab('overview');
                } else {
                    showToast(data.message || 'Failed to assign task.', false);
                }
            } catch (err) {
                console.error(err);
                showToast('Connection failed.', false);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane me-2"></i> Assign Task';
            }
        });
    }
    
    // Auto-update shift time based on selected shift type
    const staffShiftSelect = document.getElementById('staffShift');
    if (staffShiftSelect) {
        staffShiftSelect.addEventListener('change', () => {
            const shiftTimeInput = document.getElementById('staffShiftTime');
            if (shiftTimeInput) {
                if (staffShiftSelect.value === 'Full Time') {
                    shiftTimeInput.value = '09:30 AM - 07:00 PM';
                } else if (staffShiftSelect.value === 'Part Time') {
                    shiftTimeInput.value = '02:00 PM - 07:00 PM';
                }
            }
        });
    }

    const editStaffShiftSelect = document.getElementById('editStaffShift');
    if (editStaffShiftSelect) {
        editStaffShiftSelect.addEventListener('change', () => {
            const editShiftTimeInput = document.getElementById('editStaffShiftTime');
            if (editShiftTimeInput) {
                if (editStaffShiftSelect.value === 'Full Time') {
                    editShiftTimeInput.value = '09:30 AM - 07:00 PM';
                } else if (editStaffShiftSelect.value === 'Part Time') {
                    editShiftTimeInput.value = '02:00 PM - 07:00 PM';
                }
            }
        });
    }

    // Add Staff form submit
    const addStaffForm = document.getElementById('addStaffForm');
    if (addStaffForm) {
        addStaffForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('staffName').value.trim();
            const role = document.getElementById('staffRole').value.trim();
            const email = document.getElementById('staffEmail').value.trim();
            const mobile = document.getElementById('staffMobile').value.trim();
            const password = document.getElementById('staffPassword').value.trim();
            const shift = document.getElementById('staffShift').value;
            const shiftTime = document.getElementById('staffShiftTime').value.trim();
            
            const submitBtn = document.getElementById('addStaffSubmitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';
            
            try {
                const response = await fetch('/api/staff', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                    },
                    body: JSON.stringify({ name, role, email, mobile, password, shift, shiftTime })
                });
                const data = await response.json();
                if (data.success) {
                    showToast('Staff member added successfully!', true);
                    addStaffForm.reset();
                    
                    // Programmatically close the modal
                    const modalEl = document.getElementById('addStaffModal');
                    if (modalEl) {
                        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                        modalInstance.hide();
                    }
                    
                    await loadStaff();
                } else {
                    showToast(data.message || 'Failed to add staff member.', false);
                }
            } catch (err) {
                console.error(err);
                showToast('Connection failed.', false);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Member';
            }
        });
    }

    // Edit Staff form submit
    const editStaffForm = document.getElementById('editStaffForm');
    if (editStaffForm) {
        editStaffForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editStaffId').value;
            const name = document.getElementById('editStaffName').value.trim();
            const role = document.getElementById('editStaffRole').value.trim();
            const email = document.getElementById('editStaffEmail').value.trim();
            const mobile = document.getElementById('editStaffMobile').value.trim();
            const shift = document.getElementById('editStaffShift').value;
            const shiftTime = document.getElementById('editStaffShiftTime').value.trim();
            
            const submitBtn = document.getElementById('editStaffSubmitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
            
            try {
                const response = await fetch(`/api/staff/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                    },
                    body: JSON.stringify({ name, role, email, mobile, shift, shiftTime })
                });
                const data = await response.json();
                if (data.success) {
                    showToast('Staff member updated successfully!', true);
                    
                    // Close the modal
                    const modalEl = document.getElementById('editStaffModal');
                    if (modalEl) {
                        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                        modalInstance.hide();
                    }
                    
                    await loadStaff();
                    await loadTasks(); // Reload tasks to see updated staff name
                } else {
                    showToast(data.message || 'Failed to update staff member.', false);
                }
            } catch (err) {
                console.error(err);
                showToast('Connection failed.', false);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Changes';
            }
        });
    }
    
    // Calendar month controllers
    const calPrev = document.getElementById('calPrevBtn');
    const calNext = document.getElementById('calNextBtn');
    if (calPrev && calNext) {
        calPrev.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar();
        });
        calNext.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar();
        });
    }
    
    // Search & Filter change inputs
    const dashboardSearch = document.getElementById('dashboardSearchTask');
    const dashboardStatus = document.getElementById('dashboardFilterStatus');
    const dashboardStaff = document.getElementById('dashboardFilterStaff');
    
    if (dashboardSearch) dashboardSearch.addEventListener('input', () => { dashboardCurrentPage = 1; renderRecentTasksTable(); });
    if (dashboardStatus) dashboardStatus.addEventListener('change', () => { dashboardCurrentPage = 1; renderRecentTasksTable(); });
    if (dashboardStaff) dashboardStaff.addEventListener('change', () => { dashboardCurrentPage = 1; renderRecentTasksTable(); });
    
    const allSearch = document.getElementById('allSearchTask');
    const allStatus = document.getElementById('allFilterStatus');
    const allStaff = document.getElementById('allFilterStaff');
    const allPriority = document.getElementById('allFilterPriority');
    
    if (allSearch) allSearch.addEventListener('input', () => { allTasksCurrentPage = 1; renderAllTasks(); });
    if (allStatus) allStatus.addEventListener('change', () => { allTasksCurrentPage = 1; renderAllTasks(); });
    if (allStaff) allStaff.addEventListener('change', () => { allTasksCurrentPage = 1; renderAllTasks(); });
    if (allPriority) allPriority.addEventListener('change', () => { allTasksCurrentPage = 1; renderAllTasks(); });
    
    // Selector for reports
    const reportStaff = document.getElementById('reportStaffSelector');
    if (reportStaff) {
        reportStaff.addEventListener('change', () => {
            updateStaffWiseReport();
        });
    }
    
    // Clear notifications trigger
    const clearNotif = document.getElementById('clearNotificationsBtn');
    if (clearNotif) {
        clearNotif.addEventListener('click', () => {
            notificationsList = [];
            const container = document.getElementById('notificationsContainer');
            if (container) {
                container.innerHTML = `
                    <div class="text-center text-muted py-5" id="notificationsEmptyState">
                        No notifications to display.
                    </div>
                `;
            }
            updateNotificationsCount();
        });
    }
}

// 4. Update task details and delete triggers
async function changeTaskStatus(taskId, status) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            },
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (data.success) {
            showToast('Task status updated!', true);
            await loadTasks();
        } else {
            showToast(data.message || 'Failed to update status.', false);
        }
    } catch (err) {
        console.error(err);
        showToast('Connection error.', false);
    }
}
window.changeTaskStatus = changeTaskStatus;

function confirmDeleteTask(taskId) {
    const label = document.getElementById('confirmModalLabel');
    if (label) label.textContent = 'Confirm Delete Task';
    showConfirmModal('Are you sure you want to delete this task? This action cannot be undone.', () => deleteTask(taskId));
}
window.confirmDeleteTask = confirmDeleteTask;

async function deleteTask(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            }
        });
        const data = await response.json();
        if (data.success) {
            showToast('Task deleted successfully.', true);
            await loadTasks();
        } else {
            showToast(data.message || 'Failed to delete task.', false);
        }
    } catch (err) {
        console.error(err);
        showToast('Connection error.', false);
    } finally {
        confirmModal.hide();
    }
}

// Staff Action Helpers
function viewStaffDetails(staffId) {
    const s = staffList.find(member => member.id === staffId);
    if (!s) return;
    
    // Fill profile info
    document.getElementById('viewStaffAvatar').textContent = s.name.charAt(0);
    document.getElementById('viewStaffAvatar').style.background = s.avatarColor || '#fa9d1c';
    document.getElementById('viewStaffName').textContent = s.name;
    document.getElementById('viewStaffRole').textContent = s.role;
    document.getElementById('viewStaffEmail').innerHTML = `<i class="fa-regular fa-envelope me-1"></i> ${s.email || 'N/A'}`;
    document.getElementById('viewStaffMobile').innerHTML = `<i class="fa-solid fa-phone me-1"></i> ${s.mobile || 'N/A'}`;
    
    const shiftText = s.shift || 'Full Time';
    const shiftTimeText = s.shiftTime || '10:00 AM - 07:00 PM';
    document.getElementById('viewStaffShift').innerHTML = `<i class="fa-solid fa-clock me-1"></i> ${shiftText} (${shiftTimeText})`;
    
    // Fill stats
    const staffTasks = tasksList.filter(t => t.assignedTo.id === staffId);
    const pending = staffTasks.filter(t => t.status === 'pending').length;
    const progress = staffTasks.filter(t => t.status === 'in_progress').length;
    const review = staffTasks.filter(t => t.status === 'under_review').length;
    const completed = staffTasks.filter(t => t.status === 'completed').length;
    
    document.getElementById('viewStaffPending').textContent = pending;
    document.getElementById('viewStaffProgress').textContent = progress;
    document.getElementById('viewStaffReview').textContent = review;
    document.getElementById('viewStaffCompleted').textContent = completed;
    
    // Fill tasks table
    const tasksBody = document.getElementById('viewStaffTasksBody');
    tasksBody.innerHTML = '';
    if (staffTasks.length === 0) {
        tasksBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">No tasks assigned yet.</td></tr>`;
    } else {
        staffTasks.forEach(t => {
            const formattedDate = new Date(t.deadline + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            tasksBody.innerHTML += `
                <tr>
                    <td data-label="Task Title">
                        <div class="fw-bold text-white">${t.title}</div>
                        <div class="text-muted small" style="font-size: 10px;">${t.client}</div>
                    </td>
                    <td data-label="Deadline">${formattedDate}</td>
                    <td data-label="Status"><span class="badge-status status-${t.status}" style="font-size: 9px; padding: 2px 6px;">${t.status.replace('_', ' ')}</span></td>
                    <td data-label="Priority"><span class="priority-text priority-${t.priority}" style="font-size: 9px;">${t.priority}</span></td>
                </tr>
            `;
        });
    }
    
    // Show modal
    const modalEl = document.getElementById('viewStaffModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalInstance.show();
}
window.viewStaffDetails = viewStaffDetails;

function openEditStaffModal(staffId) {
    const s = staffList.find(member => member.id === staffId);
    if (!s) return;
    
    document.getElementById('editStaffId').value = s.id;
    document.getElementById('editStaffName').value = s.name;
    document.getElementById('editStaffRole').value = s.role;
    document.getElementById('editStaffEmail').value = s.email || '';
    document.getElementById('editStaffMobile').value = s.mobile || '';
    document.getElementById('editStaffShift').value = s.shift || 'Day';
    document.getElementById('editStaffShiftTime').value = s.shiftTime || '10:00 AM - 07:00 PM';
    
    const modalEl = document.getElementById('editStaffModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalInstance.show();
}
window.openEditStaffModal = openEditStaffModal;

function confirmDeleteStaff(staffId) {
    const s = staffList.find(member => member.id === staffId);
    if (!s) return;
    
    showConfirmModal(
        `Are you sure you want to delete staff member "${s.name}"? This will also delete all tasks assigned to them. This action cannot be undone.`,
        () => deleteStaff(staffId)
    );
}
window.confirmDeleteStaff = confirmDeleteStaff;

async function deleteStaff(staffId) {
    try {
        const response = await fetch(`/api/staff/${staffId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            }
        });
        const data = await response.json();
        if (data.success) {
            showToast('Staff member deleted successfully.', true);
            await loadStaff();
            await loadTasks(); // Reload tasks to clean up deleted staff's tasks
        } else {
            showToast(data.message || 'Failed to delete staff member.', false);
        }
    } catch (err) {
        console.error(err);
        showToast('Connection error.', false);
    }
}

// Clients Management
function initClientsManagement() {
    const searchInput = document.getElementById('searchClients');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = clientsList.filter(c => 
                c.name.toLowerCase().includes(query) || 
                (c.email && c.email.toLowerCase().includes(query))
            );
            renderClientsTable(filtered);
        });
    }

    const addBtn = document.getElementById('addClientBtn');
    if (addBtn) {
        addBtn.addEventListener('click', openAddClientModal);
    }

    const form = document.getElementById('clientForm');
    if (form) {
        form.addEventListener('submit', submitClientForm);
    }

    const packageSelect = document.getElementById('clientPackageSelect');
    if (packageSelect) {
        packageSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            const customFields = document.getElementById('customPackageFields');
            if (val === 'custom') {
                customFields.style.display = 'block';
                document.getElementById('customPackageName').required = true;
                document.getElementById('customPackagePrice').required = true;
            } else {
                customFields.style.display = 'none';
                document.getElementById('customPackageName').required = false;
                document.getElementById('customPackagePrice').required = false;
            }
        });
    }
}

function renderClientsTable(list = clientsList) {
    const tbody = document.getElementById('clientsTableBody');
    const emptyState = document.getElementById('clientsEmptyState');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (list.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    list.forEach(c => {
        const statusVal = c.status || 'active';
        const isAct = statusVal === 'active';
        const statusBadge = isAct
            ? `<span class="lead-status-badge status-contacted"><i class="fa-solid fa-circle-check me-1"></i> Active</span>`
            : `<span class="lead-status-badge status-spam"><i class="fa-solid fa-circle-xmark me-1"></i> Inactive</span>`;

        const pkg = c.package || {};
        let packageHTML = `<span class="text-muted small">None</span>`;
        if (pkg.name) {
            const isCustom = pkg.id === 'custom';
            const badgeBg = isCustom ? 'bg-warning' : 'bg-primary';
            const textClr = isCustom ? '#000000 !important' : '#ffffff !important';
            const icon = isCustom ? 'fa-wand-magic-sparkles' : 'fa-box-archive';
            packageHTML = `
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span class="fw-bold" style="font-size: 13px; color: var(--text-primary) !important;"><i class="fa-solid ${icon} text-warning me-1"></i>${pkg.name}</span>
                    <span class="badge ${badgeBg}" style="font-size: 12px; font-weight: 600; padding: 4px 8px; color: ${textClr};">${pkg.price}</span>
                </div>
            `;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Client Name">
                <div class="d-flex align-items-center gap-2">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: #9b5de5; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">
                        ${c.name.charAt(0).toUpperCase()}
                    </div>
                    <span class="fw-bold text-white">${c.name}</span>
                </div>
            </td>
            <td data-label="Email Address">${c.email || '<span class="text-muted small">Not specified</span>'}</td>
            <td data-label="Package">${packageHTML}</td>
            <td data-label="Status">${statusBadge}</td>
            <td data-label="Actions" class="text-center">
                <div class="d-flex align-items-center justify-content-center gap-2">
                    <button class="btn btn-sm btn-outline-warning" onclick="openEditClientModal('${c.id}')" title="Edit Client"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteClient('${c.id}')" title="Delete Client"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}
window.renderClientsTable = renderClientsTable;

function openAddClientModal() {
    document.getElementById('clientForm').reset();
    document.getElementById('clientId').value = '';
    document.getElementById('clientStatus').value = 'active';
    document.getElementById('clientPackageSelect').value = '';
    document.getElementById('customPackageFields').style.display = 'none';
    document.getElementById('customPackageName').required = false;
    document.getElementById('customPackagePrice').required = false;
    document.getElementById('clientModalTitle').textContent = 'Add New Client';
    
    if (clientModal) clientModal.show();
}
window.openAddClientModal = openAddClientModal;

function openEditClientModal(id) {
    const c = clientsList.find(client => client.id === id);
    if (!c) return;
    
    document.getElementById('clientId').value = c.id;
    document.getElementById('clientName').value = c.name;
    document.getElementById('clientEmail').value = c.email || '';
    document.getElementById('clientStatus').value = c.status || 'active';
    
    const pkg = c.package || {};
    const select = document.getElementById('clientPackageSelect');
    const customFields = document.getElementById('customPackageFields');
    
    if (pkg.id === 'custom') {
        select.value = 'custom';
        customFields.style.display = 'block';
        document.getElementById('customPackageName').value = pkg.name || '';
        document.getElementById('customPackagePrice').value = cleanPriceForInput(pkg.price);
        document.getElementById('customPackageDesc').value = pkg.description || '';
        document.getElementById('customPackageName').required = true;
        document.getElementById('customPackagePrice').required = true;
    } else if (pkg.id) {
        select.value = pkg.id;
        customFields.style.display = 'none';
        document.getElementById('customPackageName').value = '';
        document.getElementById('customPackagePrice').value = '';
        document.getElementById('customPackageDesc').value = '';
        document.getElementById('customPackageName').required = false;
        document.getElementById('customPackagePrice').required = false;
    } else {
        select.value = '';
        customFields.style.display = 'none';
        document.getElementById('customPackageName').value = '';
        document.getElementById('customPackagePrice').value = '';
        document.getElementById('customPackageDesc').value = '';
        document.getElementById('customPackageName').required = false;
        document.getElementById('customPackagePrice').required = false;
    }
    
    document.getElementById('clientModalTitle').textContent = 'Edit Client Details';
    
    if (clientModal) clientModal.show();
}
window.openEditClientModal = openEditClientModal;

async function submitClientForm(e) {
    e.preventDefault();
    const id = document.getElementById('clientId').value;
    const name = document.getElementById('clientName').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const status = document.getElementById('clientStatus').value;
    const packageId = document.getElementById('clientPackageSelect').value;
    
    if (!name) {
        showToast('Client name is required.', false);
        return;
    }
    
    let packageObj = { id: '', name: '', price: '', description: '' };
    if (packageId === 'custom') {
        const cName = document.getElementById('customPackageName').value.trim();
        const cPrice = document.getElementById('customPackagePrice').value.trim();
        const cDesc = document.getElementById('customPackageDesc').value.trim();
        if (!cName || !cPrice) {
            showToast('Custom Package Name and Price are required.', false);
            return;
        }
        packageObj = { id: 'custom', name: cName, price: formatPriceForSave(cPrice), description: cDesc };
    } else if (packageId) {
        const standardPkg = packagesList.find(p => p.id === packageId);
        if (standardPkg) {
            packageObj = { 
                id: standardPkg.id, 
                name: standardPkg.name, 
                price: standardPkg.price, 
                description: standardPkg.description || '' 
            };
        }
    }
    
    const submitBtn = document.getElementById('clientSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    const url = id ? `/api/clients/${id}` : '/api/clients';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            },
            body: JSON.stringify({ name, email, status, package: packageObj })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(id ? 'Client updated successfully!' : 'Client added successfully!', true);
            const modalEl = document.getElementById('clientModal');
            if (modalEl) {
                const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                modalInstance.hide();
            }
            await loadClients();
        } else {
            showToast(data.message || 'Failed to save client.', false);
        }
    } catch (err) {
        console.error(err);
        showToast('Connection error.', false);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Client';
    }
}

function confirmDeleteClient(id) {
    const c = clientsList.find(client => client.id === id);
    if (!c) return;
    
    showConfirmModal(
        `Are you sure you want to delete client "${c.name}"? This action cannot be undone.`,
        () => deleteClient(id)
    );
}
window.confirmDeleteClient = confirmDeleteClient;

async function deleteClient(id) {
    try {
        const response = await fetch(`/api/clients/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            }
        });
        const data = await response.json();
        if (data.success) {
            showToast('Client deleted successfully.', true);
            await loadClients();
        } else {
            showToast(data.message || 'Failed to delete client.', false);
        }
    } catch (err) {
        console.error(err);
        showToast('Connection error.', false);
    }
}

// Packages Management
function initPackagesManagement() {
    const searchInput = document.getElementById('searchPackages');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = packagesList.filter(p => 
                p.name.toLowerCase().includes(query) || 
                (p.description && p.description.toLowerCase().includes(query)) ||
                p.id.toLowerCase().includes(query)
            );
            renderPackagesTable(filtered);
        });
    }

    const addBtn = document.getElementById('addPackageBtn');
    if (addBtn) {
        addBtn.addEventListener('click', openAddPackageModal);
    }

    const form = document.getElementById('packageForm');
    if (form) {
        form.addEventListener('submit', submitPackageForm);
    }
}

function renderPackagesTable(list = packagesList) {
    const tbody = document.getElementById('packagesTableBody');
    const emptyState = document.getElementById('packagesEmptyState');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (list.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    list.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Package Name">
                <span class="fw-bold text-white"><i class="fa-solid fa-box-archive text-warning me-2"></i>${p.name}</span>
            </td>
            <td data-label="Price / Rate">
                <span class="badge bg-success" style="font-size: 11px; font-weight: 600; padding: 6px 12px; border-radius: 8px;">${p.price}</span>
            </td>
            <td data-label="Description"><span class="text-white-50 small">${p.description || '<span class="text-muted italic">No scope specified</span>'}</span></td>
            <td data-label="Package ID"><code class="text-white-50" style="font-size: 11px;">${p.id}</code></td>
            <td data-label="Actions" class="text-center">
                <div class="d-flex align-items-center justify-content-center gap-2">
                    <button class="btn btn-sm btn-outline-warning" onclick="openEditPackageModal('${p.id}')" title="Edit Package"><i class="fa-solid fa-pen"></i></button>
                    ${['starter', 'growth', 'enterprise'].includes(p.id)
                        ? `<button class="btn btn-sm btn-outline-secondary opacity-50" disabled title="System Package (Cannot Delete)"><i class="fa-solid fa-trash-can"></i></button>`
                        : `<button class="btn btn-sm btn-outline-danger" onclick="confirmDeletePackage('${p.id}')" title="Delete Package"><i class="fa-solid fa-trash-can"></i></button>`
                    }
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}
window.renderPackagesTable = renderPackagesTable;

function openAddPackageModal() {
    document.getElementById('packageForm').reset();
    document.getElementById('packageId').value = '';
    document.getElementById('packageModalTitle').innerHTML = '<i class="fa-solid fa-box-archive text-warning me-2"></i> Add New Package';
    if (packageModal) packageModal.show();
}
window.openAddPackageModal = openAddPackageModal;

function openEditPackageModal(id) {
    const p = packagesList.find(pkg => pkg.id === id);
    if (!p) return;
    
    document.getElementById('packageId').value = p.id;
    document.getElementById('packageName').value = p.name;
    document.getElementById('packagePrice').value = cleanPriceForInput(p.price);
    document.getElementById('packageDesc').value = p.description || '';
    document.getElementById('packageModalTitle').innerHTML = '<i class="fa-solid fa-box-archive text-warning me-2"></i> Edit Package';
    
    if (packageModal) packageModal.show();
}
window.openEditPackageModal = openEditPackageModal;

async function submitPackageForm(e) {
    e.preventDefault();
    const id = document.getElementById('packageId').value;
    const name = document.getElementById('packageName').value.trim();
    const price = formatPriceForSave(document.getElementById('packagePrice').value.trim());
    const description = document.getElementById('packageDesc').value.trim();
    
    if (!name || !price) {
        showToast('Package Name and Price are required.', false);
        return;
    }
    
    const submitBtn = document.getElementById('packageSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    const url = id ? `/api/packages/${id}` : '/api/packages';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            },
            body: JSON.stringify({ name, price, description })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(id ? 'Package updated successfully!' : 'Package created successfully!', true);
            if (packageModal) packageModal.hide();
            await loadPackages();
            await loadClients(); // Reload clients to update package badges if standard package info changed
        } else {
            showToast(data.message || 'Failed to save package.', false);
        }
    } catch (err) {
        console.error(err);
        showToast('Connection error.', false);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Package';
    }
}

function confirmDeletePackage(id) {
    const p = packagesList.find(pkg => pkg.id === id);
    if (!p) return;
    
    showConfirmModal(
        `Are you sure you want to delete package "${p.name}"? This will reset all clients using this package to "None". This action cannot be undone.`,
        () => deletePackage(id)
    );
}
window.confirmDeletePackage = confirmDeletePackage;

async function deletePackage(id) {
    try {
        const response = await fetch(`/api/packages/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            }
        });
        const data = await response.json();
        if (data.success) {
            showToast('Package deleted successfully.', true);
            await loadPackages();
            await loadClients(); // Reload clients to clear deleted package badges
        } else {
            showToast(data.message || 'Failed to delete package.', false);
        }
    } catch (err) {
        console.error(err);
        showToast('Connection error.', false);
    }
}

async function loadPackages() {
    try {
        const response = await fetch('/api/packages', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            }
        });
        const data = await response.json();
        if (data.success) {
            packagesList = data.packages || [];
            renderPackagesTable();
            populateClientPackageDropdown();
        }
    } catch (err) {
        console.error('Error loading packages:', err);
    }
}
window.loadPackages = loadPackages;

function populateClientPackageDropdown() {
    const select = document.getElementById('clientPackageSelect');
    if (!select) return;
    
    // Save current selection
    const currentVal = select.value;
    
    // Clear dynamic options (keep None and Custom)
    select.innerHTML = `
        <option value="">None</option>
        <option value="custom">Custom Package...</option>
    `;
    
    // Insert packages in between
    packagesList.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.price})`;
        // Insert before Custom Package option (which is index 1)
        select.insertBefore(opt, select.options[select.options.length - 1]);
    });
    
    // Restore selection
    select.value = currentVal;
}

function cleanPriceForInput(price) {
    if (!price) return '';
    let cleaned = price.trim();
    if (cleaned.startsWith('₹')) {
        cleaned = cleaned.substring(1);
    }
    if (cleaned.endsWith('/mo')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return cleaned.trim();
}

function formatPriceForSave(price) {
    if (!price) return '';
    let val = price.trim();
    if (val.startsWith('₹')) {
        val = val.substring(1).trim();
    }
    if (val.endsWith('/mo')) {
        val = val.substring(0, val.length - 3).trim();
    }
    let numOnly = val.replace(/,/g, '');
    if (!isNaN(numOnly) && numOnly !== '') {
        val = Number(numOnly).toLocaleString('en-IN');
    }
    return `₹${val}/mo`;
}

// ==================== BRAND LOGOS MANAGEMENT ====================

let allBrandLogos = [];

async function loadBrandLogos() {
    const grid = document.getElementById('brandLogosListGrid');
    const emptyState = document.getElementById('brandLogosEmptyState');
    if (!grid) return;

    grid.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-warning" role="status"></div></div>';
    emptyState.style.display = 'none';

    try {
        const response = await fetch('/api/brand-logos', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            }
        });
        const data = await response.json();
        if (data.success) {
            allBrandLogos = data.logos;
            renderBrandLogos();
        } else {
            showToast(data.message || 'Failed to load brand logos.', false);
        }
    } catch (err) {
        console.error(err);
        showToast('Connection error loading brand logos.', false);
    }
}

function renderBrandLogos() {
    const grid = document.getElementById('brandLogosListGrid');
    const emptyState = document.getElementById('brandLogosEmptyState');
    if (!grid) return;

    grid.innerHTML = '';
    if (allBrandLogos.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    allBrandLogos.forEach(logo => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3';
        
        // Use fallbacks to darkImagePath / lightImagePath
        const darkImg = logo.darkImagePath || logo.imagePath;
        const lightImg = logo.lightImagePath || logo.imagePath;

        col.innerHTML = `
            <div class="admin-card p-3 d-flex flex-column align-items-center justify-content-between h-100 text-center" style="border: 1px solid var(--border-color); border-radius: 12px; background: rgba(255,255,255,0.01);">
                <div class="logo-preview-wrapper mb-3 d-flex gap-2 align-items-center justify-content-center" style="height: 90px; width: 100%; background: rgba(0,0,0,0.25); border-radius: 8px; padding: 8px;">
                    <div style="width: 50%; height: 100%; border-right: 1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; flex-direction:column; padding-right: 4px;">
                        <span style="font-size: 8px; color: rgba(255,255,255,0.5); margin-bottom: 2px;">Dark Theme</span>
                        <img src="${darkImg}" style="max-height: 42px; max-width: 100%; object-fit: contain;">
                    </div>
                    <div style="width: 50%; height: 100%; display:flex; align-items:center; justify-content:center; flex-direction:column; padding-left: 4px; background: rgba(255,255,255,0.9); border-radius: 4px;">
                        <span style="font-size: 8px; color: #444; margin-bottom: 2px; font-weight: bold;">White Theme</span>
                        <img src="${lightImg}" style="max-height: 42px; max-width: 100%; object-fit: contain;">
                    </div>
                </div>
                <div class="text-white small fw-bold text-truncate w-100 mb-2">${logo.name || 'Unnamed Brand'}</div>
                <button class="btn btn-sm btn-outline-danger w-100 mt-2" onclick="deleteBrandLogo('${logo.id}')">
                    <i class="fa-solid fa-trash me-1"></i> Delete
                </button>
            </div>
        `;
        grid.appendChild(col);
    });
}

// Brand Logo Form Submission
const brandLogoForm = document.getElementById('brandLogoForm');
if (brandLogoForm) {
    brandLogoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const brandName = document.getElementById('brandName').value.trim();
        const darkFileInput = document.getElementById('brandLogoDarkFile');
        const lightFileInput = document.getElementById('brandLogoLightFile');
        
        if (!darkFileInput.files || darkFileInput.files.length === 0) {
            showToast('Please select a dark theme logo file.', false);
            return;
        }
        if (!lightFileInput.files || lightFileInput.files.length === 0) {
            showToast('Please select a light theme logo file.', false);
            return;
        }

        const formData = new FormData();
        formData.append('name', brandName);
        formData.append('darkLogoFile', darkFileInput.files[0]);
        formData.append('lightLogoFile', lightFileInput.files[0]);

        const uploadBtn = document.getElementById('uploadLogoBtn');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Uploading...';

        try {
            const response = await fetch('/api/brand-logos', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                },
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                showToast('Brand logo uploaded successfully!', true);
                brandLogoForm.reset();
                loadBrandLogos();
            } else {
                showToast(data.message || 'Upload failed.', false);
            }
        } catch (err) {
            console.error(err);
            showToast('Connection failed during upload.', false);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = 'Upload Brand Logo';
        }
    });
}

function deleteBrandLogo(id) {
    showConfirmModal('Are you sure you want to delete this brand logo? This will remove it from the home page.', async () => {
        try {
            const response = await fetch(`/api/brand-logos/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                }
            });
            const data = await response.json();
            if (data.success) {
                showToast('Brand logo deleted successfully.', true);
                loadBrandLogos();
            } else {
                showToast(data.message || 'Failed to delete logo.', false);
            }
        } catch (err) {
            console.error(err);
            showToast('Connection failed.', false);
        }
    });
}
window.deleteBrandLogo = deleteBrandLogo;


// ==================== CLIENT REVIEWS MANAGEMENT ====================

let allReviews = [];
let reviewModalInstance = null;

// Initialize review modal instance
function getReviewModalInstance() {
    if (!reviewModalInstance && document.getElementById('reviewModal')) {
        reviewModalInstance = new bootstrap.Modal(document.getElementById('reviewModal'));
    }
    return reviewModalInstance;
}

async function loadReviews() {
    const tableBody = document.getElementById('reviewsTableBody');
    const emptyState = document.getElementById('reviewsEmptyState');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-warning" role="status"></div></td></tr>';
    emptyState.style.display = 'none';

    try {
        const response = await fetch('/api/reviews', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            }
        });
        const data = await response.json();
        if (data.success) {
            allReviews = data.reviews;
            renderReviews();
        } else {
            showToast(data.message || 'Failed to load reviews.', false);
        }
    } catch (err) {
        console.error(err);
        showToast('Connection error loading reviews.', false);
    }
}

function renderReviews() {
    const tableBody = document.getElementById('reviewsTableBody');
    const emptyState = document.getElementById('reviewsEmptyState');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    if (allReviews.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    allReviews.forEach(rev => {
        const tr = document.createElement('tr');
        
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rev.rating) {
                stars += '<i class="fa-solid fa-star text-warning small"></i>';
            } else {
                stars += '<i class="fa-regular fa-star text-white-50 small"></i>';
            }
        }

        tr.innerHTML = `
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="avatar-circle-dss d-flex align-items-center justify-content-center text-white font-weight-bold small" style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));">
                        ${rev.avatarInitials || 'CL'}
                    </div>
                    <div>
                        <span class="fw-bold text-white">${rev.name}</span>
                    </div>
                </div>
            </td>
            <td><span class="badge bg-secondary">${rev.source || 'Google Review'}</span></td>
            <td>${stars}</td>
            <td style="max-width: 300px; white-space: normal;" class="text-white-50 small">${rev.text}</td>
            <td class="text-center">
                <div class="d-flex justify-content-center gap-2">
                    <button class="btn btn-sm btn-outline-warning" onclick="editReview('${rev.id}')">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteReview('${rev.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Add Review Click
const addReviewBtn = document.getElementById('addReviewBtn');
if (addReviewBtn) {
    addReviewBtn.addEventListener('click', () => {
        document.getElementById('reviewForm').reset();
        document.getElementById('reviewId').value = '';
        document.getElementById('reviewModalTitle').textContent = 'Add New Review';
        document.getElementById('reviewSubmitBtn').textContent = 'Save Review';
        
        const modal = getReviewModalInstance();
        if (modal) modal.show();
    });
}

// Edit Review Click
function editReview(id) {
    const rev = allReviews.find(r => r.id === id);
    if (!rev) return;

    document.getElementById('reviewId').value = rev.id;
    document.getElementById('reviewClientName').value = rev.name;
    document.getElementById('reviewRating').value = rev.rating;
    document.getElementById('reviewSource').value = rev.source || 'Google Review';
    document.getElementById('reviewAvatarInitials').value = rev.avatarInitials || '';
    document.getElementById('reviewText').value = rev.text;

    document.getElementById('reviewModalTitle').textContent = 'Edit Review';
    document.getElementById('reviewSubmitBtn').textContent = 'Save Changes';

    const modal = getReviewModalInstance();
    if (modal) modal.show();
}
window.editReview = editReview;

// Submit Review Form
const reviewForm = document.getElementById('reviewForm');
if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('reviewId').value;
        const name = document.getElementById('reviewClientName').value.trim();
        const rating = document.getElementById('reviewRating').value;
        const source = document.getElementById('reviewSource').value.trim();
        const avatarInitials = document.getElementById('reviewAvatarInitials').value.trim();
        const text = document.getElementById('reviewText').value.trim();

        const submitBtn = document.getElementById('reviewSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Saving...';

        const payload = { name, rating, text, source, avatarInitials };
        const url = id ? `/api/reviews/${id}` : '/api/reviews';
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.success) {
                showToast(id ? 'Review updated successfully!' : 'Review added successfully!', true);
                const modal = getReviewModalInstance();
                if (modal) modal.hide();
                loadReviews();
            } else {
                showToast(data.message || 'Operation failed.', false);
            }
        } catch (err) {
            console.error(err);
            showToast('Connection failed.', false);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Save Review';
        }
    });
}

function deleteReview(id) {
    showConfirmModal('Are you sure you want to delete this review permanently?', async () => {
        try {
            const response = await fetch(`/api/reviews/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                }
            });
            const data = await response.json();
            if (data.success) {
                showToast('Review deleted successfully.', true);
                loadReviews();
            } else {
                showToast(data.message || 'Failed to delete review.', false);
            }
        } catch (err) {
            console.error(err);
            showToast('Connection failed.', false);
        }
    });
}
window.deleteReview = deleteReview;

// ========================================================================
// INTERNAL CHAT MODULE
// ========================================================================

async function loadChatContacts() {
    const contactsListEl = document.getElementById('chatContactsList');
    if (!contactsListEl) return;

    try {
        const response = await fetch('/api/chat/contacts', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
        });
        const data = await response.json();
        if (data.success) {
            chatContacts = data.contacts;
            renderChatContacts();
            
            // Re-bind search input
            const searchInput = document.getElementById('chatSearchStaff');
            if (searchInput) {
                searchInput.oninput = () => {
                    const query = searchInput.value.toLowerCase().trim();
                    const filtered = chatContacts.filter(c => c.name.toLowerCase().includes(query) || c.role.toLowerCase().includes(query));
                    renderChatContacts(filtered);
                };
            }
        } else {
            showToast(data.message || 'Failed to load chat contacts.', false);
        }
    } catch (err) {
        console.error(err);
        contactsListEl.innerHTML = '<div class="text-center py-5 text-danger"><p>Error loading contacts</p></div>';
    }
}

function renderChatContacts(list = chatContacts) {
    const contactsListEl = document.getElementById('chatContactsList');
    if (!contactsListEl) return;

    contactsListEl.innerHTML = '';
    if (list.length === 0) {
        contactsListEl.innerHTML = '<div class="text-center py-4 text-muted"><p class="mb-0">No staff members found.</p></div>';
        return;
    }

    list.forEach(c => {
        const div = document.createElement('div');
        div.className = `d-flex align-items-center gap-3 p-3 border-bottom cursor-pointer chat-contact-item ${activeChatPartnerId === c.id ? 'active-chat-item' : ''}`;
        div.style.borderColor = 'var(--border-color)';
        div.style.transition = 'background 0.2s';
        div.style.cursor = 'pointer';
        if (activeChatPartnerId === c.id) {
            div.style.background = 'rgba(255, 255, 255, 0.05)';
        }

        let badgeHTML = '';
        if (c.unreadCount > 0) {
            badgeHTML = `<span class="badge bg-danger rounded-pill ms-auto" style="font-size: 10px; font-weight: 700; padding: 4px 8px;">${c.unreadCount}</span>`;
        }

        div.innerHTML = `
            <div class="profile-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: ${c.avatarColor}; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${c.name.charAt(0)}
            </div>
            <div class="text-start flex-grow-1 overflow-hidden">
                <h6 class="text-white fw-bold mb-0 text-truncate" style="font-size: 14px;">${c.name}</h6>
                <span class="text-muted text-truncate d-block" style="font-size: 11px;">${c.role}</span>
            </div>
            ${badgeHTML}
        `;

        div.onclick = () => {
            selectChatPartner(c.id, c.name, c.role, c.avatarColor);
        };
        contactsListEl.appendChild(div);
    });
}

async function selectChatPartner(partnerId, name, role, avatarColor) {
    activeChatPartnerId = partnerId;

    // Show Chat Window
    document.getElementById('chatWindowPlaceholder').classList.add('d-none');
    const activeWin = document.getElementById('chatActiveWindow');
    activeWin.classList.remove('d-none');

    // Set header
    document.getElementById('activeChatName').textContent = name;
    document.getElementById('activeChatRole').textContent = role;
    const avatar = document.getElementById('activeChatAvatar');
    avatar.textContent = name.charAt(0);
    avatar.style.background = avatarColor;

    // Clear input
    document.getElementById('chatMessageInput').value = '';

    // Mark messages as read on backend
    try {
        await fetch(`/api/chat/read/${partnerId}`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
        });
        
        // Refresh contacts list to clear badges
        const contact = chatContacts.find(c => c.id === partnerId);
        if (contact) contact.unreadCount = 0;
        renderChatContacts();
        updateAdminChatBadge();
    } catch (e) {
        console.error(e);
    }

    // Load history
    loadChatHistory();

    // Setup polling interval (clear previous first)
    if (chatPollInterval) clearInterval(chatPollInterval);
    chatPollInterval = setInterval(loadChatHistory, 3000);
}

async function loadChatHistory() {
    if (!activeChatPartnerId) return;
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    try {
        const response = await fetch(`/api/chat/history/${activeChatPartnerId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
        });
        const data = await response.json();
        if (data.success) {
            const isAtBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 50;

            container.innerHTML = '';
            if (data.history.length === 0) {
                container.innerHTML = '<div class="text-center py-5 text-muted small"><p class="mb-0">No messages yet. Send a message to start conversation.</p></div>';
                return;
            }

            data.history.forEach(m => {
                const isMe = m.senderId === 'admin';
                const msgDiv = document.createElement('div');
                msgDiv.className = `d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`;
                
                const timeStr = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                msgDiv.innerHTML = `
                    <div style="max-width: 75%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.4; 
                        background: ${isMe ? 'var(--accent-color)' : 'rgba(255,255,255,0.06)'}; 
                        color: ${isMe ? '#fff' : 'var(--text-primary)'};
                        border-bottom-right-radius: ${isMe ? '2px' : '12px'};
                        border-bottom-left-radius: ${isMe ? '12px' : '2px'};">
                        ${escapeHTML(m.message)}
                    </div>
                    <span class="text-muted mt-1" style="font-size: 9px;">${timeStr}</span>
                `;
                container.appendChild(msgDiv);
            });

            if (isAtBottom) {
                container.scrollTop = container.scrollHeight;
            }
        }
    } catch (err) {
        console.error(err);
    }
}

async function sendAdminChatMessage() {
    const input = document.getElementById('chatMessageInput');
    if (!input || !activeChatPartnerId) return;

    const message = input.value.trim();
    if (!message) return;

    input.value = '';

    try {
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            },
            body: JSON.stringify({
                receiverId: activeChatPartnerId,
                message: message
            })
        });
        const data = await response.json();
        if (data.success) {
            await loadChatHistory();
            const container = document.getElementById('chatMessagesContainer');
            if (container) container.scrollTop = container.scrollHeight;
        } else {
            showToast(data.message || 'Failed to send message.', false);
        }
    } catch (err) {
        console.error(err);
        showToast('Connection failed.', false);
    }
}

async function updateAdminChatBadge() {
    const badge = document.getElementById('unreadChatBadge');
    
    try {
        const response = await fetch('/api/chat/unread-count', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
        });
        const data = await response.json();
        if (data.success) {
            // Check if there are new unread messages
            if (data.count > lastUnreadCount) {
                // Play notification sound
                playNotificationSound();
                
                // Show desktop push notification if tab is in background
                if (document.hidden && "Notification" in window && Notification.permission === "granted") {
                    new Notification("Design Shaper Studio", {
                        body: "You have new unread messages in internal chat.",
                        icon: "/favicon.ico"
                    });
                }
            }
            
            // Save last count
            lastUnreadCount = data.count;
            
            // Update browser tab title
            if (data.count > 0) {
                document.title = `(${data.count}) ${originalTitle}`;
            } else {
                document.title = originalTitle;
            }

            // Update sidebar badge
            if (badge) {
                if (data.count > 0) {
                    badge.textContent = data.count;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
}

function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Primary chime tone
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        gain1.gain.setValueAtTime(0, audioCtx.currentTime);
        gain1.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        
        // Secondary harmonic tone (played slightly later)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.08); // E6 note
        gain2.gain.setValueAtTime(0, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.08);
        gain2.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 0.5);
        osc2.stop(audioCtx.currentTime + 0.6);
    } catch (err) {
        console.warn('AudioContext blocked or not supported:', err);
    }
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

window.sendAdminChatMessage = sendAdminChatMessage;

function deleteAdminChatHistory() {
    if (!activeChatPartnerId) return;

    showConfirmModal('Are you sure you want to clear this chat history permanently? This action cannot be undone.', async () => {
        try {
            const response = await fetch(`/api/chat/history/${activeChatPartnerId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                }
            });
            const data = await response.json();
            if (data.success) {
                showToast('Chat history cleared successfully.', true);
                loadChatHistory();
            } else {
                showToast(data.message || 'Failed to clear chat history.', false);
            }
        } catch (err) {
            console.error(err);
            showToast('Connection failed.', false);
        }
    });
}
window.deleteAdminChatHistory = deleteAdminChatHistory;


