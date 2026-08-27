document.addEventListener('DOMContentLoaded', () => {
    // Chat Polling State
    let staffChatPollInterval = null;
    let lastUnreadCount = 0;
    let originalTitle = document.title;

    // DOM Elements
    const dashboardPanel = document.getElementById('dashboardPanel');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Sidebar Links
    const menuLinks = document.querySelectorAll('.sidebar-menu .menu-link');
    const tabPanels = document.querySelectorAll('.tab-content-panel');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const adminSidebar = document.getElementById('adminSidebar');
    
    // Theme switchers
    const themeSwitch = document.getElementById('themeSwitch');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    const themeSwitchMobile = document.getElementById('themeSwitchMobile');
    const themeIconMobile = document.getElementById('themeIconMobile');

    // Profile summary elements
    const staffAvatar = document.getElementById('staffAvatar');
    const staffName = document.getElementById('staffName');
    const staffRole = document.getElementById('staffRole');
    
    // Dashboard Attendance Elements
    const currentDateTime = document.getElementById('currentDateTime');
    const shiftTimer = document.getElementById('shiftTimer');
    const punchBtn = document.getElementById('punchBtn');
    const punchBtnText = document.getElementById('punchBtnText');
    const quickAnnouncementsList = document.getElementById('quickAnnouncementsList');
    
    // Stat Cards
    const statActiveTasks = document.getElementById('statActiveTasks');
    const statMonthlyHours = document.getElementById('statMonthlyHours');
    const statPresentDays = document.getElementById('statPresentDays');
    const statShiftStatus = document.getElementById('statShiftStatus');

    // Tables
    const tasksTableBody = document.getElementById('tasksTableBody');
    const tasksEmptyState = document.getElementById('tasksEmptyState');
    const logsTableBody = document.getElementById('logsTableBody');
    const logsEmptyState = document.getElementById('logsEmptyState');

    // Submissions Elements
    const submitWorkForm = document.getElementById('submitWorkForm');
    const submitTaskSelect = document.getElementById('submitTaskSelect');
    const submissionsTableBody = document.getElementById('submissionsTableBody');
    const submissionsEmptyState = document.getElementById('submissionsEmptyState');

    // Messages Elements
    const messagesInboxList = document.getElementById('messagesInboxList');

    // Profile Settings Elements
    const profileForm = document.getElementById('profileForm');
    const profileName = document.getElementById('profileName');
    const profileRole = document.getElementById('profileRole');
    const profileEmail = document.getElementById('profileEmail');
    const profileMobile = document.getElementById('profileMobile');
    const changePasswordForm = document.getElementById('changePasswordForm');

    // Global state
    let activeLog = null;
    let timerInterval = null;
    let allTasks = [];
    let attendanceLogs = [];

    // Theme Switcher Logic
    const updateLogos = (isLight) => {
        const logoImg = document.getElementById('logoImg');
        const sidebarLogoImg = document.getElementById('sidebarLogoImg');
        const mobileLogo = document.getElementById('mobileLogo');
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
    };

    const isLightModeActive = localStorage.getItem('lightmode') === 'active';
    setTheme(isLightModeActive);

    const toggleTheme = () => {
        const currentMode = document.documentElement.classList.contains('lightmode');
        setTheme(!currentMode);
    };

    if (themeSwitch) themeSwitch.addEventListener('click', toggleTheme);
    if (themeSwitchMobile) themeSwitchMobile.addEventListener('click', toggleTheme);

    // Password Visibility Toggle for Login Page
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const togglePasswordIcon = document.getElementById('togglePasswordIcon');
    const passwordInput = document.getElementById('password');

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            if (togglePasswordIcon) {
                togglePasswordIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
            }
        });
    }

    // Mobile Sidebar Toggler
    if (sidebarToggle && adminSidebar) {
        sidebarToggle.addEventListener('click', () => {
            adminSidebar.classList.toggle('show');
        });
        
        // Hide sidebar when clicking outside of it on mobile
        document.addEventListener('click', (e) => {
            if (!adminSidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                adminSidebar.classList.remove('show');
            }
        });
    }

    // Auth Check
    const token = localStorage.getItem('staffToken');
    if (token) {
        if (dashboardPanel) dashboardPanel.style.display = 'block';
        initWorkspace();
    } else {
        window.location.href = '/dss?role=staff';
    }



    // Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('staffToken');
            localStorage.removeItem('staffInfo');
            document.cookie = "staffToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
            location.reload();
        });
    }

    // Initialize Workspace Page
    async function initWorkspace() {
        loadProfileSummary();
        
        // Fetch latest profile details from database to update localStorage (shift details, etc.)
        try {
            const response = await fetch('/api/staff/profile', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('staffToken') }
            });
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('staffInfo', JSON.stringify(data.staff));
                loadProfileSummary();
            }
        } catch (err) {
            console.error('Error fetching staff profile on init:', err);
        }

        updateDateTime();
        setInterval(updateDateTime, 60000);
        
        await checkTodayPunchStatus();
        await loadAttendanceHistory();
        await loadStaffTasks();
        
        // Start polling for unread chat messages
        updateStaffChatBadge();
        setInterval(updateStaffChatBadge, 10000);

        // Request desktop notification permission
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
        
        // Setup menu navigation click handlers
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                const targetTab = link.getAttribute('data-tab');
                
                // Set active menu item
                menuLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Show/hide tab panels
                tabPanels.forEach(panel => {
                    if (panel.id === `tab-${targetTab}`) {
                        panel.style.display = 'block';
                    } else {
                        panel.style.display = 'none';
                    }
                });
                
                // Clear staff chat polling interval if switching away from messages tab
                if (targetTab !== 'messages' && typeof staffChatPollInterval !== 'undefined' && staffChatPollInterval) {
                    clearInterval(staffChatPollInterval);
                    staffChatPollInterval = null;
                }

                // Load specific tab datasets
                if (targetTab === 'dashboard') {
                    checkTodayPunchStatus();
                    loadStaffTasks();
                } else if (targetTab === 'my-tasks') {
                    loadStaffTasks();
                } else if (targetTab === 'my-submissions') {
                    loadStaffTasks(); // Reload to populate dropdown
                    renderSubmissionsTable();
                } else if (targetTab === 'messages') {
                    startStaffChat();
                } else if (targetTab === 'profile-settings') {
                    loadProfileData();
                } else if (targetTab === 'my-attendance') {
                    loadAttendanceHistory();
                } else if (targetTab === 'calendar') {
                    renderCalendar();
                }
                
                // Close sidebar on mobile after clicking
                if (adminSidebar) adminSidebar.classList.remove('show');
            });
        });
    }

    // Live Date/Time Tracker
    function updateDateTime() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        if (currentDateTime) {
            currentDateTime.textContent = now.toLocaleDateString('en-US', options);
        }
    }

    // Profile Details display
    function loadProfileSummary() {
        const info = JSON.parse(localStorage.getItem('staffInfo'));
        if (info) {
            if (staffName) staffName.textContent = info.name;
            if (staffRole) staffRole.textContent = info.role;
            if (staffAvatar) {
                staffAvatar.textContent = info.name.charAt(0).toUpperCase();
                if (info.avatarColor) staffAvatar.style.background = info.avatarColor;
            }
            const staffShiftInfo = document.getElementById('staffShiftInfo');
            if (staffShiftInfo) {
                const shiftVal = info.shift || 'Full Time';
                const timeVal = info.shiftTime || '10:00 AM - 07:00 PM';
                staffShiftInfo.innerHTML = `<i class="fa-solid fa-clock me-1"></i> ${shiftVal} (${timeVal})`;
            }
        }
    }

    // Load inputs in Profile tab
    function loadProfileData() {
        const info = JSON.parse(localStorage.getItem('staffInfo'));
        if (info) {
            if (profileName) profileName.value = info.name;
            if (profileRole) profileRole.value = info.role;
            if (profileEmail) profileEmail.value = info.email || '';
            if (profileMobile) profileMobile.value = info.mobile || '';
        }
    }

    // Update Profile API handler
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = profileEmail.value.trim();
            const mobile = profileMobile.value.trim();
            
            const submitBtn = document.getElementById('saveProfileBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Saving...';
            
            try {
                const response = await fetch('/api/staff/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('staffToken')
                    },
                    body: JSON.stringify({ email, mobile })
                });
                const data = await response.json();
                if (data.success) {
                    showToast('Profile details updated successfully!', true);
                    localStorage.setItem('staffInfo', JSON.stringify(data.staff));
                    loadProfileSummary();
                } else {
                    showToast(data.message || 'Failed to update profile.', false);
                }
            } catch (err) {
                console.error(err);
                showToast('Connection error.', false);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Save Profile</span>';
            }
        });
    }

    // Change Password submit handler
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldPassword = document.getElementById('oldPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            if (newPassword !== confirmNewPassword) {
                showToast('New passwords do not match.', false);
                return;
            }

            const submitBtn = document.getElementById('changePassSubmitBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Updating...';

            try {
                const response = await fetch('/api/staff/change-password', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('staffToken')
                    },
                    body: JSON.stringify({ oldPassword, newPassword })
                });
                const data = await response.json();
                if (data.success) {
                    showToast('Password updated successfully!', true);
                    changePasswordForm.reset();
                } else {
                    showToast(data.message || 'Failed to update password.', false);
                }
            } catch (err) {
                console.error(err);
                showToast('Connection error.', false);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Update Password</span>';
            }
        });
    }

    // Check Attendance Punch Status
    async function checkTodayPunchStatus() {
        try {
            const response = await fetch('/api/attendance/status', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('staffToken') }
            });
            const data = await response.json();
            if (data.success && data.log) {
                activeLog = data.log;
            } else {
                activeLog = null;
            }
            updatePunchConsoleUI();
        } catch (err) {
            console.error(err);
        }
    }

    // Update Console Action controls
    function updatePunchConsoleUI() {
        clearInterval(timerInterval);
        if (!punchBtn) return;
        
        const info = JSON.parse(localStorage.getItem('staffInfo'));
        const shiftTime = info ? info.shiftTime : null;
        
        if (!activeLog) {
            punchBtn.className = 'punch-btn punch-btn-in w-100';
            punchBtnText.textContent = 'Punch In';
            punchBtn.disabled = false;
            if (shiftTimer) shiftTimer.textContent = '00:00:00';
            if (statShiftStatus) statShiftStatus.innerHTML = '<span class="text-muted">Offline</span>';
            
            const earlyLeaveContainer = document.getElementById('earlyLeaveContainer');
            if (earlyLeaveContainer) earlyLeaveContainer.style.display = 'none';
        } else if (activeLog.punchIn && !activeLog.punchOut) {
            punchBtn.className = 'punch-btn punch-btn-out w-100';
            punchBtnText.textContent = 'Punch Out';
            if (statShiftStatus) statShiftStatus.innerHTML = '<span class="text-success blink-fast">● Working</span>';
            
            const punchInTime = new Date(activeLog.punchIn);
            function tick() {
                const diff = new Date() - punchInTime;
                if (diff < 0) return;
                const hrs = Math.floor(diff / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((diff % (1000 * 60)) / 1000);
                if (shiftTimer) {
                    shiftTimer.textContent = 
                        String(hrs).padStart(2, '0') + ':' + 
                        String(mins).padStart(2, '0') + ':' + 
                        String(secs).padStart(2, '0');
                }
                
                // Real-time lock check
                if (shiftTime) {
                    const parts = shiftTime.split('-');
                    if (parts.length >= 2) {
                        const endPart = parts[1].trim();
                        const match = endPart.match(/(\d+):(\d+)\s*(AM|PM)/i);
                        if (match) {
                            let endHrs = parseInt(match[1], 10);
                            const endMins = parseInt(match[2], 10);
                            const ampm = match[3].toUpperCase();
                            if (ampm === 'PM' && endHrs !== 12) endHrs += 12;
                            else if (ampm === 'AM' && endHrs === 12) endHrs = 0;
                            
                            const endMinutes = endHrs * 60 + endMins;
                            const unlockMinutes = endMinutes - 60;
                            
                            const now = new Date();
                            const currentMinutes = now.getHours() * 60 + now.getMinutes();
                            
                            if (currentMinutes < unlockMinutes) {
                                punchBtn.disabled = true;
                                const unlockHrs = Math.floor(unlockMinutes / 60);
                                const unlockMins = unlockMinutes % 60;
                                const displayHrs = unlockHrs % 12 === 0 ? 12 : unlockHrs % 12;
                                const displayMins = String(unlockMins).padStart(2, '0');
                                const displayAmpm = unlockHrs >= 12 ? 'PM' : 'AM';
                                punchBtnText.textContent = `Punch Out (Unlocks at ${displayHrs}:${displayMins} ${displayAmpm})`;
                                
                                const earlyLeaveContainer = document.getElementById('earlyLeaveContainer');
                                if (earlyLeaveContainer) earlyLeaveContainer.style.display = 'block';
                            } else {
                                punchBtn.disabled = false;
                                punchBtnText.textContent = 'Punch Out';
                                
                                const earlyLeaveContainer = document.getElementById('earlyLeaveContainer');
                                if (earlyLeaveContainer) earlyLeaveContainer.style.display = 'none';
                            }
                        }
                    }
                } else {
                    punchBtn.disabled = false;
                    punchBtnText.textContent = 'Punch Out';
                    const earlyLeaveContainer = document.getElementById('earlyLeaveContainer');
                    if (earlyLeaveContainer) earlyLeaveContainer.style.display = 'none';
                }
            }
            tick();
            timerInterval = setInterval(tick, 1000);
        } else {
            punchBtn.className = 'punch-btn punch-btn-completed w-100';
            punchBtn.disabled = true;
            punchBtnText.textContent = 'Shift Completed';
            if (statShiftStatus) statShiftStatus.innerHTML = '<span class="text-warning">Completed</span>';
            
            const hrs = Math.floor(activeLog.totalHours);
            const mins = Math.round((activeLog.totalHours - hrs) * 60);
            if (shiftTimer) {
                shiftTimer.textContent = 
                    String(hrs).padStart(2, '0') + ':' + 
                    String(mins).padStart(2, '0') + ':00';
            }
            
            const earlyLeaveContainer = document.getElementById('earlyLeaveContainer');
            if (earlyLeaveContainer) earlyLeaveContainer.style.display = 'none';
        }
    }

    // Bind Punch click trigger
    if (punchBtn) {
        punchBtn.addEventListener('click', async () => {
            const isPunchIn = !activeLog;
            const url = isPunchIn ? '/api/attendance/punch-in' : '/api/attendance/punch-out';
            
            punchBtn.disabled = true;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('staffToken') 
                    }
                });
                const data = await response.json();
                if (data.success) {
                    showToast(data.message, true);
                    await checkTodayPunchStatus();
                    await loadAttendanceHistory();
                } else {
                    showToast(data.message || 'Operation failed.', false);
                }
            } catch (err) {
                console.error(err);
                showToast('Connection error.', false);
            } finally {
                punchBtn.disabled = false;
            }
        });
    }

    // Bind Early Leave click trigger
    const btnRequestEarlyLeave = document.getElementById('btnRequestEarlyLeave');
    if (btnRequestEarlyLeave) {
        btnRequestEarlyLeave.addEventListener('click', async () => {
            btnRequestEarlyLeave.disabled = true;
            btnRequestEarlyLeave.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Requesting...';
            try {
                const response = await fetch('/api/attendance/request-early-leave', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('staffToken')
                    }
                });
                const data = await response.json();
                if (data.success) {
                    showToast(data.message, true);
                    showEarlyLeaveVerificationModal();
                } else {
                    showToast(data.message || 'Failed to request early leave.', false);
                }
            } catch (err) {
                console.error(err);
                showToast('Connection error.', false);
            } finally {
                btnRequestEarlyLeave.disabled = false;
                btnRequestEarlyLeave.innerHTML = '<i class="fa-solid fa-envelope-open-text me-1"></i> Request Early Punch Out';
            }
        });
    }

    function showEarlyLeaveVerificationModal() {
        const existing = document.getElementById('early-leave-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'early-leave-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(10, 10, 12, 0.85)';
        modal.style.backdropFilter = 'blur(10px)';
        modal.style.zIndex = '99999';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s ease';

        modal.innerHTML = `
            <div class="glass-card" style="max-width: 420px; width: 90%; padding: 30px; position: relative; border: 1px solid rgba(255,255,255,0.08); background: rgba(18, 18, 26, 0.95); border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); backdrop-filter: blur(15px);">
                <button class="modal-close-btn" style="position: absolute; top: 18px; right: 18px; background: none; border: none; color: rgba(255,255,255,0.4); font-size: 24px; cursor: pointer; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;">&times;</button>
                <div class="text-center mb-4">
                    <div style="width: 65px; height: 65px; border-radius: 50%; background: rgba(250, 157, 28, 0.08); border: 2px dashed rgba(250, 157, 28, 0.4); display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; box-shadow: 0 0 20px rgba(250, 157, 28, 0.1);">
                        <i class="fa-solid fa-shield-halved" style="font-size: 24px; color: #fa9d1c;"></i>
                    </div>
                    <h5 class="text-white fw-bold mb-2" style="letter-spacing: 0.5px;">Verify Early Punch Out</h5>
                    <p class="text-muted small px-2">Ask Admin for the 4-digit code sent to their email to authorize your early leave.</p>
                </div>
                
                <div class="mb-4">
                    <label class="form-label text-muted small mb-2" style="font-weight: 500; letter-spacing: 0.5px;">Verification Code</label>
                    <input type="text" id="earlyLeaveCodeInput" class="form-control" placeholder="0 0 0 0" maxlength="4" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 6px; text-align: center; padding: 14px 10px; outline: none; transition: all 0.3s ease; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
                </div>

                <div class="d-flex gap-2 mt-2">
                    <button class="modal-cancel-btn w-100" style="border-radius: 50px; font-weight: 600; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); padding: 12px 20px; transition: all 0.3s ease; cursor: pointer;">Cancel</button>
                    <button class="modal-submit-btn w-100" style="border-radius: 50px; font-weight: 700; background: linear-gradient(135deg, #fa9d1c 0%, #ff5e3b 100%); border: none; color: #ffffff; padding: 12px 20px; transition: all 0.3s ease; cursor: pointer; box-shadow: 0 4px 15px rgba(250, 157, 28, 0.25);">Verify</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Fade in
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 50);

        const closeModal = () => {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 300);
        };

        const closeBtn = modal.querySelector('.modal-close-btn');
        closeBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('mouseover', () => { closeBtn.style.color = '#fff'; closeBtn.style.background = 'rgba(255,255,255,0.05)'; });
        closeBtn.addEventListener('mouseout', () => { closeBtn.style.color = 'rgba(255,255,255,0.4)'; closeBtn.style.background = 'none'; });

        const cancelBtn = modal.querySelector('.modal-cancel-btn');
        cancelBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('mouseover', () => { cancelBtn.style.background = 'rgba(255,255,255,0.08)'; cancelBtn.style.color = '#fff'; });
        cancelBtn.addEventListener('mouseout', () => { cancelBtn.style.background = 'rgba(255,255,255,0.04)'; cancelBtn.style.color = 'rgba(255,255,255,0.7)'; });
        
        const submitBtn = modal.querySelector('.modal-submit-btn');
        submitBtn.addEventListener('mouseover', () => { submitBtn.style.transform = 'translateY(-2px)'; submitBtn.style.boxShadow = '0 6px 20px rgba(250, 157, 28, 0.4)'; });
        submitBtn.addEventListener('mouseout', () => { submitBtn.style.transform = 'none'; submitBtn.style.boxShadow = '0 4px 15px rgba(250, 157, 28, 0.25)'; });

        const codeInput = modal.querySelector('#earlyLeaveCodeInput');
        codeInput.addEventListener('focus', () => { codeInput.style.borderColor = '#fa9d1c'; codeInput.style.boxShadow = '0 0 15px rgba(250, 157, 28, 0.15)'; });
        codeInput.addEventListener('blur', () => { codeInput.style.borderColor = 'rgba(255,255,255,0.08)'; codeInput.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; });

        submitBtn.addEventListener('click', async () => {
            const code = codeInput.value.trim();
            if (!code || code.length !== 4) {
                showToast('Please enter a valid 4-digit code.', false);
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Verifying...';

            try {
                const response = await fetch('/api/attendance/verify-early-leave', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('staffToken')
                    },
                    body: JSON.stringify({ code })
                });
                const data = await response.json();
                if (data.success) {
                    showToast(data.message, true);
                    closeModal();
                    await checkTodayPunchStatus();
                    await loadAttendanceHistory();
                } else {
                    showToast(data.message || 'Verification failed.', false);
                }
            } catch (err) {
                console.error(err);
                showToast('Connection error.', false);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Verify';
            }
        });
    }

    // Retrieve staff tasks list
    async function loadStaffTasks() {
        try {
            const response = await fetch('/api/staff/tasks', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('staffToken') }
            });
            const data = await response.json();
            if (data.success) {
                allTasks = data.tasks;
                renderStaffTasks();
                renderSubmissionsTable();
                updateDashboardStats();
            }
        } catch (err) {
            console.error(err);
        }
    }

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

    // Calculate dynamic stats on Dashboard Overview
    function updateDashboardStats() {
        const pendingOrWorking = allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
        if (statActiveTasks) statActiveTasks.textContent = pendingOrWorking;
        
        let sumHours = 0;
        let presentCount = 0;
        attendanceLogs.forEach(l => {
            presentCount++;
            if (l.punchOut) sumHours += l.totalHours;
        });
        if (statMonthlyHours) statMonthlyHours.textContent = formatHours(sumHours);
        if (statPresentDays) statPresentDays.textContent = presentCount + ' days';
    }

    // Render tasks list in table
    function renderStaffTasks() {
        if (!tasksTableBody) return;
        tasksTableBody.innerHTML = '';
        if (allTasks.length === 0) {
            if (tasksEmptyState) tasksEmptyState.style.display = 'block';
            return;
        }
        if (tasksEmptyState) tasksEmptyState.style.display = 'none';

        allTasks.forEach(t => {
            const tr = document.createElement('tr');
            
            let priorityBadge = '';
            if (t.priority === 'high') {
                priorityBadge = '<span class="badge bg-danger">High</span>';
            } else if (t.priority === 'medium') {
                priorityBadge = '<span class="badge bg-warning text-dark" style="color:#000 !important;">Medium</span>';
            } else {
                priorityBadge = '<span class="badge bg-success">Low</span>';
            }

            // Task Status Badge
            let statusBadge = '';
            if (t.status === 'pending') {
                statusBadge = '<span class="badge bg-secondary">Pending</span>';
            } else if (t.status === 'in_progress') {
                statusBadge = '<span class="badge bg-info text-dark" style="color:#000 !important;">In Progress</span>';
            } else if (t.status === 'under_review') {
                statusBadge = '<span class="badge bg-warning text-dark" style="color:#000 !important;">Under Review</span>';
            } else if (t.status === 'completed') {
                statusBadge = '<span class="badge bg-success">Completed</span>';
            }

            // Action Button
            let actionBtnHTML = '';
            if (t.status === 'pending') {
                actionBtnHTML = `<button class="btn btn-sm btn-success px-3 py-1 font-weight-bold" style="border-radius:6px; font-size:12px;" onclick="updateTaskStatus('${t.id}', 'in_progress')"><i class="fa-solid fa-play me-1"></i>Start</button>`;
            } else if (t.status === 'in_progress') {
                actionBtnHTML = `<button class="btn btn-sm btn-danger px-3 py-1 font-weight-bold" style="border-radius:6px; font-size:12px;" onclick="endTaskDirectly('${t.id}', '${t.title.replace(/'/g, "\\'")}')"><i class="fa-solid fa-stop me-1"></i>End</button>`;
            } else {
                actionBtnHTML = `<span class="text-white-50 small">-</span>`;
            }

            tr.innerHTML = `
                <td data-label="Task Title">
                    <span class="fw-bold text-white">${t.title}</span>
                    <div class="text-white-50 small mt-1"><i class="fa-solid fa-user-tie text-warning me-1"></i>Client: ${t.client}</div>
                    ${t.description ? `<div class="text-muted small mt-1 italic" style="font-size:11px;">${t.description}</div>` : ''}
                </td>
                <td data-label="Deadline"><i class="fa-regular fa-calendar-days text-danger me-1"></i>${t.deadline}</td>
                <td data-label="Priority">${priorityBadge}</td>
                <td data-label="Status">${statusBadge}</td>
                <td data-label="Action" class="text-center">${actionBtnHTML}</td>
            `;
            tasksTableBody.appendChild(tr);
        });
    }

    // API Put for Task Status
    async function updateTaskStatus(id, newStatus) {
        try {
            const response = await fetch(`/api/staff/tasks/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('staffToken')
                },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await response.json();
            if (data.success) {
                showToast('Task status updated successfully!', true);
                loadStaffTasks();
            } else {
                showToast(data.message || 'Failed to update status.', false);
            }
        } catch (err) {
            console.error(err);
            showToast('Connection error.', false);
        }
    }
    window.updateTaskStatus = updateTaskStatus;

    // Direct task completion from Action button
    async function endTaskDirectly(taskId, taskTitle) {
        const isConfirmed = confirm(`Work complete thay gayu che?\n"${taskTitle}"`);
        if (!isConfirmed) return;

        try {
            const response = await fetch(`/api/staff/tasks/${taskId}/submit`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('staffToken')
                },
                body: JSON.stringify({ 
                    submissionLink: 'Completed', 
                    submissionComment: 'Work completed by staff.' 
                })
            });
            const data = await response.json();
            if (data.success) {
                showToast('Task submitted for review successfully!', true);
                await loadStaffTasks(); // Reloads tables and dynamic stats
            } else {
                showToast(data.message || 'Failed to complete task.', false);
            }
        } catch (err) {
            console.error(err);
            showToast('Connection failed.', false);
        }
    }
    window.endTaskDirectly = endTaskDirectly;

    // Keep no-op to prevent references error if called anywhere else
    function populateSubmissionsDropdown() {}

    // Render Submissions Table
    function renderSubmissionsTable() {
        if (!submissionsTableBody) return;
        submissionsTableBody.innerHTML = '';
        
        // Filter tasks that have submission data
        const submissions = allTasks.filter(t => t.submissionLink || t.status === 'under_review' || t.status === 'completed');
        
        if (submissions.length === 0) {
            if (submissionsEmptyState) submissionsEmptyState.style.display = 'block';
            return;
        }
        if (submissionsEmptyState) submissionsEmptyState.style.display = 'none';

        submissions.forEach(s => {
            const tr = document.createElement('tr');
            
            let statusBadge = '';
            if (s.status === 'under_review') {
                statusBadge = '<span class="badge bg-warning text-dark" style="color:#000 !important;">Under Review</span>';
            } else if (s.status === 'completed') {
                statusBadge = '<span class="badge bg-success">Completed</span>';
            } else {
                statusBadge = `<span class="badge bg-secondary">${s.status}</span>`;
            }

            const isValidUrl = s.submissionLink && (s.submissionLink.startsWith('http://') || s.submissionLink.startsWith('https://'));
            const workLinkHTML = isValidUrl 
                ? `<div class="mt-1"><a href="${s.submissionLink}" target="_blank" class="text-warning small text-decoration-underline"><i class="fa-solid fa-up-right-from-square me-1"></i>View Work Link</a></div>`
                : '';

            tr.innerHTML = `
                <td data-label="Task Title">
                    <span class="fw-bold text-white">${s.title}</span>
                    ${workLinkHTML}
                    ${s.submissionComment ? `<div class="text-white-50 small mt-1 italic">Note: ${s.submissionComment}</div>` : ''}
                </td>
                <td data-label="Client">
                    <span class="text-white-50 small"><i class="fa-solid fa-user-tie text-warning me-1"></i>${s.client}</span>
                </td>
                <td data-label="Status">${statusBadge}</td>
            `;
            submissionsTableBody.appendChild(tr);
        });
    }

    // Dynamic inbox notifications based on staff's assigned tasks
    function renderAnnouncementsInbox() {
        if (!messagesInboxList) return;
        messagesInboxList.innerHTML = '';
        
        if (allTasks.length === 0) {
            messagesInboxList.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fa-solid fa-envelope-open-text mb-2" style="font-size: 30px;"></i>
                    <p class="mb-0">Your inbox is empty.</p>
                </div>
            `;
            return;
        }

        allTasks.forEach(t => {
            const card = document.createElement('div');
            card.className = 'admin-card p-3 d-flex align-items-start gap-3';
            
            let iconClass = 'fa-solid fa-clipboard text-warning';
            let msgTitle = 'New Assignment';
            let msgText = `A new task "${t.title}" (Client: ${t.client}) has been assigned to you. Please review details and begin working.`;
            
            if (t.status === 'completed') {
                iconClass = 'fa-solid fa-circle-check text-success';
                msgTitle = 'Task Approved!';
                msgText = `Great job! Your submission for task "${t.title}" has been reviewed and approved by Admin.`;
            } else if (t.status === 'under_review') {
                iconClass = 'fa-solid fa-hourglass-half text-info';
                msgTitle = 'Submission Received';
                msgText = `Your work submission for "${t.title}" is successfully recorded. Admin will review it shortly.`;
            } else if (t.status === 'in_progress') {
                iconClass = 'fa-solid fa-person-digging text-primary';
                msgTitle = 'Work in Progress';
                msgText = `You started working on "${t.title}". Ensure deadlines are met (Due: ${t.deadline}).`;
            }

            card.innerHTML = `
                <div class="profile-avatar mt-1" style="width:40px; height:40px; flex-shrink:0; background:rgba(255,255,255,0.03); color:inherit; box-shadow:none;">
                    <i class="${iconClass}" style="font-size:18px;"></i>
                </div>
                <div class="text-start">
                    <h6 class="text-white fw-bold mb-1">${msgTitle}</h6>
                    <p class="text-white-50 small mb-2">${msgText}</p>
                    <span class="text-muted" style="font-size: 10px;">${new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            `;
            messagesInboxList.appendChild(card);
        });
    }

    // Render quick alerts on dashboard inbox
    function renderAnnouncementsInboxQuick() {
        if (!quickAnnouncementsList) return;
        quickAnnouncementsList.innerHTML = '';
        
        // Pick the top 3 most active task status alerts
        const activeAlerts = allTasks.slice(0, 3);
        if (activeAlerts.length === 0) {
            quickAnnouncementsList.innerHTML = '<div class="text-muted py-4 text-center">No announcements at the moment.</div>';
            return;
        }

        activeAlerts.forEach(t => {
            const row = document.createElement('div');
            row.className = 'd-flex align-items-start gap-2 border-bottom pb-2 mb-2';
            row.style.borderColor = 'var(--border-color)';
            
            let statusDot = 'text-warning';
            let titleText = `Task Assigned: ${t.title}`;
            if (t.status === 'completed') {
                statusDot = 'text-success';
                titleText = `Approved: ${t.title}`;
            } else if (t.status === 'under_review') {
                statusDot = 'text-info';
                titleText = `Reviewing: ${t.title}`;
            }

            row.innerHTML = `
                <i class="fa-solid fa-circle ${statusDot} mt-1" style="font-size: 8px;"></i>
                <div class="text-start">
                    <div class="fw-bold text-white small" style="font-size: 12px;">${titleText}</div>
                    <div class="text-muted" style="font-size: 10px;">Due: ${t.deadline}</div>
                </div>
            `;
            quickAnnouncementsList.appendChild(row);
        });
    }

    // Retrieve personal attendance log history list
    async function loadAttendanceHistory() {
        try {
            const response = await fetch('/api/attendance/history', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('staffToken') }
            });
            const data = await response.json();
            if (data.success) {
                attendanceLogs = data.logs;
                renderAttendanceHistory();
                updateDashboardStats();
                renderAnnouncementsInboxQuick();
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Render attendance logs list rows
    function renderAttendanceHistory() {
        // Since we have multiple tables in different tabs referencing logs, let's find all log bodies
        const logBodies = document.querySelectorAll('#logsTableBody');
        const emptyStates = document.querySelectorAll('#logsEmptyState');
        
        logBodies.forEach((body, idx) => {
            body.innerHTML = '';
            const emptyState = emptyStates[idx];
            
            if (attendanceLogs.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                return;
            }
            if (emptyState) emptyState.style.display = 'none';

            attendanceLogs.forEach(l => {
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
                    <td data-label="Date" class="fw-bold text-white">${l.date}</td>
                    <td data-label="Punch In">${punchInTime}</td>
                    <td data-label="Punch Out">${punchOutTime}</td>
                    <td data-label="Duration">${duration}</td>
                    <td data-label="Status">${statusBadge}</td>
                `;
                body.appendChild(tr);
            });
        });
    }

    // Custom Toast notifications feedback helper
    function showToast(message, isSuccess = true) {
        const toast = document.getElementById('toast');
        const toastIcon = document.getElementById('toastIcon');
        const toastMessage = document.getElementById('toastMessage');
        if (!toast) return;

        toastMessage.textContent = message;
        if (isSuccess) {
            toastIcon.className = 'fa-solid fa-circle-check text-success';
        } else {
            toastIcon.className = 'fa-solid fa-circle-xmark text-danger';
        }

        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ========================================================================
    // INTERNAL STAFF CHAT MODULE
    // ========================================================================

    async function startStaffChat() {
        const container = document.getElementById('staffChatMessagesContainer');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fa-solid fa-spinner fa-spin mb-2" style="font-size: 24px;"></i>
                    <p class="mb-0">Loading chat history...</p>
                </div>
            `;
        }

        // Clear input
        const input = document.getElementById('staffChatMessageInput');
        if (input) input.value = '';

        // Mark messages as read
        try {
            await fetch('/api/chat/read/admin', {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('staffToken') }
            });
            updateStaffChatBadge();
        } catch (e) {
            console.error(e);
        }

        // Load chat history immediately
        loadStaffChatHistory();

        // Start polling chat history every 3 seconds
        if (staffChatPollInterval) clearInterval(staffChatPollInterval);
        staffChatPollInterval = setInterval(loadStaffChatHistory, 3000);
    }
    window.startStaffChat = startStaffChat;

    async function loadStaffChatHistory() {
        const container = document.getElementById('staffChatMessagesContainer');
        if (!container) return;

        try {
            const response = await fetch('/api/chat/history/admin', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('staffToken') }
            });
            const data = await response.json();
            if (data.success) {
                const isAtBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 50;

                container.innerHTML = '';
                if (data.history.length === 0) {
                    container.innerHTML = '<div class="text-center py-5 text-muted small"><p class="mb-0">No messages yet. Send a message to start conversation with Admin.</p></div>';
                    return;
                }

                data.history.forEach(m => {
                    const isMe = m.senderId !== 'admin';
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

    async function sendStaffChatMessage() {
        const input = document.getElementById('staffChatMessageInput');
        if (!input) return;

        const message = input.value.trim();
        if (!message) return;

        input.value = '';

        try {
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('staffToken')
                },
                body: JSON.stringify({
                    receiverId: 'admin',
                    message: message
                })
            });
            const data = await response.json();
            if (data.success) {
                await loadStaffChatHistory();
                const container = document.getElementById('staffChatMessagesContainer');
                if (container) container.scrollTop = container.scrollHeight;
            } else {
                showToast(data.message || 'Failed to send message.', false);
            }
        } catch (err) {
            console.error(err);
            showToast('Connection failed.', false);
        }
    }
    window.sendStaffChatMessage = sendStaffChatMessage;

    async function updateStaffChatBadge() {
        const badge = document.getElementById('unreadStaffChatBadge');
        if (!badge) return;

        try {
            const response = await fetch('/api/chat/unread-count', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('staffToken') }
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
                            body: "You have new unread messages from DSS Admin.",
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

    function deleteStaffChatHistory() {
        const isConfirmed = confirm('Are you sure you want to clear your chat history with Admin? This action cannot be undone.');
        if (!isConfirmed) return;

        try {
            fetch('/api/chat/history/admin', {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('staffToken')
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('Chat history cleared successfully.', true);
                    loadStaffChatHistory();
                } else {
                    showToast(data.message || 'Failed to clear chat history.', false);
                }
            });
        } catch (err) {
            console.error(err);
            showToast('Connection failed.', false);
        }
    }
    window.deleteStaffChatHistory = deleteStaffChatHistory;

    // Calendar functions (View-Only for Staff)
    let currentCalendarDate = new Date();

    function changeMonth(dir) {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + dir);
        renderCalendar();
    }
    window.changeMonth = changeMonth;

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
                </div>
            `;
            
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = allTasks.filter(t => t.deadline === dateString);
            
            if (dayTasks.length > 0) {
                const badge = document.createElement('div');
                badge.className = 'calendar-task-badge mt-2';
                badge.style.display = 'inline-flex';
                badge.style.alignItems = 'center';
                badge.style.justifyContent = 'center';
                badge.style.width = '20px';
                badge.style.height = '20px';
                badge.style.borderRadius = '50%';
                badge.style.background = 'linear-gradient(135deg, #fa9d1c, #ff7b00)';
                badge.style.color = '#fff';
                badge.style.fontSize = '10px';
                badge.style.fontWeight = 'bold';
                badge.style.boxShadow = '0 0 8px rgba(250,157,28,0.6)';
                badge.textContent = dayTasks.length;
                badge.title = `${dayTasks.length} Tasks Scheduled`;
                
                cell.appendChild(badge);
            }
            
            cell.style.cursor = 'pointer';
            cell.addEventListener('click', () => {
                if (dayTasks.length > 0) {
                    showStaffDayTasksModal(dateString, dayTasks);
                }
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
    window.renderCalendar = renderCalendar;

    function showStaffDayTasksModal(dateString, dayTasks) {
        const existing = document.getElementById('day-tasks-modal-container');
        if (existing) existing.remove();
        
        const formattedDate = new Date(dateString + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        let tasksHtml = '';
        dayTasks.forEach(t => {
            let statusBadge = '';
            if (t.status === 'pending') statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
            else if (t.status === 'in_progress') statusBadge = '<span class="badge bg-info text-dark">In Progress</span>';
            else if (t.status === 'under_review') statusBadge = '<span class="badge bg-purple text-white" style="background:#9b5de5;">Under Review</span>';
            else if (t.status === 'completed') statusBadge = '<span class="badge bg-success text-white">Completed</span>';
            
            tasksHtml += `
                <div class="p-3 mb-2 rounded border" style="background: rgba(255,255,255,0.02); border-color: var(--border-color) !important;">
                    <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                        <div>
                            <h6 class="text-white fw-bold m-0" style="font-size: 15px;">${t.title}</h6>
                            <small class="text-muted d-block mt-1">Client: ${t.client}</small>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            ${statusBadge}
                            <button class="btn btn-sm btn-outline-info" onclick="viewTaskFromCalendar('${t.id}')" title="View Details"><i class="fa-solid fa-eye"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        const wrapper = document.createElement('div');
        wrapper.id = 'day-tasks-modal-container';
        wrapper.innerHTML = `
            <div class="modal fade" id="dayTasksModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content custom-modal-content" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 16px;">
                        <div class="modal-header custom-modal-header border-bottom d-flex justify-content-between align-items-center" style="border-color: var(--border-color) !important;">
                            <div>
                                <h5 class="modal-title text-white fw-bold">Tasks List</h5>
                                <small class="text-muted">${formattedDate}</small>
                            </div>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body custom-modal-body text-white p-4" style="max-height: 400px; overflow-y: auto;">
                            <div class="mb-3">
                                <span class="text-white-50 font-weight-bold">${dayTasks.length} Tasks Scheduled</span>
                            </div>
                            ${tasksHtml}
                        </div>
                        <div class="modal-footer custom-modal-footer border-top" style="border-color: var(--border-color) !important;">
                            <button type="button" class="btn btn-outline-dss" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(wrapper);
        const bsModal = new bootstrap.Modal(document.getElementById('dayTasksModal'));
        bsModal.show();
    }
    window.showStaffDayTasksModal = showStaffDayTasksModal;

    function viewTaskFromCalendar(taskId) {
        const dayModalEl = document.getElementById('dayTasksModal');
        if (dayModalEl) {
            const dayModal = bootstrap.Modal.getInstance(dayModalEl);
            if (dayModal) dayModal.hide();
        }
        setTimeout(() => {
            const t = allTasks.find(x => x.id === taskId);
            if (t) showStaffTaskAlertDetails(t);
        }, 450);
    }
    window.viewTaskFromCalendar = viewTaskFromCalendar;

    function showStaffTaskAlertDetails(t) {
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
                                <span class="badge bg-info text-dark" style="font-size: 11px; padding: 6px 12px; border-radius: 8px;">${t.status.replace('_', ' ')}</span>
                                <span class="priority-text text-danger" style="font-size: 11px;">${t.priority} Priority</span>
                            </div>
                            <hr style="border-color: var(--border-color); opacity: 0.1;">
                            <div class="mb-3">
                                <strong class="text-white-50 d-block small mb-1">Client:</strong>
                                <span>${t.client}</span>
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
    window.showStaffTaskAlertDetails = showStaffTaskAlertDetails;
});
