document.addEventListener('DOMContentLoaded', () => {
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
        updateDateTime();
        setInterval(updateDateTime, 60000);
        
        await checkTodayPunchStatus();
        await loadAttendanceHistory();
        await loadStaffTasks();
        
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
                    renderAnnouncementsInbox();
                } else if (targetTab === 'profile-settings') {
                    loadProfileData();
                } else if (targetTab === 'my-attendance') {
                    loadAttendanceHistory();
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
        
        if (!activeLog) {
            punchBtn.className = 'punch-btn punch-btn-in w-100';
            punchBtnText.textContent = 'Punch In';
            if (shiftTimer) shiftTimer.textContent = '00:00:00';
            if (statShiftStatus) statShiftStatus.innerHTML = '<span class="text-muted">Offline</span>';
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
});
