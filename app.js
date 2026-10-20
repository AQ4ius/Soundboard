// GRizal Stage Soundboard Application Engine
(function () {
    'use strict';

    // State & Storage Keys
    const USERS_KEY = 'aq_users_v1';
    const CURRENT_USER_ID_KEY = 'aq_current_user_id_v1';
    const SOUNDBOARDS_LEGACY_KEY = 'grizal_soundboards_v2';
    const STORAGE_LEGACY_KEY = 'grizal_soundboard_sounds_v1';
    const SETTINGS_KEY = 'aqsound_settings_v1';

    const DEFAULT_ACCOUNTS = [
        {
            id: 'guest',
            username: 'user',
            displayName: 'User',
            email: 'user@aqsound.local',
            role: 'user',
            password: '',
            avatarLetter: 'U',
            avatarBg: '#3b82f6'
        },
        {
            id: 'owner',
            username: 'AQ4ius',
            displayName: 'AQ4ius (Owner)',
            email: 'aqu4gmr@gmail.com',
            role: 'owner',
            password: 'aqsound_owner',
            avatar: 'AQSoundboard_Logo.png'
        },
        {
            id: 'grizal',
            username: 'grizal',
            displayName: 'GRizal Production',
            email: 'grizal.team@gmail.com',
            role: 'team',
            password: 'grizal_production',
            avatarLetter: 'G',
            avatarBg: '#8b5cf6'
        }
    ];

    let currentUser = null;
    let soundboards = [];
    let activeSoundboardId = 'sb_default';
    let sounds = [];
    const audioPool = new Map(); // id -> HTMLAudioElement
    const activeAudios = new Map(); // id -> { audio, intervalId, sound }
    
    let activeCategory = 'All';
    let searchQuery = '';
    let isCompact = false;

    let settings = {
        masterVolume: 1.0,
        isMuted: false,
        overlapMode: true, // true = Polyphonic, false = Solo
        retriggerMode: 'restart', // 'restart' or 'toggle'
        gridDensity: 'normal'
    };

    let recordingTarget = null; // { soundId, mode: 'card'|'addModal'|'editModal' }
    let primaryNowPlayingSoundId = null;

    // DOM Elements
    const soundboardGrid = document.getElementById('soundboardGrid');
    const categoryChipsContainer = document.getElementById('categoryChipsContainer');
    const catScrollLeftBtn = document.getElementById('catScrollLeftBtn');
    const catScrollRightBtn = document.getElementById('catScrollRightBtn');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const totalSoundsCount = document.getElementById('totalSoundsCount');
    const activePlayingCount = document.getElementById('activePlayingCount');
    const emptyState = document.getElementById('emptyState');

    // Views & Nav Switcher
    let currentMainView = 'home'; // Default to Home Screen so user sees folders!
    let isSfxTrayCollapsed = false;

    const navHomeFoldersBtn = document.getElementById('navHomeFoldersBtn');
    const navSoundboardBtn = document.getElementById('navSoundboardBtn');
    const activeSbNavIcon = document.getElementById('activeSbNavIcon');
    const activeSoundboardNavLabel = document.getElementById('activeSoundboardNavLabel');
    const homeFoldersView = document.getElementById('homeFoldersView');
    const stageSoundboardView = document.getElementById('stageSoundboardView');
    const foldersGrid = document.getElementById('foldersGrid');
    const createFolderBtn = document.getElementById('createFolderBtn');
    const backToFoldersBtn = document.getElementById('backToFoldersBtn');
    const breadcrumbFolderName = document.getElementById('breadcrumbFolderName');
    const breadcrumbFolderCount = document.getElementById('breadcrumbFolderCount');
    const breadcrumbFolderIcon = document.getElementById('breadcrumbFolderIcon');
    const addCategoryBtn = document.getElementById('addCategoryBtn');

    // Soundboard Folder Modals
    const folderModal = document.getElementById('folderModal');
    const folderModalTitle = document.getElementById('folderModalTitle');
    const closeFolderModalBtn = document.getElementById('closeFolderModalBtn');
    const cancelFolderBtn = document.getElementById('cancelFolderBtn');
    const folderForm = document.getElementById('folderForm');
    const folderOriginalId = document.getElementById('folderOriginalId');
    const folderNameInput = document.getElementById('folderNameInput');
    const folderDescInput = document.getElementById('folderDescInput');

    const deleteFolderModal = document.getElementById('deleteFolderModal');
    const closeDeleteFolderModalBtn = document.getElementById('closeDeleteFolderModalBtn');
    const cancelDeleteFolderBtn = document.getElementById('cancelDeleteFolderBtn');
    const confirmDeleteFolderBtn = document.getElementById('confirmDeleteFolderBtn');
    const deleteFolderNameText = document.getElementById('deleteFolderNameText');
    let targetSoundboardToDelete = null;

    // Category Modal (inside soundboard)
    const categoryModal = document.getElementById('categoryModal');
    const closeCategoryModalBtn = document.getElementById('closeCategoryModalBtn');
    const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
    const categoryForm = document.getElementById('categoryForm');
    const categoryNameInput = document.getElementById('categoryNameInput');

    // Persistent Pinned Category Bottom Tray
    const generalSfxTray = document.getElementById('generalSfxTray');
    const generalSfxList = document.getElementById('generalSfxList');
    const generalSfxCountBadge = document.getElementById('generalSfxCountBadge');
    const pinnedCatNameBadge = document.getElementById('pinnedCatNameBadge');
    const pinnedCategoryDropdown = document.getElementById('pinnedCategoryDropdown');
    const trayDropBanner = document.getElementById('trayDropBanner');
    const toggleSfxTrayBtn = document.getElementById('toggleSfxTrayBtn');
    const sfxTrayToggleIcon = document.getElementById('sfxTrayToggleIcon');
    const sfxTrayToggleText = document.getElementById('sfxTrayToggleText');

    // Controls
    const panicStopBtn = document.getElementById('panicStopBtn');
    const masterMuteBtn = document.getElementById('masterMuteBtn');
    const masterVolumeSlider = document.getElementById('masterVolumeSlider');
    const masterVolumeValue = document.getElementById('masterVolumeValue');
    const playbackModeBtn = document.getElementById('playbackModeBtn');
    const modeIcon = document.getElementById('modeIcon');
    const modeText = document.getElementById('modeText');
    const retriggerModeBtn = document.getElementById('retriggerModeBtn');
    const retriggerText = document.getElementById('retriggerText');
    const viewGridDensityBtn = document.getElementById('viewGridDensityBtn');
    const densityText = document.getElementById('densityText');

    // Now Playing Dock (Multi-Track Audio Player)
    const nowPlayingDock = document.getElementById('nowPlayingDock');
    const dockRackHeader = document.getElementById('dockRackHeader');
    const dockRackCount = document.getElementById('dockRackCount');
    const dockStopAllBtn = document.getElementById('dockStopAllBtn');
    const nowPlayingTracksList = document.getElementById('nowPlayingTracksList');

    // Modals
    const addSoundModal = document.getElementById('addSoundModal');
    const openAddModalBtn = document.getElementById('openAddModalBtn');
    const closeAddModalBtn = document.getElementById('closeAddModalBtn');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const addSoundForm = document.getElementById('addSoundForm');
    const modalFileDropZone = document.getElementById('modalFileDropZone');
    const soundFileInput = document.getElementById('soundFileInput');
    const fileDropLabel = document.getElementById('fileDropLabel');
    const newSoundTitle = document.getElementById('newSoundTitle');
    const newSoundCategory = document.getElementById('newSoundCategory');
    const newCategoryCustomGroup = document.getElementById('newCategoryCustomGroup');
    const newCategoryCustomInput = document.getElementById('newCategoryCustomInput');
    const newSoundKeybind = document.getElementById('newSoundKeybind');
    const recordNewKeybindBtn = document.getElementById('recordNewKeybindBtn');
    const clearNewKeybindBtn = document.getElementById('clearNewKeybindBtn');
    const newSoundLoop = document.getElementById('newSoundLoop');
    const newSoundIsBgm = document.getElementById('newSoundIsBgm');

    const editSoundModal = document.getElementById('editSoundModal');
    const closeEditModalBtn = document.getElementById('closeEditModalBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editSoundForm = document.getElementById('editSoundForm');
    const editSoundId = document.getElementById('editSoundId');
    const editSoundTitle = document.getElementById('editSoundTitle');
    const editSoundCategory = document.getElementById('editSoundCategory');
    const editCategoryCustomGroup = document.getElementById('editCategoryCustomGroup');
    const editCategoryCustomInput = document.getElementById('editCategoryCustomInput');
    const editSoundKeybind = document.getElementById('editSoundKeybind');
    const recordEditKeybindBtn = document.getElementById('recordEditKeybindBtn');

    // Rename & Delete Category Modals
    const renameCategoryModal = document.getElementById('renameCategoryModal');
    const renameCategoryForm = document.getElementById('renameCategoryForm');
    const renameCategoryOldName = document.getElementById('renameCategoryOldName');
    const renameCategoryNewName = document.getElementById('renameCategoryNewName');
    const closeRenameCategoryModalBtn = document.getElementById('closeRenameCategoryModalBtn');
    const cancelRenameCategoryBtn = document.getElementById('cancelRenameCategoryBtn');

    const deleteCategoryModal = document.getElementById('deleteCategoryModal');
    const deleteCategoryForm = document.getElementById('deleteCategoryForm');
    const deleteCategoryTargetName = document.getElementById('deleteCategoryTargetName');
    const deleteCategoryTargetText = document.getElementById('deleteCategoryTargetText');
    const deleteCategorySoundCountText = document.getElementById('deleteCategorySoundCountText');
    const deleteCategoryMoveTarget = document.getElementById('deleteCategoryMoveTarget');
    const closeDeleteCategoryModalBtn = document.getElementById('closeDeleteCategoryModalBtn');
    const cancelDeleteCategoryBtn = document.getElementById('cancelDeleteCategoryBtn');
    const clearEditKeybindBtn = document.getElementById('clearEditKeybindBtn');
    const editSoundVolume = document.getElementById('editSoundVolume');
    const editVolumeDisplay = document.getElementById('editVolumeDisplay');
    const editSoundPlaybackRate = document.getElementById('editSoundPlaybackRate');
    const editSpeedDisplay = document.getElementById('editSpeedDisplay');
    const editSoundLoop = document.getElementById('editSoundLoop');
    const editSoundIsBgm = document.getElementById('editSoundIsBgm');
    const deleteSoundBtn = document.getElementById('deleteSoundBtn');

    const keybindCaptureModal = document.getElementById('keybindCaptureModal');
    const captureSoundTitle = document.getElementById('captureSoundTitle');
    const detectedKeyDisplay = document.getElementById('detectedKeyDisplay');
    const cancelCaptureBtn = document.getElementById('cancelCaptureBtn');

    const keybindMapModal = document.getElementById('keybindMapModal');
    const keybindMapBtn = document.getElementById('keybindMapBtn');
    const closeKeybindMapBtn = document.getElementById('closeKeybindMapBtn');
    const keybindTableBody = document.getElementById('keybindTableBody');

    const settingsModal = document.getElementById('settingsModal');
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
    const exportConfigBtn = document.getElementById('exportConfigBtn');
    const importConfigBtn = document.getElementById('importConfigBtn');
    const importConfigFile = document.getElementById('importConfigFile');
    const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');

    const dropOverlay = document.getElementById('dropOverlay');

    // User Accounts & Authentication Elements
    const userAccountBtn = document.getElementById('userAccountBtn');
    const userAvatarImg = document.getElementById('userAvatarImg');
    const userDisplayName = document.getElementById('userDisplayName');
    const userRoleBadge = document.getElementById('userRoleBadge');
    const accountDropdownMenu = document.getElementById('accountDropdownMenu');
    const menuAvatarImg = document.getElementById('menuAvatarImg');
    const menuUserName = document.getElementById('menuUserName');
    const menuUserEmail = document.getElementById('menuUserEmail');
    const menuRoleTag = document.getElementById('menuRoleTag');
    const openEditProfileBtn = document.getElementById('openEditProfileBtn');
    const openAuthModalBtn = document.getElementById('openAuthModalBtn');
    const signOutBtn = document.getElementById('signOutBtn');

    // Auth & Google Modals
    const authModal = document.getElementById('authModal');
    const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
    const authGoogleBtn = document.getElementById('authGoogleBtn');
    const authTabSignIn = document.getElementById('authTabSignIn');
    const authTabSignUp = document.getElementById('authTabSignUp');
    const authSignInForm = document.getElementById('authSignInForm');
    const authSignInUsername = document.getElementById('authSignInUsername');
    const authSignInPassword = document.getElementById('authSignInPassword');
    const openForgotPasswordBtn = document.getElementById('openForgotPasswordBtn');
    const authSignUpForm = document.getElementById('authSignUpForm');
    const authSignUpName = document.getElementById('authSignUpName');
    const authSignUpUsername = document.getElementById('authSignUpUsername');
    const authSignUpPassword = document.getElementById('authSignUpPassword');

    const googleAuthModal = document.getElementById('googleAuthModal');
    const closeGoogleAuthModalBtn = document.getElementById('closeGoogleAuthModalBtn');
    const googleAuthForm = document.getElementById('googleAuthForm');
    const googleCustomName = document.getElementById('googleCustomName');
    const googleCustomEmail = document.getElementById('googleCustomEmail');

    // Edit Profile Modal
    const editProfileModal = document.getElementById('editProfileModal');
    const closeEditProfileModalBtn = document.getElementById('closeEditProfileModalBtn');
    const cancelEditProfileBtn = document.getElementById('cancelEditProfileBtn');
    const editProfileForm = document.getElementById('editProfileForm');
    const editProfileAvatarPreview = document.getElementById('editProfileAvatarPreview');
    const editProfileHeaderName = document.getElementById('editProfileHeaderName');
    const editProfileHeaderRole = document.getElementById('editProfileHeaderRole');
    const profileDisplayNameInput = document.getElementById('profileDisplayNameInput');
    const profileUsernameInput = document.getElementById('profileUsernameInput');
    const profileEmailInput = document.getElementById('profileEmailInput');
    const profileCurrentPasswordInput = document.getElementById('profileCurrentPasswordInput');
    const profileNewPasswordInput = document.getElementById('profileNewPasswordInput');

    // Forgot Password Modal
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const closeForgotPasswordModalBtn = document.getElementById('closeForgotPasswordModalBtn');
    const cancelForgotPasswordBtn = document.getElementById('cancelForgotPasswordBtn');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotUsernameInput = document.getElementById('forgotUsernameInput');
    const forgotNewPasswordInput = document.getElementById('forgotNewPasswordInput');
    const forgotConfirmPasswordInput = document.getElementById('forgotConfirmPasswordInput');

    let pendingFilesToAdd = [];

    // ================= USER ACCOUNT MANAGEMENT =================
    function getUsers() {
        try {
            const saved = localStorage.getItem(USERS_KEY);
            if (saved) {
                const list = JSON.parse(saved);
                if (Array.isArray(list) && list.length > 0) return list;
            }
        } catch (e) {
            console.warn('Failed to parse users', e);
        }
        return DEFAULT_ACCOUNTS.map(a => Object.assign({}, a));
    }

    function saveUsers(usersList) {
        try {
            localStorage.setItem(USERS_KEY, JSON.stringify(usersList));
        } catch (e) {
            console.error('Failed to save users', e);
        }
    }

    function getCurrentUser() {
        if (currentUser) return currentUser;
        const users = getUsers();
        const savedId = localStorage.getItem(CURRENT_USER_ID_KEY);
        if (savedId) {
            currentUser = users.find(u => u.id === savedId);
        }
        if (!currentUser) {
            // Default to standard website visitor/user account (perspective of the user)
            currentUser = users.find(u => u.id === 'guest') || users[0];
        }
        return currentUser;
    }

    function getSoundboardsStorageKey() {
        const user = getCurrentUser();
        return `aq_soundboards_${user.id}_v2`;
    }

    function getActiveSbStorageKey() {
        const user = getCurrentUser();
        return `aq_active_sb_${user.id}_v2`;
    }

    function updateUserHeaderUI() {
        const user = getCurrentUser();
        if (!user) return;

        if (userDisplayName) userDisplayName.textContent = user.displayName || user.username;

        if (userRoleBadge) {
            if (user.role === 'owner') {
                userRoleBadge.textContent = '👑 Owner';
                userRoleBadge.className = 'user-role-badge owner';
            } else if (user.role === 'team') {
                userRoleBadge.textContent = '🎭 Team';
                userRoleBadge.className = 'user-role-badge team';
            } else {
                userRoleBadge.textContent = '👤 User';
                userRoleBadge.className = 'user-role-badge user';
            }
        }

        // Header button avatar
        if (userAvatarImg && userAccountBtn) {
            let letterEl = userAccountBtn.querySelector('.header-avatar-letter');
            if (user.avatar) {
                userAvatarImg.src = user.avatar;
                userAvatarImg.style.display = 'block';
                if (letterEl) letterEl.remove();
            } else {
                userAvatarImg.style.display = 'none';
                if (!letterEl) {
                    letterEl = document.createElement('div');
                    letterEl.className = 'google-acc-avatar-letter header-avatar-letter';
                    letterEl.style.width = '26px';
                    letterEl.style.height = '26px';
                    letterEl.style.fontSize = '12px';
                    userAccountBtn.insertBefore(letterEl, userAvatarImg);
                }
                letterEl.textContent = (user.displayName || user.username || 'U')[0].toUpperCase();
                letterEl.style.backgroundColor = user.avatarBg || '#3b82f6';
            }
        }

        // Dropdown menu header
        if (menuUserName) menuUserName.textContent = user.displayName || user.username;
        if (menuUserEmail) menuUserEmail.textContent = user.email || `${user.username.toLowerCase()}@aqsound.local`;
        if (menuRoleTag) {
            if (user.role === 'owner') {
                menuRoleTag.textContent = '👑 Owner Account';
                menuRoleTag.className = 'role-tag owner';
            } else if (user.role === 'team') {
                menuRoleTag.textContent = '🎭 GRizal Team Account';
                menuRoleTag.className = 'role-tag team';
            } else {
                menuRoleTag.textContent = '👤 Personal Account';
                menuRoleTag.className = 'role-tag user';
            }
        }

        if (menuAvatarImg) {
            let menuLetterEl = document.getElementById('menuAvatarLetterCircle');
            if (user.avatar) {
                menuAvatarImg.src = user.avatar;
                menuAvatarImg.style.display = 'block';
                if (menuLetterEl) menuLetterEl.remove();
            } else {
                menuAvatarImg.style.display = 'none';
                if (!menuLetterEl) {
                    menuLetterEl = document.createElement('div');
                    menuLetterEl.id = 'menuAvatarLetterCircle';
                    menuLetterEl.className = 'google-acc-avatar-letter';
                    menuAvatarImg.parentNode.insertBefore(menuLetterEl, menuAvatarImg);
                }
                menuLetterEl.textContent = (user.displayName || user.username || 'U')[0].toUpperCase();
                menuLetterEl.style.backgroundColor = user.avatarBg || '#3b82f6';
            }
        }
    }

    async function switchAccount(userId) {
        stopAllSounds();

        const users = getUsers();
        let target = users.find(u => u.id === userId || u.username.toLowerCase() === userId.toLowerCase());
        if (!target) {
            showToast('Account not found.', 'error');
            return;
        }

        currentUser = target;
        localStorage.setItem(CURRENT_USER_ID_KEY, target.id);

        if (accountDropdownMenu) accountDropdownMenu.classList.add('hidden');
        if (authModal) authModal.classList.add('hidden');
        if (googleAuthModal) googleAuthModal.classList.add('hidden');

        updateUserHeaderUI();
        await loadSoundboards();
        renderFolders();
        renderCategories();
        renderSounds();
        renderGeneralSfxTray();
        updateBreadcrumb();
        switchMainView('home');

        showToast(`Signed in as ${target.displayName}`, 'success');
    }

    function handleSignOut() {
        stopAllSounds();
        const users = getUsers();
        let guestUser = users.find(u => u.id === 'guest');
        if (!guestUser) {
            guestUser = {
                id: 'guest',
                username: 'user',
                displayName: 'User',
                email: 'user@aqsound.local',
                role: 'user',
                avatarLetter: 'U',
                avatarBg: '#3b82f6'
            };
            users.unshift(guestUser);
            saveUsers(users);
        }
        switchAccount('guest');
        showToast('Signed out. Reset to personal User soundboard.', 'info');
    }

    function openEditProfileModal() {
        const user = getCurrentUser();
        if (!user || !editProfileModal) return;

        if (profileDisplayNameInput) profileDisplayNameInput.value = user.displayName || user.username || '';
        if (profileUsernameInput) profileUsernameInput.value = user.username || '';
        if (profileEmailInput) profileEmailInput.value = user.email || '';
        if (profileCurrentPasswordInput) profileCurrentPasswordInput.value = '';
        if (profileNewPasswordInput) profileNewPasswordInput.value = '';

        if (editProfileHeaderName) editProfileHeaderName.textContent = user.displayName || user.username || 'User';
        if (editProfileHeaderRole) {
            if (user.role === 'owner') {
                editProfileHeaderRole.textContent = '👑 Owner Account';
                editProfileHeaderRole.className = 'role-tag owner';
            } else if (user.role === 'team') {
                editProfileHeaderRole.textContent = '🎭 GRizal Team Account';
                editProfileHeaderRole.className = 'role-tag team';
            } else {
                editProfileHeaderRole.textContent = '👤 Personal Account';
                editProfileHeaderRole.className = 'role-tag user';
            }
        }

        if (editProfileAvatarPreview) {
            editProfileAvatarPreview.textContent = (user.displayName || user.username || 'U')[0].toUpperCase();
            editProfileAvatarPreview.style.backgroundColor = user.avatarBg || '#3b82f6';
        }

        if (accountDropdownMenu) accountDropdownMenu.classList.add('hidden');
        editProfileModal.classList.remove('hidden');
        profileDisplayNameInput.focus();
    }

    function handleEditProfileSubmit(e) {
        e.preventDefault();
        const user = getCurrentUser();
        if (!user) return;

        const newName = profileDisplayNameInput.value.trim();
        const newUsername = profileUsernameInput.value.trim();
        const newEmail = profileEmailInput.value.trim();
        const curPwd = profileCurrentPasswordInput.value;
        const newPwd = profileNewPasswordInput.value;

        if (!newName || !newUsername) {
            showToast('Display Name and Username are required.', 'warning');
            return;
        }

        const users = getUsers();
        // Check username uniqueness if changed
        if (newUsername.toLowerCase() !== user.username.toLowerCase()) {
            if (users.some(u => u.id !== user.id && u.username.toLowerCase() === newUsername.toLowerCase())) {
                showToast('That username is already taken by another account.', 'warning');
                return;
            }
        }

        // Check password change
        if (newPwd) {
            if (newPwd.length < 4) {
                showToast('New password must be at least 4 characters long.', 'warning');
                return;
            }
            if (user.password) {
                let valid = (curPwd === user.password);
                if (!valid && user.id === 'owner' && (curPwd === 'aq4ius' || curPwd === 'aqsound')) valid = true;
                if (!valid && user.id === 'grizal' && curPwd === 'grizal') valid = true;
                if (!valid) {
                    showToast('Current password does not match.', 'error');
                    return;
                }
            }
            user.password = newPwd;
        }

        user.displayName = newName;
        user.username = newUsername;
        user.email = newEmail;
        user.avatarLetter = newName[0].toUpperCase();

        const idx = users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
            users[idx] = Object.assign({}, user);
        } else {
            users.push(user);
        }
        saveUsers(users);
        currentUser = user;

        updateUserHeaderUI();
        if (editProfileModal) editProfileModal.classList.add('hidden');
        showToast('Account profile successfully updated!', 'success');
    }

    function openForgotPasswordModal() {
        if (authModal) authModal.classList.add('hidden');
        if (forgotUsernameInput) forgotUsernameInput.value = authSignInUsername ? authSignInUsername.value.trim() : '';
        if (forgotNewPasswordInput) forgotNewPasswordInput.value = '';
        if (forgotConfirmPasswordInput) forgotConfirmPasswordInput.value = '';
        if (forgotPasswordModal) forgotPasswordModal.classList.remove('hidden');
        if (forgotUsernameInput) forgotUsernameInput.focus();
    }

    function handleForgotPasswordSubmit(e) {
        e.preventDefault();
        const targetInput = forgotUsernameInput.value.trim().toLowerCase();
        const newPwd = forgotNewPasswordInput.value;
        const confirmPwd = forgotConfirmPasswordInput.value;

        if (!targetInput) {
            showToast('Please enter your username or registered email.', 'warning');
            return;
        }

        if (newPwd.length < 4) {
            showToast('Password must be at least 4 characters long.', 'warning');
            return;
        }

        if (newPwd !== confirmPwd) {
            showToast('New passwords do not match. Please re-enter.', 'warning');
            return;
        }

        const users = getUsers();
        let found = users.find(u => 
            u.username.toLowerCase() === targetInput || 
            (u.email && u.email.toLowerCase() === targetInput) ||
            (u.id && u.id.toLowerCase() === targetInput)
        );

        if (!found && (targetInput === 'owner' || targetInput === 'aq4ius')) {
            found = users.find(u => u.id === 'owner');
        }
        if (!found && targetInput === 'grizal') {
            found = users.find(u => u.id === 'grizal');
        }

        if (!found) {
            showToast('Account not found with that username or email.', 'error');
            return;
        }

        found.password = newPwd;
        const idx = users.findIndex(u => u.id === found.id);
        if (idx !== -1) {
            users[idx] = found;
        }
        saveUsers(users);

        if (forgotPasswordModal) forgotPasswordModal.classList.add('hidden');
        switchAccount(found.id);
        showToast(`Password successfully reset! Signed in as ${found.displayName}.`, 'success');
    }

    // ================= GOOGLE OAUTH 2.0 =================
    const GOOGLE_CLIENT_ID = '949454012063-3lsq8s6if57oj5te2995tkc9d8o3nffk.apps.googleusercontent.com';

    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Failed to parse Google JWT credential', e);
            return null;
        }
    }

    function handleGoogleCredentialResponse(response) {
        if (!response || !response.credential) {
            showToast('Google sign-in was not completed.', 'error');
            return;
        }

        const payload = parseJwt(response.credential);
        if (!payload || !payload.email) {
            showToast('Unable to read Google account information.', 'error');
            return;
        }

        const users = getUsers();
        let user = users.find(u => 
            (u.email && u.email.toLowerCase() === payload.email.toLowerCase()) || 
            u.id === 'google_' + payload.sub
        );

        if (!user) {
            const username = payload.email.split('@')[0];
            const isOwner = (payload.email.toLowerCase() === 'aqu4gmr@gmail.com');
            user = {
                id: 'google_' + payload.sub,
                username: username,
                displayName: payload.name || username,
                email: payload.email,
                avatar: payload.picture || '',
                role: isOwner ? 'owner' : 'user',
                password: '',
                avatarLetter: (payload.name || username)[0].toUpperCase(),
                avatarBg: '#3b82f6'
            };
            users.push(user);
        } else {
            if (payload.picture) user.avatar = payload.picture;
            if (payload.name) user.displayName = payload.name;
        }

        saveUsers(users);
        switchAccount(user.id);
        showToast(`Signed in with Google as ${user.displayName}!`, 'success');
    }

    function initGoogleOAuth() {
        if (!window.google || !window.google.accounts || !window.google.accounts.id) {
            // Retry shortly if the async Google Identity script is still loading
            setTimeout(initGoogleOAuth, 300);
            return;
        }

        try {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true
            });

            const googleBtnContainer = document.getElementById('googleOfficialBtn');
            if (googleBtnContainer) {
                window.google.accounts.id.renderButton(
                    googleBtnContainer,
                    {
                        theme: 'outline',
                        size: 'large',
                        type: 'standard',
                        shape: 'rectangular',
                        text: 'signin_with',
                        logo_alignment: 'left',
                        width: 330
                    }
                );
                if (authGoogleBtn) {
                    authGoogleBtn.style.display = 'none';
                }
            }
        } catch (err) {
            console.warn('Google Identity Services notice:', err);
        }
    }

    // ================= INITIALIZATION =================
    async function init() {
        getCurrentUser();
        updateUserHeaderUI();
        loadSettings();
        await loadSoundboards();
        setupEventListeners();
        initGoogleOAuth();
        switchMainView(currentMainView);
        updateSettingsUI();
    }

    function loadSettings() {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                settings = Object.assign(settings, JSON.parse(saved));
            }
        } catch (e) {
            console.warn('Failed to load settings', e);
        }
    }

    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    function getActiveSoundboard() {
        let sb = soundboards.find(item => item.id === activeSoundboardId);
        if (!sb) {
            sb = soundboards[0] || {
                id: 'sb_' + Date.now(),
                name: 'My Soundboard',
                description: 'Personal audio collection',
                icon: '📁',
                color: '#3b82f6',
                sounds: [],
                customCategories: []
            };
            activeSoundboardId = sb.id;
        }
        return sb;
    }

    async function loadSoundboards() {
        const user = getCurrentUser();
        const storageKey = getSoundboardsStorageKey();
        const activeKey = getActiveSbStorageKey();

        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                soundboards = JSON.parse(saved);
            } else {
                soundboards = [];
            }
        } catch (e) {
            console.warn('Failed to load soundboards from storage', e);
            soundboards = [];
        }

        // If no soundboards yet for this account:
        if (!soundboards || soundboards.length === 0) {
            if (user.role === 'owner' || user.id === 'owner' || user.id === 'grizal' || user.role === 'team') {
                // Owner and GRizal group have the full 48-track GRizal soundboard
                let initialSounds = [];
                try {
                    const legacy = localStorage.getItem(SOUNDBOARDS_LEGACY_KEY) || localStorage.getItem(STORAGE_LEGACY_KEY);
                    if (legacy) {
                        const parsed = JSON.parse(legacy);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            initialSounds = parsed[0].sounds || parsed;
                        }
                    }
                } catch (err) {}
                if (!initialSounds || initialSounds.length === 0) {
                    if (window.DEFAULT_SOUNDS && Array.isArray(window.DEFAULT_SOUNDS)) {
                        initialSounds = JSON.parse(JSON.stringify(window.DEFAULT_SOUNDS));
                    }
                }

                soundboards = [
                    {
                        id: 'grizal',
                        name: 'GRIZAL',
                        description: 'Stage Play & Sound Effects Master Control for GRizal acts and chapters',
                        icon: '🎭',
                        color: '#3b82f6',
                        sounds: initialSounds,
                        customCategories: []
                    }
                ];
            } else {
                // Any other regular user / custom Google user / guest:
                // They do NOT have the GRizal folder! Clean personal soundboard.
                soundboards = [
                    {
                        id: 'sb_' + Date.now(),
                        name: 'My Soundboard',
                        description: `Personal soundboard for ${user.displayName || user.username}`,
                        icon: '🎵',
                        color: '#3b82f6',
                        sounds: [],
                        customCategories: ['General SFX', 'Music', 'Voice']
                    }
                ];
            }
            saveSoundboards();
        }

        const savedActiveId = localStorage.getItem(activeKey);
        if (savedActiveId && soundboards.some(sb => sb.id === savedActiveId)) {
            activeSoundboardId = savedActiveId;
        } else {
            activeSoundboardId = soundboards[0].id;
        }

        const activeSb = getActiveSoundboard();
        sounds = activeSb.sounds || [];

        // Restore custom blobs from IndexedDB if any
        for (const sound of sounds) {
            if (sound.customBlobId && window.SoundDB) {
                try {
                    const blob = await window.SoundDB.getAudio(sound.customBlobId);
                    if (blob) {
                        sound.src = URL.createObjectURL(blob);
                    }
                } catch (err) {
                    console.error('Error restoring audio blob:', err);
                }
            }
        }

        totalSoundsCount.textContent = sounds.length;
        updateActiveSoundboardHeader();
    }

    function saveSoundboards() {
        try {
            const serialized = soundboards.map(sb => {
                const sbCopy = Object.assign({}, sb);
                sbCopy.sounds = (sb.sounds || []).map(s => {
                    const copy = Object.assign({}, s);
                    if (copy.customBlobId) copy.src = '';
                    return copy;
                });
                return sbCopy;
            });
            localStorage.setItem(getSoundboardsStorageKey(), JSON.stringify(serialized));
            localStorage.setItem(getActiveSbStorageKey(), activeSoundboardId);
        } catch (e) {
            console.error('Failed to save soundboards to localStorage', e);
        }
    }

    function saveSounds() {
        const sb = getActiveSoundboard();
        sb.sounds = sounds;
        saveSoundboards();
        totalSoundsCount.textContent = sounds.length;
    }

    function updateActiveSoundboardHeader() {
        const sb = getActiveSoundboard();
        if (activeSoundboardNavLabel) activeSoundboardNavLabel.textContent = sb.name;
        if (activeSbNavIcon) activeSbNavIcon.textContent = sb.icon || '🎭';
    }

    // ================= TOAST NOTIFICATIONS =================
    const toastContainer = document.getElementById('toastContainer');
    function showToast(message, type = 'info') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'warning') icon = '⚠️';
        if (type === 'error') icon = '❌';
        if (type === 'success') icon = '✅';

        toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // ================= AUDIO ENGINE =================
    function getAudioElement(sound) {
        const isVideo = sound.src && sound.src.toLowerCase().includes('.mp4');

        if (!audioPool.has(sound.id)) {
            // Use <video> for mp4 to support video containers with AAC audio, <audio> for others
            const media = isVideo ? document.createElement('video') : new Audio();
            media.preload = 'metadata';
            media.dataset.origSrc = sound.src;
            media.src = sound.src;
            audioPool.set(sound.id, media);
        }

        const audio = audioPool.get(sound.id);
        // Only update src if the sound URL actually changed
        if (audio.dataset.origSrc !== sound.src && sound.src) {
            audio.dataset.origSrc = sound.src;
            audio.src = sound.src;
            audio.load();
        }
        return audio;
    }

    function calculateVolume(soundVolume) {
        if (settings.isMuted) return 0;
        const v = (soundVolume !== undefined ? soundVolume : 1.0) * settings.masterVolume;
        return Math.max(0, Math.min(1, v));
    }

    function updateCardPlayState(soundId, isPlaying) {
        // Update main sound card
        const card = document.querySelector(`.sound-card[data-id="${soundId}"]`);
        if (card) {
            card.classList.toggle('is-playing', isPlaying);
            const playTrigger = card.querySelector('.card-play-trigger');
            if (playTrigger) {
                const circle = playTrigger.querySelector('.play-btn-circle');
                const textSpan = playTrigger.querySelector('span');
                if (isPlaying) {
                    if (circle) circle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect></svg>';
                    if (textSpan) textSpan.textContent = 'Pause';
                } else {
                    if (circle) circle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>';
                    if (textSpan) textSpan.textContent = 'Play';
                }
            }
        }

        // Update button in General SFX tray if present
        const sfxBtn = document.querySelector(`.quick-sfx-btn[data-id="${soundId}"]`);
        if (sfxBtn) {
            sfxBtn.classList.toggle('is-playing', isPlaying);
            const sfxIcon = sfxBtn.querySelector('.quick-sfx-icon');
            if (sfxIcon) {
                sfxIcon.innerHTML = isPlaying ? 
                    '<svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect></svg>' : 
                    '<svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>';
            }
        }
    }

    function togglePlayPause(soundId) {
        if (activeAudios.has(soundId)) {
            const active = activeAudios.get(soundId);
            if (!active.audio.paused) {
                // Currently playing -> Pause it
                active.audio.pause();
                updateCardPlayState(soundId, false);
                updateNowPlayingDock();
            } else {
                // Currently paused -> Resume it
                active.audio.play().then(() => {
                    updateCardPlayState(soundId, true);
                    updateNowPlayingDock();
                }).catch(e => console.warn('Resume error:', e));
            }
        } else {
            playSound(soundId);
        }
    }

    function playSound(soundId, isKeyTrigger = false) {
        const sound = sounds.find(s => s.id === soundId);
        if (!sound) return;

        const card = document.querySelector(`.sound-card[data-id="${soundId}"]`);
        if (isKeyTrigger && card) {
            card.classList.add('key-trigger');
            setTimeout(() => card.classList.remove('key-trigger'), 350);
        }

        const isAlreadyPlaying = activeAudios.has(soundId);

        if (isAlreadyPlaying) {
            const active = activeAudios.get(soundId);
            if (active) {
                if (settings.retriggerMode === 'toggle') {
                    if (!active.audio.paused) {
                        active.audio.pause();
                        updateCardPlayState(soundId, false);
                        updateNowPlayingDock();
                        return;
                    } else {
                        active.audio.play().then(() => {
                            updateCardPlayState(soundId, true);
                            updateNowPlayingDock();
                        }).catch(e => console.warn('Play error:', e));
                        return;
                    }
                } else {
                    // Retrigger restart
                    active.audio.currentTime = 0;
                    if (active.audio.paused) {
                        active.audio.play().catch(e => console.warn('Play error:', e));
                    }
                    updateCardPlayState(soundId, true);
                    return;
                }
            }
        }

        // If Solo Mode is enabled, stop all other playing sounds
        if (!settings.overlapMode) {
            stopAllSounds();
        }

        let audio = getAudioElement(sound);
        audio.currentTime = 0;
        audio.volume = calculateVolume(sound.volume);
        audio.loop = !!sound.loop;
        audio.playbackRate = sound.playbackRate || 1.0;

        audio.play().then(() => {
            trackActiveAudio(sound, audio);
            updateCardPlayState(soundId, true);
        }).catch(async (err) => {
            console.warn('Initial playback failed for', sound.title, err);

            // If an <audio> element failed and it might be an MP4 or container issue, try <video> element fallback
            if (!(audio instanceof HTMLVideoElement) && (sound.src.includes('.mp4') || err.name === 'NotSupportedError')) {
                console.log('Attempting <video> fallback for', sound.title);
                const videoFallback = document.createElement('video');
                videoFallback.preload = 'metadata';
                videoFallback.dataset.origSrc = sound.src;
                videoFallback.src = sound.src;
                videoFallback.volume = calculateVolume(sound.volume);
                videoFallback.loop = !!sound.loop;
                videoFallback.playbackRate = sound.playbackRate || 1.0;
                audioPool.set(sound.id, videoFallback);

                try {
                    await videoFallback.play();
                    trackActiveAudio(sound, videoFallback);
                    updateCardPlayState(soundId, true);
                    return;
                } catch (fallbackErr) {
                    console.error('Video fallback error:', fallbackErr);
                }
            }

            if (err.name === 'NotAllowedError') {
                showToast('Click anywhere on the soundboard first to enable audio output.', 'warning');
            } else if (err.name === 'NotSupportedError') {
                showToast(`Audio format not supported for "${sound.title}".`, 'error');
            } else if (err.name !== 'AbortError') {
                showToast(`Playback error for "${sound.title}": ${err.message || 'Check audio file'}`, 'error');
            }
        });
    }

    function trackActiveAudio(sound, audio) {
        const soundId = sound.id;
        updateCardPlayState(soundId, true);

        // Progress tracking interval
        const intervalId = setInterval(() => {
            updateSoundProgress(sound, audio);
        }, 100);

        activeAudios.set(soundId, { audio, intervalId, sound });
        primaryNowPlayingSoundId = soundId;

        audio.onended = () => {
            if (!audio.loop) {
                stopSound(soundId);
            }
        };

        audio.onpause = () => {
            updateCardPlayState(soundId, false);
            updateNowPlayingDock();
        };

        audio.onplay = () => {
            updateCardPlayState(soundId, true);
            updateNowPlayingDock();
        };

        updateActiveCounts();
        updateNowPlayingDock();
    }

    function updateSoundProgress(sound, audio) {
        const soundId = sound.id;
        const card = document.querySelector(`.sound-card[data-id="${soundId}"]`);
        const duration = audio.duration || 0;
        const currentTime = audio.currentTime || 0;
        const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

        if (card) {
            const bar = card.querySelector('.card-progress-bar');
            if (bar) bar.style.width = `${percent}%`;
            const timeSpan = card.querySelector('.time-display');
            if (timeSpan) {
                timeSpan.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
            }
        }

        const sfxBtn = document.querySelector(`.quick-sfx-btn[data-id="${soundId}"]`);
        if (sfxBtn) {
            const bar = sfxBtn.querySelector('.quick-sfx-progress');
            if (bar) bar.style.width = `${percent}%`;
        }

        // Update Multi-Track Player Dock
        if (nowPlayingTracksList) {
            const row = nowPlayingTracksList.querySelector(`.dock-track-row[data-id="${soundId}"]`);
            if (row) {
                const prog = row.querySelector('.dock-track-progress');
                if (prog && document.activeElement !== prog) {
                    prog.value = percent;
                }
                const cur = row.querySelector('.dock-track-cur-time');
                if (cur) cur.textContent = formatTime(currentTime);
                const dur = row.querySelector('.dock-track-dur-time');
                if (dur) dur.textContent = formatTime(duration);
            }
        }
    }

    function stopSound(soundId) {
        const active = activeAudios.get(soundId);
        if (active) {
            clearInterval(active.intervalId);
            active.audio.pause();
            active.audio.currentTime = 0;
            activeAudios.delete(soundId);
        }

        updateCardPlayState(soundId, false);

        const card = document.querySelector(`.sound-card[data-id="${soundId}"]`);
        if (card) {
            const bar = card.querySelector('.card-progress-bar');
            if (bar) bar.style.width = '0%';
            const timeSpan = card.querySelector('.time-display');
            if (timeSpan) timeSpan.textContent = '0:00';
        }

        const sfxBtn = document.querySelector(`.quick-sfx-btn[data-id="${soundId}"]`);
        if (sfxBtn) {
            const bar = sfxBtn.querySelector('.quick-sfx-progress');
            if (bar) bar.style.width = '0%';
        }

        if (primaryNowPlayingSoundId === soundId) {
            // Find another active track or null
            const remaining = Array.from(activeAudios.keys());
            primaryNowPlayingSoundId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        }

        updateActiveCounts();
        updateNowPlayingDock();
    }

    function stopAllSounds() {
        activeAudios.forEach((active, soundId) => {
            clearInterval(active.intervalId);
            active.audio.pause();
            active.audio.currentTime = 0;
            updateCardPlayState(soundId, false);

            const card = document.querySelector(`.sound-card[data-id="${soundId}"]`);
            if (card) {
                const bar = card.querySelector('.card-progress-bar');
                if (bar) bar.style.width = '0%';
                const timeSpan = card.querySelector('.time-display');
                if (timeSpan) timeSpan.textContent = '0:00';
            }

            const sfxBtn = document.querySelector(`.quick-sfx-btn[data-id="${soundId}"]`);
            if (sfxBtn) {
                const bar = sfxBtn.querySelector('.quick-sfx-progress');
                if (bar) bar.style.width = '0%';
            }
        });
        activeAudios.clear();
        primaryNowPlayingSoundId = null;
        updateActiveCounts();
        updateNowPlayingDock();
    }

    function updateActiveCounts() {
        const count = activeAudios.size;
        activePlayingCount.textContent = count;
        const chip = document.getElementById('playingCountChip');
        if (count > 0) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    }

    function updateAllVolumes() {
        activeAudios.forEach(active => {
            active.audio.volume = calculateVolume(active.sound.volume);
        });
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // ================= NOW PLAYING DOCK (MULTI-TRACK PLAYER) =================
    function updateNowPlayingDock() {
        if (!nowPlayingDock) return;

        const count = activeAudios.size;
        if (count === 0) {
            nowPlayingDock.classList.add('hidden');
            document.body.classList.remove('has-dock');
            document.documentElement.style.setProperty('--dock-height', '0px');
            return;
        }

        nowPlayingDock.classList.remove('hidden');
        document.body.classList.add('has-dock');

        // Multi-track header with Stop All
        if (dockRackHeader) {
            if (count > 1) {
                dockRackHeader.classList.remove('hidden');
                if (dockRackCount) {
                    dockRackCount.textContent = `${count} active sounds`;
                }
            } else {
                dockRackHeader.classList.add('hidden');
            }
        }

        // Build Multi-Track list rows
        if (nowPlayingTracksList) {
            let html = '';
            activeAudios.forEach((active, soundId) => {
                const sound = active.sound;
                const duration = active.audio.duration || 0;
                const currentTime = active.audio.currentTime || 0;
                const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
                const volPercent = Math.round((sound.volume !== undefined ? sound.volume : 1) * 100);
                const isPaused = !!active.audio.paused;
                const isLoop = !!active.audio.loop;

                html += `
                <div class="dock-track-row ${isPaused ? 'is-paused' : ''}" data-id="${escapeHtml(soundId)}">
                    <div class="dock-left">
                        <div class="now-playing-indicator ${isPaused ? 'paused' : ''}">
                            <span class="bar bar1"></span>
                            <span class="bar bar2"></span>
                            <span class="bar bar3"></span>
                            <span class="bar bar4"></span>
                        </div>
                        <div class="dock-info">
                            <div class="dock-title" title="${escapeHtml(sound.title)}">${escapeHtml(sound.title)}</div>
                            <div class="dock-subtitle">${escapeHtml(sound.category || 'Sound')} ${sound.isBgm ? '• BGM' : '• SFX'}</div>
                        </div>
                    </div>

                    <div class="dock-center">
                        <div class="dock-timeline">
                            <span class="dock-time dock-track-cur-time">${formatTime(currentTime)}</span>
                            <input type="range" class="dock-progress dock-track-progress" min="0" max="100" value="${percent}" title="Scrub audio position">
                            <span class="dock-time dock-track-dur-time">${formatTime(duration)}</span>
                        </div>
                    </div>

                    <div class="dock-right">
                        <button type="button" class="dock-btn dock-track-loop-btn ${isLoop ? 'active' : ''}" title="${isLoop ? 'Loop Enabled' : 'Loop Disabled'}" data-id="${escapeHtml(soundId)}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="17 1 21 5 17 9"></polyline>
                                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                                <polyline points="7 23 3 19 7 15"></polyline>
                                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                            </svg>
                        </button>
                        <div class="dock-volume">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                            <input type="range" class="dock-track-vol-slider" min="0" max="100" value="${volPercent}" title="Track Volume: ${volPercent}%" data-id="${escapeHtml(soundId)}">
                        </div>
                        <button type="button" class="dock-play-btn dock-track-pause-btn" title="${isPaused ? 'Resume Track' : 'Pause Track'}" data-id="${escapeHtml(soundId)}">
                            ${isPaused ? 
                                '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>' : 
                                '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
                            }
                        </button>
                        <button type="button" class="dock-stop-btn dock-track-stop-btn" title="Stop Track" data-id="${escapeHtml(soundId)}">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <rect x="6" y="6" width="12" height="12"></rect>
                            </svg>
                        </button>
                    </div>
                </div>`;
            });
            nowPlayingTracksList.innerHTML = html;
        }

        // Measure and sync --dock-height
        requestAnimationFrame(() => {
            if (nowPlayingDock && !nowPlayingDock.classList.contains('hidden')) {
                const rectHeight = nowPlayingDock.offsetHeight;
                document.documentElement.style.setProperty('--dock-height', `${rectHeight}px`);
            }
        });
    }

    // ================= VIEWS & FOLDERS =================
    function switchMainView(viewName) {
        currentMainView = viewName;
        if (viewName === 'home') {
            document.body.classList.add('is-home-view');
            if (homeFoldersView) homeFoldersView.classList.remove('hidden');
            if (stageSoundboardView) stageSoundboardView.classList.add('hidden');
            if (navHomeFoldersBtn) navHomeFoldersBtn.classList.add('active');
            if (navSoundboardBtn) navSoundboardBtn.classList.remove('active');
            if (generalSfxTray) generalSfxTray.classList.add('hidden');
            renderFolders();
        } else {
            document.body.classList.remove('is-home-view');
            if (homeFoldersView) homeFoldersView.classList.add('hidden');
            if (stageSoundboardView) stageSoundboardView.classList.remove('hidden');
            if (navHomeFoldersBtn) navHomeFoldersBtn.classList.remove('active');
            if (navSoundboardBtn) navSoundboardBtn.classList.add('active');
            if (generalSfxTray) generalSfxTray.classList.remove('hidden');
            updateActiveSoundboardHeader();
            updateBreadcrumb();
            renderCategories();
            renderSounds();
            renderGeneralSfxTray();
        }
    }

    async function setActiveSoundboard(sbId) {
        const sb = soundboards.find(item => item.id === sbId);
        if (!sb) return;
        activeSoundboardId = sb.id;
        sounds = sb.sounds || [];
        activeCategory = 'All';

        // Restore blobs if any
        for (const s of sounds) {
            if (s.customBlobId && !s.src && window.SoundDB) {
                try {
                    const blob = await window.SoundDB.getAudio(s.customBlobId);
                    if (blob) s.src = URL.createObjectURL(blob);
                } catch (err) {
                    console.error('Blob restore error:', err);
                }
            }
        }

        totalSoundsCount.textContent = sounds.length;
        saveSoundboards();
        updateActiveSoundboardHeader();
        updateBreadcrumb();
        renderCategories();
        renderSounds();
        renderGeneralSfxTray();
        switchMainView('stage');
    }

    function updateBreadcrumb() {
        if (!breadcrumbFolderName || !breadcrumbFolderCount) return;
        const sb = getActiveSoundboard();
        breadcrumbFolderName.textContent = sb.name;

        if (breadcrumbFolderIcon) {
            breadcrumbFolderIcon.textContent = sb.icon || '🎭';
        }

        const categories = getCategories();
        let subtitle = `${sounds.length} sound${sounds.length === 1 ? '' : 's'} • ${categories.length} categories`;
        if (activeCategory !== 'All') {
            subtitle += ` • Category: ${activeCategory}`;
        }
        breadcrumbFolderCount.textContent = subtitle;
    }

    function renderFolders() {
        if (!foldersGrid) return;

        if (!soundboards || soundboards.length === 0) {
            foldersGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon">📁</div>
                    <h3>No Soundboard Folders Yet</h3>
                    <p>Click "+ New Soundboard Folder" above to create a soundboard for your project.</p>
                </div>
            `;
            return;
        }

        foldersGrid.innerHTML = soundboards.map(sb => {
            const soundCount = (sb.sounds || []).length;
            const playingCount = (sb.sounds || []).filter(s => activeAudios.has(s.id)).length;
            
            // Extract distinct categories in this soundboard
            const catSet = new Set();
            (sb.sounds || []).forEach(s => { if (s.category) catSet.add(s.category.trim()); });
            (sb.customCategories || []).forEach(c => { if (c) catSet.add(c.trim()); });
            const categories = Array.from(catSet);

            // Preview up to 4 categories
            const previewPills = categories.slice(0, 4).map(c => 
                `<span class="folder-sound-pill" title="${escapeHtml(c)}">${escapeHtml(c)}</span>`
            ).join('');
            const moreCount = categories.length > 4 ? `<span class="folder-sound-pill">+${categories.length - 4} more</span>` : '';

            const color = sb.color || '#3b82f6';
            const icon = sb.icon || '📁';

            return `
                <div class="folder-card" style="--folder-color: ${color};" onclick="window.openSoundboard('${sb.id}')">
                    <div class="folder-top">
                        <div class="folder-icon-wrap">${icon}</div>
                        <div style="display:flex; gap:6px; align-items:center;">
                            ${playingCount > 0 ? `<span class="folder-count-badge" style="background:rgba(59,130,246,0.2); border-color:#3b82f6; color:#3b82f6;">▶ ${playingCount} playing</span>` : ''}
                            <span class="folder-count-badge">${soundCount} sounds</span>
                        </div>
                    </div>
                    <div class="folder-title" title="${escapeHtml(sb.name)}">${escapeHtml(sb.name)}</div>
                    <div class="folder-desc">${escapeHtml(sb.description || 'Soundboard collection')}</div>
                    <div class="folder-preview-sounds">
                        ${previewPills || '<span style="font-size:10px; color:var(--text-muted);">No categories yet</span>'}
                        ${moreCount}
                    </div>
                    <div class="folder-bottom-actions" onclick="event.stopPropagation()">
                        <button class="folder-open-btn" onclick="window.openSoundboard('${sb.id}')">
                            Open Soundboard →
                        </button>
                        <div class="folder-tools">
                            <button class="icon-btn-bordered" style="width:28px; height:28px; padding:0;" onclick="window.openRenameSoundboard('${sb.id}')" title="Rename Soundboard">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            ${soundboards.length > 1 ? `
                                <button class="icon-btn-bordered" style="width:28px; height:28px; padding:0; color:#ef4444;" onclick="window.openDeleteSoundboard('${sb.id}')" title="Delete Soundboard">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function openCreateSoundboardModal() {
        folderModalTitle.textContent = 'Create New Soundboard Folder';
        folderOriginalId.value = '';
        folderNameInput.value = '';
        folderDescInput.value = '';
        const defaultIcon = document.querySelector('input[name="folderIcon"][value="📁"]');
        if (defaultIcon) defaultIcon.checked = true;
        const defaultColor = document.querySelector('input[name="folderColor"][value="#3b82f6"]');
        if (defaultColor) defaultColor.checked = true;
        folderModal.classList.remove('hidden');
        folderNameInput.focus();
    }

    function openRenameSoundboardModal(sbId) {
        const sb = soundboards.find(s => s.id === sbId);
        if (!sb) return;
        folderModalTitle.textContent = 'Rename Soundboard Folder';
        folderOriginalId.value = sb.id;
        folderNameInput.value = sb.name;
        folderDescInput.value = sb.description || '';
        const iconRadio = document.querySelector(`input[name="folderIcon"][value="${sb.icon}"]`);
        if (iconRadio) iconRadio.checked = true;
        const colorRadio = document.querySelector(`input[name="folderColor"][value="${sb.color}"]`);
        if (colorRadio) colorRadio.checked = true;
        folderModal.classList.remove('hidden');
        folderNameInput.focus();
    }

    function openDeleteSoundboardModal(sbId) {
        if (soundboards.length <= 1) {
            alert('You must have at least one soundboard folder.');
            return;
        }
        const sb = soundboards.find(s => s.id === sbId);
        if (!sb) return;
        targetSoundboardToDelete = sb.id;
        deleteFolderNameText.textContent = `"${sb.name}"`;
        deleteFolderModal.classList.remove('hidden');
    }

    function handleFolderFormSubmit(e) {
        e.preventDefault();
        const origId = folderOriginalId.value;
        const name = folderNameInput.value.trim();
        const desc = folderDescInput.value.trim();
        if (!name) return;

        const checkedIcon = document.querySelector('input[name="folderIcon"]:checked');
        const icon = checkedIcon ? checkedIcon.value : '📁';
        const checkedColor = document.querySelector('input[name="folderColor"]:checked');
        const color = checkedColor ? checkedColor.value : '#3b82f6';

        if (origId) {
            // Renaming existing soundboard
            const sb = soundboards.find(s => s.id === origId);
            if (sb) {
                sb.name = name;
                sb.description = desc;
                sb.icon = icon;
                sb.color = color;
                saveSoundboards();
                updateActiveSoundboardHeader();
                updateBreadcrumb();
                showToast(`Soundboard "${name}" updated!`, 'success');
            }
        } else {
            // Creating new soundboard
            const newId = 'sb_' + Date.now();
            const newSb = {
                id: newId,
                name: name,
                description: desc || 'Custom soundboard collection',
                icon: icon,
                color: color,
                sounds: [],
                customCategories: ['General SFX']
            };
            soundboards.push(newSb);
            saveSoundboards();
            showToast(`Soundboard folder "${name}" created!`, 'success');
            setActiveSoundboard(newId);
        }

        folderModal.classList.add('hidden');
        renderFolders();
    }

    function confirmDeleteSoundboard() {
        if (!targetSoundboardToDelete) return;
        const sbId = targetSoundboardToDelete;
        const sb = soundboards.find(s => s.id === sbId);
        if (!sb) return;

        // Stop any audios that belong to this soundboard
        (sb.sounds || []).forEach(s => stopSound(s.id));

        soundboards = soundboards.filter(s => s.id !== sbId);
        if (activeSoundboardId === sbId) {
            activeSoundboardId = soundboards[0].id;
            const newActive = getActiveSoundboard();
            sounds = newActive.sounds;
            activeCategory = 'All';
        }

        saveSoundboards();
        deleteFolderModal.classList.add('hidden');
        targetSoundboardToDelete = null;

        showToast(`Soundboard folder "${sb.name}" deleted.`, 'info');
        renderFolders();
        updateActiveSoundboardHeader();
        updateBreadcrumb();
        renderCategories();
        renderSounds();
        renderGeneralSfxTray();
    }

    function handleCategoryFormSubmit(e) {
        e.preventDefault();
        const catName = categoryNameInput.value.trim();
        if (!catName) return;

        const sb = getActiveSoundboard();
        if (!sb.customCategories) sb.customCategories = [];
        if (!sb.customCategories.includes(catName)) {
            sb.customCategories.push(catName);
            saveSoundboards();
        }

        activeCategory = catName;
        categoryModal.classList.add('hidden');
        renderCategories();
        renderSounds();
        renderGeneralSfxTray();
        updateBreadcrumb();
        showToast(`Category "${catName}" added!`, 'success');
    }

    // ================= PINNED CATEGORY TRAY =================
    function getPinnedCategory() {
        const sb = getActiveSoundboard();
        const categories = getCategories();
        if (sb.pinnedCategory && categories.includes(sb.pinnedCategory)) {
            return sb.pinnedCategory;
        }
        // Fallback: look for category containing "general" or use first available
        const gen = categories.find(c => c.toLowerCase().includes('general'));
        const fallback = gen || categories[0] || 'General SFX';
        sb.pinnedCategory = fallback;
        return fallback;
    }

    function pinCategory(catName) {
        if (!catName || catName === 'All' || catName === 'Favorites') return;
        const sb = getActiveSoundboard();
        sb.pinnedCategory = catName;
        saveSoundboards();
        renderGeneralSfxTray();
        renderCategories();
        showToast(`📌 Pinned category "${catName}" to bottom window!`, 'success');
    }

    function renderGeneralSfxTray() {
        if (!generalSfxList) return;
        const pinnedCat = getPinnedCategory();
        const categories = getCategories();

        if (pinnedCatNameBadge) {
            pinnedCatNameBadge.textContent = pinnedCat;
        }

        if (pinnedCategoryDropdown) {
            pinnedCategoryDropdown.innerHTML = categories.map(c => 
                `<option value="${escapeHtml(c)}" ${c === pinnedCat ? 'selected' : ''}>${escapeHtml(c)}</option>`
            ).join('');
        }

        const pinnedSounds = sounds.filter(s => s.category === pinnedCat);

        if (generalSfxCountBadge) {
            generalSfxCountBadge.textContent = `${pinnedSounds.length} sound${pinnedSounds.length === 1 ? '' : 's'}`;
        }

        if (pinnedSounds.length === 0) {
            generalSfxList.innerHTML = `
                <div class="sfx-tray-empty">
                    <span>No sounds in <strong>"${escapeHtml(pinnedCat)}"</strong>.</span>
                    <button class="pill-btn small" onclick="window.openAddModalForCategory('${escapeHtml(pinnedCat)}')">+ Add Sound to ${escapeHtml(pinnedCat)}</button>
                </div>
            `;
            return;
        }

        generalSfxList.innerHTML = pinnedSounds.map(sound => {
            const active = activeAudios.get(sound.id);
            const isPlaying = active ? !active.audio.paused : false;
            const keyLabel = sound.keybind ? sound.keybind.toUpperCase() : '';

            return `
                <button class="quick-sfx-btn ${isPlaying ? 'is-playing' : ''}" data-id="${sound.id}" title="${escapeHtml(sound.title)}">
                    <div class="quick-sfx-progress"></div>
                    <div class="quick-sfx-icon">
                        ${isPlaying ? 
                            '<svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect></svg>' : 
                            '<svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>'
                        }
                    </div>
                    <span class="quick-sfx-name">${escapeHtml(sound.title)}</span>
                    ${keyLabel ? `<span class="keycap-badge" style="font-size:10px; padding:1px 6px;">${escapeHtml(keyLabel)}</span>` : ''}
                </button>
            `;
        }).join('');
    }

    function toggleSfxTray() {
        isSfxTrayCollapsed = !isSfxTrayCollapsed;
        generalSfxTray.classList.toggle('collapsed', isSfxTrayCollapsed);
        document.body.classList.toggle('sfx-tray-collapsed', isSfxTrayCollapsed);
        if (isSfxTrayCollapsed) {
            sfxTrayToggleIcon.textContent = '▲';
            sfxTrayToggleText.textContent = 'Expand';
        } else {
            sfxTrayToggleIcon.textContent = '▼';
            sfxTrayToggleText.textContent = 'Collapse';
        }
    }

    // ================= CATEGORY RENAME & DELETE =================
    function openRenameCategoryModal(catName) {
        if (!renameCategoryModal) return;
        renameCategoryOldName.value = catName;
        renameCategoryNewName.value = catName;
        renameCategoryModal.classList.remove('hidden');
        renameCategoryNewName.focus();
        renameCategoryNewName.select();
    }

    function handleRenameCategorySubmit(e) {
        e.preventDefault();
        const oldCat = renameCategoryOldName.value;
        const newCat = renameCategoryNewName.value.trim();
        if (!newCat || newCat === oldCat) {
            renameCategoryModal.classList.add('hidden');
            return;
        }

        const sb = getActiveSoundboard();
        let updatedCount = 0;
        sounds.forEach(s => {
            if (s.category === oldCat) {
                s.category = newCat;
                updatedCount++;
            }
        });

        if (sb.customCategories && Array.isArray(sb.customCategories)) {
            const idx = sb.customCategories.indexOf(oldCat);
            if (idx !== -1) {
                sb.customCategories[idx] = newCat;
            } else if (!sb.customCategories.includes(newCat)) {
                sb.customCategories.push(newCat);
            }
        }

        if (sb.pinnedCategory === oldCat) {
            sb.pinnedCategory = newCat;
        }

        if (activeCategory === oldCat) {
            activeCategory = newCat;
        }

        saveSoundboards();
        renameCategoryModal.classList.add('hidden');
        renderCategories();
        renderSounds();
        renderGeneralSfxTray();
        updateBreadcrumb();
        showToast(`Category renamed to "${newCat}" (${updatedCount} sound${updatedCount === 1 ? '' : 's'} updated)`, 'success');
    }

    function openDeleteCategoryModal(catName) {
        if (!deleteCategoryModal) return;
        const catSounds = sounds.filter(s => s.category === catName);
        deleteCategoryTargetName.value = catName;
        deleteCategoryTargetText.textContent = `"${catName}"`;

        const noticeBox = document.getElementById('deleteCategorySoundsNotice');
        if (catSounds.length === 0) {
            deleteCategorySoundCountText.textContent = `This category currently has 0 sounds.`;
            if (noticeBox) noticeBox.style.display = 'none';
        } else {
            deleteCategorySoundCountText.textContent = `This category contains ${catSounds.length} sound${catSounds.length === 1 ? '' : 's'}.`;
            if (noticeBox) noticeBox.style.display = 'block';

            const otherCategories = getCategories().filter(c => c !== catName);
            if (otherCategories.length === 0) {
                otherCategories.push('General SFX');
            }
            deleteCategoryMoveTarget.innerHTML = otherCategories.map(c => 
                `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
            ).join('');
        }

        deleteCategoryModal.classList.remove('hidden');
    }

    async function handleDeleteCategorySubmit(e) {
        e.preventDefault();
        const catToDelete = deleteCategoryTargetName.value;
        const catSounds = sounds.filter(s => s.category === catToDelete);
        const sb = getActiveSoundboard();

        const actionRadio = document.querySelector('input[name="deleteCategoryAction"]:checked');
        const action = actionRadio ? actionRadio.value : 'move';

        if (catSounds.length > 0) {
            if (action === 'move') {
                const targetCat = deleteCategoryMoveTarget.value || 'General SFX';
                sounds.forEach(s => {
                    if (s.category === catToDelete) {
                        s.category = targetCat;
                    }
                });
                showToast(`Moved ${catSounds.length} sound${catSounds.length === 1 ? '' : 's'} to "${targetCat}"`, 'info');
            } else {
                for (const s of catSounds) {
                    stopSound(s.id);
                    if (s.customBlobId && window.SoundDB) {
                        await window.SoundDB.deleteAudio(s.customBlobId);
                    }
                }
                sounds = sounds.filter(s => s.category !== catToDelete);
                showToast(`Deleted ${catSounds.length} sounds`, 'info');
            }
        }

        if (sb.customCategories) {
            sb.customCategories = sb.customCategories.filter(c => c !== catToDelete);
        }

        if (sb.pinnedCategory === catToDelete) {
            const remaining = getCategories();
            sb.pinnedCategory = remaining.find(c => c.toLowerCase().includes('general')) || remaining[0] || 'General SFX';
        }

        if (activeCategory === catToDelete) {
            activeCategory = 'All';
        }

        saveSounds();
        deleteCategoryModal.classList.add('hidden');
        renderCategories();
        renderSounds();
        renderGeneralSfxTray();
        updateBreadcrumb();
        showToast(`Category "${catToDelete}" deleted.`, 'success');
    }

    // Expose helpers globally for inline onclicks
    window.openSoundboard = (sbId) => setActiveSoundboard(sbId);
    window.openRenameSoundboard = (sbId) => openRenameSoundboardModal(sbId);
    window.openDeleteSoundboard = (sbId) => openDeleteSoundboardModal(sbId);
    window.openAddModalForCategory = (cat) => {
        openAddModal();
        if (newSoundCategory) {
            populateCategorySelects(cat, null);
        }
    };

    // ================= RENDERING =================
    function getCategories() {
        const sb = getActiveSoundboard();
        const set = new Set();
        sounds.forEach(s => {
            if (s.category) set.add(s.category.trim());
        });
        (sb.customCategories || []).forEach(c => {
            if (c) set.add(c.trim());
        });
        return Array.from(set).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
            if (numA && numB) return numA - numB;
            if (a.toLowerCase().includes('general')) return -1;
            if (b.toLowerCase().includes('general')) return 1;
            return a.localeCompare(b);
        });
    }

    function populateCategorySelects(selectedForNew = null, selectedForEdit = null) {
        const categories = getCategories();

        const buildOptions = (selectedVal) => {
            let found = false;
            let html = categories.map(c => {
                const isSel = (c === selectedVal);
                if (isSel) found = true;
                return `<option value="${escapeHtml(c)}" ${isSel ? 'selected' : ''}>${escapeHtml(c)}</option>`;
            }).join('');

            if (selectedVal && !found && selectedVal !== '__create_new__') {
                html = `<option value="${escapeHtml(selectedVal)}" selected>${escapeHtml(selectedVal)}</option>` + html;
            }

            html += `<option value="__create_new__" ${selectedVal === '__create_new__' ? 'selected' : ''}>+ Create New Category...</option>`;
            return html;
        };

        if (newSoundCategory) {
            const curVal = selectedForNew !== null ? selectedForNew : newSoundCategory.value;
            newSoundCategory.innerHTML = buildOptions(curVal);
            if (newCategoryCustomGroup) {
                newCategoryCustomGroup.classList.toggle('hidden', newSoundCategory.value !== '__create_new__');
            }
        }

        if (editSoundCategory) {
            const curVal = selectedForEdit !== null ? selectedForEdit : editSoundCategory.value;
            editSoundCategory.innerHTML = buildOptions(curVal);
            if (editCategoryCustomGroup) {
                editCategoryCustomGroup.classList.toggle('hidden', editSoundCategory.value !== '__create_new__');
            }
        }

        if (pinnedCategoryDropdown) {
            const pinnedCat = getPinnedCategory();
            pinnedCategoryDropdown.innerHTML = categories.map(c => 
                `<option value="${escapeHtml(c)}" ${c === pinnedCat ? 'selected' : ''}>${escapeHtml(c)}</option>`
            ).join('');
        }
    }

    function renderCategories() {
        const categories = getCategories();
        populateCategorySelects();

        const sb = getActiveSoundboard();
        const pinnedCat = getPinnedCategory();
        const totalFavs = sounds.filter(s => s.favorite).length;

        let chipsHtml = `
            <div role="button" tabindex="0" class="category-chip ${activeCategory === 'All' ? 'active' : ''}" data-cat="All">
                <span>All Sounds</span>
                <span class="chip-count">${sounds.length}</span>
            </div>
            <div role="button" tabindex="0" class="category-chip ${activeCategory === 'Favorites' ? 'active' : ''}" data-cat="Favorites">
                <span>⭐ Favorites</span>
                <span class="chip-count">${totalFavs}</span>
            </div>
        `;

        categories.forEach(cat => {
            const count = sounds.filter(s => s.category === cat).length;
            const isActive = activeCategory === cat;
            const isPinned = pinnedCat === cat;

            chipsHtml += `
                <div role="button" tabindex="0" class="category-chip ${isActive ? 'active' : ''} ${isPinned ? 'is-pinned-cat' : ''}" 
                     data-cat="${escapeHtml(cat)}" 
                     draggable="true" 
                     title="Click to view. Drag to bottom tray to pin.">
                    <span class="chip-drag-handle" title="Drag to bottom tray to pin">⋮⋮</span>
                    ${isPinned ? '<span class="pinned-indicator" title="Pinned to bottom window">📌</span>' : ''}
                    <span class="chip-name">${escapeHtml(cat)}</span>
                    <span class="chip-count">${count}</span>
                    <div class="chip-actions">
                        <span class="chip-btn chip-pin-btn" data-action="pin" title="Pin &quot;${escapeHtml(cat)}&quot; to bottom window">📌</span>
                        <span class="chip-btn chip-edit-btn" data-action="edit" title="Rename category">✏️</span>
                        <span class="chip-btn chip-delete-btn" data-action="delete" title="Delete category">🗑️</span>
                    </div>
                </div>
            `;
        });

        categoryChipsContainer.innerHTML = chipsHtml;

        // Category click & action handlers
        categoryChipsContainer.querySelectorAll('.category-chip').forEach(chip => {
            const cat = chip.getAttribute('data-cat');

            chip.onclick = (e) => {
                const actionBtn = e.target.closest('.chip-btn');
                if (actionBtn) {
                    e.stopPropagation();
                    const action = actionBtn.getAttribute('data-action');
                    if (action === 'pin') {
                        pinCategory(cat);
                    } else if (action === 'edit') {
                        openRenameCategoryModal(cat);
                    } else if (action === 'delete') {
                        openDeleteCategoryModal(cat);
                    }
                    return;
                }

                activeCategory = cat;
                renderCategories();
                renderSounds();
                updateBreadcrumb();
            };

            // Drag support for category tabs
            if (cat !== 'All' && cat !== 'Favorites') {
                chip.ondragstart = (e) => {
                    e.dataTransfer.setData('text/plain', cat);
                    e.dataTransfer.setData('application/x-soundboard-category', cat);
                    e.dataTransfer.effectAllowed = 'copyMove';
                    chip.classList.add('is-dragging-chip');
                    if (generalSfxTray) generalSfxTray.classList.add('ready-to-drop');
                };

                chip.ondragend = () => {
                    chip.classList.remove('is-dragging-chip');
                    if (generalSfxTray) generalSfxTray.classList.remove('ready-to-drop', 'drag-over-tray');
                };
            }
        });

        setTimeout(updateCategoryNavArrows, 50);
    }

    function filterSounds() {
        return sounds.filter(s => {
            const matchesCat = 
                activeCategory === 'All' ? true :
                activeCategory === 'Favorites' ? s.favorite :
                s.category === activeCategory;

            if (!matchesCat) return false;

            if (!searchQuery) return true;

            const q = searchQuery.toLowerCase();
            return (
                (s.title && s.title.toLowerCase().includes(q)) ||
                (s.category && s.category.toLowerCase().includes(q)) ||
                (s.originalName && s.originalName.toLowerCase().includes(q)) ||
                (s.keybind && s.keybind.toLowerCase() === q)
            );
        });
    }

    function renderSounds() {
        const filtered = filterSounds();
        updateBreadcrumb();

        if (filtered.length === 0) {
            soundboardGrid.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        soundboardGrid.innerHTML = filtered.map(sound => {
            const active = activeAudios.get(sound.id);
            const isPlaying = active ? !active.audio.paused : false;
            const keyLabel = sound.keybind ? sound.keybind.toUpperCase() : '+ Set';
            const hasKey = !!sound.keybind;
            const color = sound.color || '#3b82f6';

            return `
                <div class="sound-card ${isPlaying ? 'is-playing' : ''}" 
                     data-id="${sound.id}" 
                     style="--card-color: ${color};">
                    <div class="card-progress-bar"></div>

                    <!-- Top -->
                    <div class="card-top">
                        <div class="card-badges">
                            <span class="category-badge">${escapeHtml(sound.category || 'Sound')}</span>
                            ${sound.isBgm ? '<span class="type-badge bgm">BGM</span>' : '<span class="type-badge">SFX</span>'}
                            ${sound.loop ? '<span class="type-badge" title="Loop Enabled">🔁</span>' : ''}
                        </div>
                        <button class="keycap-badge ${hasKey ? '' : 'unset'}" 
                                data-action="setKeybind" 
                                data-id="${sound.id}" 
                                title="Click to change shortcut keybind">
                            ${escapeHtml(keyLabel)}
                        </button>
                    </div>

                    <!-- Body / Trigger Area -->
                    <div class="card-body" data-action="cardBodyClick" data-id="${sound.id}">
                        <h4 class="sound-title" title="${escapeHtml(sound.title)}">${escapeHtml(sound.title)}</h4>
                        <div class="sound-meta">
                            <div class="sound-eq">
                                <span></span><span></span><span></span><span></span>
                            </div>
                            <span class="time-display">0:00</span>
                        </div>
                    </div>

                    <!-- Bottom -->
                    <div class="card-bottom">
                        <div class="card-play-trigger" data-action="togglePlayPause" data-id="${sound.id}">
                            <div class="play-btn-circle">
                                ${isPlaying ? 
                                    '<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect></svg>' : 
                                    '<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>'
                                }
                            </div>
                            <span>${isPlaying ? 'Pause' : 'Play'}</span>
                        </div>

                        <div class="card-actions">
                            <button class="card-btn ${sound.loop ? 'active' : ''}" 
                                    data-action="toggleLoop" 
                                    data-id="${sound.id}" 
                                    title="Toggle Loop">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="17 1 21 5 17 9"></polyline>
                                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                                    <polyline points="7 23 3 19 7 15"></polyline>
                                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                                </svg>
                            </button>
                            <button class="card-btn ${sound.favorite ? 'favorited' : ''}" 
                                    data-action="toggleFav" 
                                    data-id="${sound.id}" 
                                    title="Favorite">
                                <svg viewBox="0 0 24 24" fill="${sound.favorite ? '#eab308' : 'none'}" stroke="currentColor" stroke-width="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </button>
                            <button class="card-btn" 
                                    data-action="editSound" 
                                    data-id="${sound.id}" 
                                    title="Edit Sound">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function updateCategoryNavArrows() {
        if (!categoryChipsContainer || !catScrollLeftBtn || !catScrollRightBtn) return;
        const sl = categoryChipsContainer.scrollLeft;
        const sw = categoryChipsContainer.scrollWidth;
        const cw = categoryChipsContainer.clientWidth;

        catScrollLeftBtn.disabled = sl <= 2;
        catScrollRightBtn.disabled = sl + cw >= sw - 2;
    }

    // ================= EVENT DELEGATION & LISTENERS =================
    function setupEventListeners() {
        // Category Arrow Buttons
        if (catScrollLeftBtn && categoryChipsContainer) {
            catScrollLeftBtn.addEventListener('click', () => {
                categoryChipsContainer.scrollBy({ left: -260, behavior: 'smooth' });
            });
        }
        if (catScrollRightBtn && categoryChipsContainer) {
            catScrollRightBtn.addEventListener('click', () => {
                categoryChipsContainer.scrollBy({ left: 260, behavior: 'smooth' });
            });
        }

        if (categoryChipsContainer) {
            categoryChipsContainer.addEventListener('scroll', updateCategoryNavArrows);
            window.addEventListener('resize', updateCategoryNavArrows);

            // Mouse Wheel Horizontal Scroll over Category Bar
            categoryChipsContainer.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    categoryChipsContainer.scrollLeft += e.deltaY;
                }
            }, { passive: false });

            // Mouse Click & Drag-to-Scroll on Category Bar
            let isCatDragging = false;
            let dragStartX = 0;
            let dragScrollLeft = 0;
            let hasMoved = false;

            categoryChipsContainer.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                isCatDragging = true;
                hasMoved = false;
                dragStartX = e.pageX - categoryChipsContainer.offsetLeft;
                dragScrollLeft = categoryChipsContainer.scrollLeft;
            });

            window.addEventListener('mousemove', (e) => {
                if (!isCatDragging) return;
                const x = e.pageX - categoryChipsContainer.offsetLeft;
                const walk = (x - dragStartX);
                if (Math.abs(walk) > 4) {
                    hasMoved = true;
                }
                categoryChipsContainer.scrollLeft = dragScrollLeft - (walk * 1.4);
            });

            window.addEventListener('mouseup', () => {
                isCatDragging = false;
            });
        }

        // Grid delegation
        soundboardGrid.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) {
                // If user clicked card background
                const card = e.target.closest('.sound-card');
                if (card) {
                    const soundId = card.getAttribute('data-id');
                    if (settings.retriggerMode === 'toggle') {
                        togglePlayPause(soundId);
                    } else {
                        playSound(soundId);
                    }
                }
                return;
            }

            const action = target.getAttribute('data-action');
            const soundId = target.getAttribute('data-id');
            const sound = sounds.find(s => s.id === soundId);
            if (!sound) return;

            e.stopPropagation();

            if (action === 'togglePlayPause' || action === 'triggerSound') {
                togglePlayPause(soundId);
            } else if (action === 'cardBodyClick') {
                if (settings.retriggerMode === 'toggle') {
                    togglePlayPause(soundId);
                } else {
                    playSound(soundId);
                }
            } else if (action === 'setKeybind') {
                startKeybindCapture(soundId);
            } else if (action === 'toggleLoop') {
                sound.loop = !sound.loop;
                const audio = audioPool.get(soundId);
                if (audio) audio.loop = sound.loop;
                saveSounds();
                renderSounds();
            } else if (action === 'toggleFav') {
                sound.favorite = !sound.favorite;
                saveSounds();
                renderCategories();
                renderSounds();
            } else if (action === 'editSound') {
                openEditModal(sound);
            }
        });

        // Search Input
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            clearSearchBtn.classList.toggle('hidden', !searchQuery);
            renderSounds();
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            clearSearchBtn.classList.add('hidden');
            renderSounds();
            searchInput.focus();
        });

        // Panic Stop
        panicStopBtn.addEventListener('click', () => {
            stopAllSounds();
        });

        // Master Volume
        masterVolumeSlider.addEventListener('input', (e) => {
            settings.masterVolume = parseInt(e.target.value, 10) / 100;
            settings.isMuted = settings.masterVolume === 0;
            masterVolumeValue.textContent = `${Math.round(settings.masterVolume * 100)}%`;
            updateAllVolumes();
            saveSettings();
            updateMasterVolumeIcon();
        });

        masterMuteBtn.addEventListener('click', () => {
            settings.isMuted = !settings.isMuted;
            updateAllVolumes();
            saveSettings();
            updateMasterVolumeIcon();
        });

        // Mode Toggles
        playbackModeBtn.addEventListener('click', () => {
            settings.overlapMode = !settings.overlapMode;
            updateSettingsUI();
            saveSettings();
        });

        retriggerModeBtn.addEventListener('click', () => {
            settings.retriggerMode = settings.retriggerMode === 'restart' ? 'toggle' : 'restart';
            updateSettingsUI();
            saveSettings();
        });

        // Grid Density
        viewGridDensityBtn.addEventListener('click', () => {
            isCompact = !isCompact;
            soundboardGrid.classList.toggle('compact', isCompact);
            densityText.textContent = isCompact ? 'Compact' : 'Normal';
            settings.gridDensity = isCompact ? 'compact' : 'normal';
            saveSettings();
        });

        // Multi-Track Now Playing Dock Controls
        if (dockStopAllBtn) {
            dockStopAllBtn.addEventListener('click', stopAllSounds);
        }

        if (nowPlayingTracksList) {
            // Scrub slider & Volume slider delegation
            nowPlayingTracksList.addEventListener('input', (e) => {
                if (e.target.classList.contains('dock-track-progress')) {
                    const row = e.target.closest('.dock-track-row');
                    const soundId = row ? row.dataset.id : null;
                    if (soundId && activeAudios.has(soundId)) {
                        const active = activeAudios.get(soundId);
                        const percent = parseFloat(e.target.value);
                        if (active.audio.duration) {
                            active.audio.currentTime = (percent / 100) * active.audio.duration;
                        }
                    }
                } else if (e.target.classList.contains('dock-track-vol-slider')) {
                    const row = e.target.closest('.dock-track-row');
                    const soundId = row ? row.dataset.id : null;
                    if (soundId && activeAudios.has(soundId)) {
                        const active = activeAudios.get(soundId);
                        const vol = parseInt(e.target.value, 10) / 100;
                        active.sound.volume = vol;
                        active.audio.volume = calculateVolume(vol);
                        saveSounds();
                    }
                }
            });

            // Action buttons delegation (Loop, Pause/Resume, Stop)
            nowPlayingTracksList.addEventListener('click', (e) => {
                const loopBtn = e.target.closest('.dock-track-loop-btn');
                if (loopBtn) {
                    const soundId = loopBtn.dataset.id;
                    if (soundId && activeAudios.has(soundId)) {
                        const active = activeAudios.get(soundId);
                        active.audio.loop = !active.audio.loop;
                        active.sound.loop = active.audio.loop;
                        loopBtn.classList.toggle('active', active.audio.loop);
                        saveSounds();
                        renderSounds();
                    }
                    return;
                }

                const pauseBtn = e.target.closest('.dock-track-pause-btn');
                if (pauseBtn) {
                    const soundId = pauseBtn.dataset.id;
                    if (soundId && activeAudios.has(soundId)) {
                        const active = activeAudios.get(soundId);
                        if (active.audio.paused) {
                            active.audio.play();
                            updateCardPlayState(soundId, true);
                        } else {
                            active.audio.pause();
                            updateCardPlayState(soundId, false);
                        }
                        updateNowPlayingDock();
                    }
                    return;
                }

                const stopBtn = e.target.closest('.dock-track-stop-btn');
                if (stopBtn) {
                    const soundId = stopBtn.dataset.id;
                    if (soundId) {
                        stopSound(soundId);
                    }
                    return;
                }
            });
        }

        // Nav View Switcher (Home Folders vs Soundboard Stage)
        if (navHomeFoldersBtn) navHomeFoldersBtn.addEventListener('click', () => switchMainView('home'));
        if (navSoundboardBtn) navSoundboardBtn.addEventListener('click', () => switchMainView('stage'));
        if (backToFoldersBtn) backToFoldersBtn.addEventListener('click', () => switchMainView('home'));

        // Folder / Soundboard CRUD triggers
        if (createFolderBtn) createFolderBtn.addEventListener('click', openCreateSoundboardModal);
        if (closeFolderModalBtn) closeFolderModalBtn.addEventListener('click', () => folderModal.classList.add('hidden'));
        if (cancelFolderBtn) cancelFolderBtn.addEventListener('click', () => folderModal.classList.add('hidden'));
        if (folderForm) folderForm.addEventListener('submit', handleFolderFormSubmit);

        if (closeDeleteFolderModalBtn) closeDeleteFolderModalBtn.addEventListener('click', () => deleteFolderModal.classList.add('hidden'));
        if (cancelDeleteFolderBtn) cancelDeleteFolderBtn.addEventListener('click', () => deleteFolderModal.classList.add('hidden'));
        if (confirmDeleteFolderBtn) confirmDeleteFolderBtn.addEventListener('click', confirmDeleteSoundboard);

        // Category Modal triggers (Inside Soundboard Stage)
        if (addCategoryBtn) addCategoryBtn.addEventListener('click', () => {
            categoryNameInput.value = '';
            categoryModal.classList.remove('hidden');
            categoryNameInput.focus();
        });
        if (closeCategoryModalBtn) closeCategoryModalBtn.addEventListener('click', () => categoryModal.classList.add('hidden'));
        if (cancelCategoryBtn) cancelCategoryBtn.addEventListener('click', () => categoryModal.classList.add('hidden'));
        if (categoryForm) categoryForm.addEventListener('submit', handleCategoryFormSubmit);

        // General SFX / Pinned Tray interactions
        if (toggleSfxTrayBtn) toggleSfxTrayBtn.addEventListener('click', toggleSfxTray);
        const sfxTrayHeader = document.querySelector('.sfx-tray-header');
        if (sfxTrayHeader) {
            sfxTrayHeader.addEventListener('click', (e) => {
                if (e.target.closest('#toggleSfxTrayBtn') || e.target.closest('#pinnedCategoryDropdown')) return;
                toggleSfxTray();
            });
        }
        if (pinnedCategoryDropdown) {
            pinnedCategoryDropdown.addEventListener('change', (e) => {
                pinCategory(e.target.value);
            });
        }
        if (generalSfxTray) {
            generalSfxTray.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                generalSfxTray.classList.add('drag-over-tray');
            });
            generalSfxTray.addEventListener('dragleave', (e) => {
                if (e.target === generalSfxTray || !generalSfxTray.contains(e.relatedTarget)) {
                    generalSfxTray.classList.remove('drag-over-tray');
                }
            });
            generalSfxTray.addEventListener('drop', (e) => {
                e.preventDefault();
                generalSfxTray.classList.remove('drag-over-tray', 'ready-to-drop');
                const cat = e.dataTransfer.getData('application/x-soundboard-category') || e.dataTransfer.getData('text/plain');
                if (cat && cat !== 'All' && cat !== 'Favorites') {
                    pinCategory(cat);
                }
            });
        }
        if (generalSfxList) {
            generalSfxList.addEventListener('click', (e) => {
                const btn = e.target.closest('.quick-sfx-btn');
                if (btn) {
                    const soundId = btn.getAttribute('data-id');
                    togglePlayPause(soundId);
                }
            });
        }

        // Category Select Dropdown Changes in Modals
        if (newSoundCategory) {
            newSoundCategory.addEventListener('change', () => {
                if (newCategoryCustomGroup) {
                    newCategoryCustomGroup.classList.toggle('hidden', newSoundCategory.value !== '__create_new__');
                    if (newSoundCategory.value === '__create_new__' && newCategoryCustomInput) {
                        newCategoryCustomInput.focus();
                    }
                }
            });
        }
        if (editSoundCategory) {
            editSoundCategory.addEventListener('change', () => {
                if (editCategoryCustomGroup) {
                    editCategoryCustomGroup.classList.toggle('hidden', editSoundCategory.value !== '__create_new__');
                    if (editSoundCategory.value === '__create_new__' && editCategoryCustomInput) {
                        editCategoryCustomInput.focus();
                    }
                }
            });
        }

        // Rename Category Modal triggers
        if (renameCategoryForm) renameCategoryForm.addEventListener('submit', handleRenameCategorySubmit);
        if (closeRenameCategoryModalBtn) closeRenameCategoryModalBtn.addEventListener('click', () => renameCategoryModal.classList.add('hidden'));
        if (cancelRenameCategoryBtn) cancelRenameCategoryBtn.addEventListener('click', () => renameCategoryModal.classList.add('hidden'));

        // Delete Category Modal triggers
        if (deleteCategoryForm) deleteCategoryForm.addEventListener('submit', handleDeleteCategorySubmit);
        if (closeDeleteCategoryModalBtn) closeDeleteCategoryModalBtn.addEventListener('click', () => deleteCategoryModal.classList.add('hidden'));
        if (cancelDeleteCategoryBtn) cancelDeleteCategoryBtn.addEventListener('click', () => deleteCategoryModal.classList.add('hidden'));

        // Global Keyboard Event Listener
        window.addEventListener('keydown', handleGlobalKeydown);

        // Modal triggers
        openAddModalBtn.addEventListener('click', openAddModal);
        closeAddModalBtn.addEventListener('click', closeAddModal);
        cancelAddBtn.addEventListener('click', closeAddModal);

        closeEditModalBtn.addEventListener('click', closeEditModal);
        cancelEditBtn.addEventListener('click', closeEditModal);

        cancelCaptureBtn.addEventListener('click', stopKeybindCapture);

        keybindMapBtn.addEventListener('click', openKeybindMap);
        closeKeybindMapBtn.addEventListener('click', () => keybindMapModal.classList.add('hidden'));

        settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
        closeSettingsModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

        // Form Submissions
        addSoundForm.addEventListener('submit', handleAddSoundSubmit);
        editSoundForm.addEventListener('submit', handleEditSoundSubmit);
        deleteSoundBtn.addEventListener('click', handleDeleteSound);

        // Keybind record buttons in modals
        recordNewKeybindBtn.addEventListener('click', () => {
            startKeybindCapture('NEW_MODAL');
        });
        clearNewKeybindBtn.addEventListener('click', () => {
            newSoundKeybind.value = '';
        });

        recordEditKeybindBtn.addEventListener('click', () => {
            startKeybindCapture('EDIT_MODAL');
        });
        clearEditKeybindBtn.addEventListener('click', () => {
            editSoundKeybind.value = '';
        });

        // Volume & Speed sliders in edit modal
        editSoundVolume.addEventListener('input', (e) => {
            editVolumeDisplay.textContent = `${e.target.value}%`;
        });
        editSoundPlaybackRate.addEventListener('change', (e) => {
            editSpeedDisplay.textContent = `${e.target.value}x`;
        });

        // File drop zone in add modal
        modalFileDropZone.addEventListener('click', () => soundFileInput.click());
        soundFileInput.addEventListener('change', (e) => {
            handleSelectedFiles(Array.from(e.target.files));
        });

        // Window Drag & Drop (Global Audio Dropping)
        setupDragAndDrop();

        // Export / Import / Reset
        exportConfigBtn.addEventListener('click', handleExportConfig);
        importConfigBtn.addEventListener('click', () => importConfigFile.click());
        importConfigFile.addEventListener('change', handleImportConfig);
        resetDefaultsBtn.addEventListener('click', handleResetDefaults);

        // User Account Menu Dropdown toggle
        if (userAccountBtn && accountDropdownMenu) {
            userAccountBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                accountDropdownMenu.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (accountDropdownMenu && !accountDropdownMenu.contains(e.target) && !userAccountBtn.contains(e.target)) {
                    accountDropdownMenu.classList.add('hidden');
                }
            });
        }

        // Open Edit Profile Modal button
        if (openEditProfileBtn) {
            openEditProfileBtn.addEventListener('click', openEditProfileModal);
        }

        // Open Auth Modal button
        if (openAuthModalBtn) {
            openAuthModalBtn.addEventListener('click', () => {
                if (accountDropdownMenu) accountDropdownMenu.classList.add('hidden');
                if (authModal) authModal.classList.remove('hidden');
                initGoogleOAuth();
            });
        }

        // Sign Out button
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => {
                if (accountDropdownMenu) accountDropdownMenu.classList.add('hidden');
                handleSignOut();
            });
        }

        // Auth Modal Close & Tabs
        if (closeAuthModalBtn && authModal) {
            closeAuthModalBtn.addEventListener('click', () => authModal.classList.add('hidden'));
        }

        if (authTabSignIn && authTabSignUp && authSignInForm && authSignUpForm) {
            authTabSignIn.addEventListener('click', () => {
                authTabSignIn.classList.add('active');
                authTabSignUp.classList.remove('active');
                authSignInForm.classList.remove('hidden');
                authSignUpForm.classList.add('hidden');
            });

            authTabSignUp.addEventListener('click', () => {
                authTabSignUp.classList.add('active');
                authTabSignIn.classList.remove('active');
                authSignUpForm.classList.remove('hidden');
                authSignInForm.classList.add('hidden');
            });
        }

        // Auth Forms Submissions
        if (authSignInForm) {
            authSignInForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const inputVal = authSignInUsername.value.trim();
                const inputPwd = authSignInPassword ? authSignInPassword.value : '';
                if (!inputVal) return;

                const users = getUsers();
                const lower = inputVal.toLowerCase();
                let found = users.find(u => 
                    u.username.toLowerCase() === lower || 
                    (u.email && u.email.toLowerCase() === lower) ||
                    (u.id && u.id.toLowerCase() === lower)
                );

                if (!found && (lower === 'owner' || lower === 'aq4ius')) {
                    found = users.find(u => u.id === 'owner');
                } else if (!found && lower === 'grizal') {
                    found = users.find(u => u.id === 'grizal');
                }

                if (!found) {
                    showToast('Account not found. Please create an account or sign in with Google.', 'error');
                    return;
                }

                // Password verification
                if (found.password) {
                    let valid = (inputPwd === found.password);
                    if (!valid && found.id === 'owner' && (inputPwd === 'aq4ius' || inputPwd === 'aqsound')) valid = true;
                    if (!valid && found.id === 'grizal' && inputPwd === 'grizal') valid = true;
                    if (!valid) {
                        showToast('Incorrect password. Please try again or use "Forgot password?".', 'error');
                        return;
                    }
                }

                switchAccount(found.id);
            });
        }

        if (authSignUpForm) {
            authSignUpForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = authSignUpName.value.trim();
                const username = authSignUpUsername.value.trim();
                const password = authSignUpPassword ? authSignUpPassword.value : '';
                if (!username || !name) return;

                if (password && password.length < 4) {
                    showToast('Password must be at least 4 characters long.', 'warning');
                    return;
                }

                const users = getUsers();
                if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
                    showToast('That username is already taken. Please choose another.', 'warning');
                    return;
                }

                const newUser = {
                    id: 'user_' + Date.now(),
                    username: username,
                    displayName: name,
                    email: `${username.toLowerCase()}@aqsound.local`,
                    role: 'user',
                    password: password,
                    avatarLetter: name[0].toUpperCase(),
                    avatarBg: '#0ea5e9'
                };

                users.push(newUser);
                saveUsers(users);
                switchAccount(newUser.id);
                showToast(`Welcome, ${name}! Your private soundboard is ready.`, 'success');
            });
        }

        // Forgot Password Modal Triggers & Form
        if (openForgotPasswordBtn) {
            openForgotPasswordBtn.addEventListener('click', openForgotPasswordModal);
        }
        if (closeForgotPasswordModalBtn && forgotPasswordModal) {
            closeForgotPasswordModalBtn.addEventListener('click', () => forgotPasswordModal.classList.add('hidden'));
        }
        if (cancelForgotPasswordBtn && forgotPasswordModal) {
            cancelForgotPasswordBtn.addEventListener('click', () => {
                forgotPasswordModal.classList.add('hidden');
                if (authModal) authModal.classList.remove('hidden');
            });
        }
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', handleForgotPasswordSubmit);
        }

        // Edit Profile Modal Triggers & Form
        if (closeEditProfileModalBtn && editProfileModal) {
            closeEditProfileModalBtn.addEventListener('click', () => editProfileModal.classList.add('hidden'));
        }
        if (cancelEditProfileBtn && editProfileModal) {
            cancelEditProfileBtn.addEventListener('click', () => editProfileModal.classList.add('hidden'));
        }
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', handleEditProfileSubmit);
        }

        // Google Sign In Button
        if (authGoogleBtn) {
            authGoogleBtn.addEventListener('click', () => {
                if (window.google && window.google.accounts && window.google.accounts.id) {
                    window.google.accounts.id.prompt((notification) => {
                        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                            if (authModal) authModal.classList.add('hidden');
                            if (googleAuthModal) googleAuthModal.classList.remove('hidden');
                        }
                    });
                } else if (googleAuthModal) {
                    if (authModal) authModal.classList.add('hidden');
                    googleAuthModal.classList.remove('hidden');
                }
            });
        }
        if (closeGoogleAuthModalBtn && googleAuthModal) {
            closeGoogleAuthModalBtn.addEventListener('click', () => googleAuthModal.classList.add('hidden'));
        }

        if (googleAuthForm) {
            googleAuthForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = googleCustomEmail ? googleCustomEmail.value.trim() : '';
                const name = googleCustomName ? googleCustomName.value.trim() : '';
                if (!email) {
                    showToast('Please enter your Google email address.', 'warning');
                    return;
                }

                const users = getUsers();
                let user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
                if (!user) {
                    const fallbackName = name || email.split('@')[0];
                    user = {
                        id: 'google_' + Date.now(),
                        username: email.split('@')[0],
                        displayName: fallbackName,
                        email: email,
                        role: 'user',
                        password: '',
                        avatarLetter: fallbackName[0].toUpperCase(),
                        avatarBg: '#3b82f6'
                    };
                    users.push(user);
                    saveUsers(users);
                }
                switchAccount(user.id);
            });
        }

        // Close modal on backdrop click
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    backdrop.classList.add('hidden');
                    if (recordingTarget) stopKeybindCapture();
                }
            });
        });
    }

    function updateSettingsUI() {
        if (settings.overlapMode) {
            playbackModeBtn.classList.add('active');
            modeIcon.textContent = '🔀';
            modeText.textContent = 'Overlap';
        } else {
            playbackModeBtn.classList.remove('active');
            modeIcon.textContent = '⏹️';
            modeText.textContent = 'Solo';
        }

        if (settings.retriggerMode === 'restart') {
            retriggerModeBtn.classList.add('active');
            retriggerText.textContent = 'Restart';
        } else {
            retriggerModeBtn.classList.remove('active');
            retriggerText.textContent = 'Toggle';
        }

        if (settings.gridDensity === 'compact') {
            isCompact = true;
            soundboardGrid.classList.add('compact');
            densityText.textContent = 'Compact';
        } else {
            isCompact = false;
            soundboardGrid.classList.remove('compact');
            densityText.textContent = 'Normal';
        }

        masterVolumeSlider.value = Math.round(settings.masterVolume * 100);
        masterVolumeValue.textContent = `${Math.round(settings.masterVolume * 100)}%`;
        updateMasterVolumeIcon();
    }

    function updateMasterVolumeIcon() {
        if (settings.isMuted || settings.masterVolume === 0) {
            masterMuteBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#ef4444;">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <line x1="23" y1="9" x2="17" y2="15"></line>
                    <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
            `;
        } else {
            masterMuteBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
            `;
        }
    }

    // ================= KEYBIND ENGINE =================
    function parseKeyCombination(e) {
        // Build readable key identifier (e.g. "Shift+A", "Ctrl+1", "Space", "F1", "A")
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey && e.key !== 'Shift') parts.push('Shift');

        let key = e.key;

        if (e.code.startsWith('Key')) {
            key = e.code.substring(3);
        } else if (e.code.startsWith('Digit')) {
            key = e.code.substring(5);
        } else if (e.code.startsWith('Numpad')) {
            key = 'Num' + e.code.substring(6);
        } else if (key === ' ') {
            key = 'Space';
        } else if (key.length === 1) {
            key = key.toUpperCase();
        }

        // Avoid adding 'Shift' twice
        if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
            parts.push(key);
        }

        return parts.join('+');
    }

    function handleGlobalKeydown(e) {
        // If recording a keybind
        if (recordingTarget) {
            e.preventDefault();
            e.stopPropagation();

            if (e.key === 'Escape') {
                stopKeybindCapture();
                return;
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
                assignKeybind(recordingTarget, '');
                stopKeybindCapture();
                return;
            }

            const combo = parseKeyCombination(e);
            if (combo && !['Control', 'Shift', 'Alt'].includes(combo)) {
                assignKeybind(recordingTarget, combo.toLowerCase());
                stopKeybindCapture();
            }
            return;
        }

        // Ignore when user is typing in inputs or textareas
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
            if (e.key === 'Escape') {
                document.activeElement.blur();
            }
            return;
        }

        // Global Shortcuts
        if (e.code === 'Space' || e.key === 'Escape') {
            e.preventDefault();
            stopAllSounds();
            return;
        }

        if (e.ctrlKey && e.code === 'KeyF') {
            e.preventDefault();
            searchInput.focus();
            return;
        }

        // Mute shortcut
        if (e.code === 'KeyM' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            settings.isMuted = !settings.isMuted;
            updateAllVolumes();
            saveSettings();
            updateMasterVolumeIcon();
            return;
        }

        // Check if key matches any sound keybind
        const pressedCombo = parseKeyCombination(e).toLowerCase();

        const match = sounds.find(s => s.keybind && s.keybind.toLowerCase() === pressedCombo);
        if (match) {
            e.preventDefault();
            playSound(match.id, true);
        }
    }

    function startKeybindCapture(targetId) {
        recordingTarget = targetId;
        keybindCaptureModal.classList.remove('hidden');

        if (targetId === 'NEW_MODAL') {
            captureSoundTitle.textContent = 'New Sound Button';
        } else if (targetId === 'EDIT_MODAL') {
            captureSoundTitle.textContent = editSoundTitle.value || 'Editing Sound';
        } else {
            const sound = sounds.find(s => s.id === targetId);
            captureSoundTitle.textContent = sound ? sound.title : 'Sound';
        }

        detectedKeyDisplay.textContent = 'Listening for key...';
    }

    function stopKeybindCapture() {
        recordingTarget = null;
        keybindCaptureModal.classList.add('hidden');
    }

    function assignKeybind(target, keybind) {
        if (target === 'NEW_MODAL') {
            newSoundKeybind.value = keybind.toUpperCase();
        } else if (target === 'EDIT_MODAL') {
            editSoundKeybind.value = keybind.toUpperCase();
        } else {
            const sound = sounds.find(s => s.id === target);
            if (sound) {
                // Check conflicts
                if (keybind) {
                    const existing = sounds.find(s => s.id !== sound.id && s.keybind && s.keybind.toLowerCase() === keybind.toLowerCase());
                    if (existing) {
                        existing.keybind = ''; // reassign
                    }
                }
                sound.keybind = keybind;
                saveSounds();
                renderSounds();
            }
        }
    }

    // ================= ADD SOUND MODAL & DRAG/DROP =================
    function openAddModal() {
        pendingFilesToAdd = [];
        fileDropLabel.textContent = 'Click to browse audio files or drag & drop here';
        newSoundTitle.value = '';
        
        let initialCat = (activeCategory !== 'All' && activeCategory !== 'Favorites') 
            ? activeCategory 
            : getPinnedCategory();

        populateCategorySelects(initialCat, null);
        newSoundKeybind.value = '';
        newSoundLoop.checked = false;
        newSoundIsBgm.checked = false;
        if (newCategoryCustomGroup) newCategoryCustomGroup.classList.add('hidden');
        if (newCategoryCustomInput) newCategoryCustomInput.value = '';
        addSoundModal.classList.remove('hidden');
    }

    function closeAddModal() {
        addSoundModal.classList.add('hidden');
    }

    function handleSelectedFiles(fileList) {
        if (!fileList || fileList.length === 0) return;
        pendingFilesToAdd = fileList;

        if (fileList.length === 1) {
            const file = fileList[0];
            fileDropLabel.textContent = `Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`;
            if (!newSoundTitle.value) {
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                newSoundTitle.value = cleanTitle(nameWithoutExt);
            }
            if (file.name.toLowerCase().includes('bgm')) {
                newSoundIsBgm.checked = true;
                newSoundLoop.checked = true;
            }
        } else {
            fileDropLabel.textContent = `Selected ${fileList.length} files (will create multiple buttons!)`;
            newSoundTitle.value = `Batch ${fileList.length} Audio Files`;
        }
    }

    function cleanTitle(name) {
        return name
            .replace(/[_-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    }

    async function handleAddSoundSubmit(e) {
        e.preventDefault();
        if (pendingFilesToAdd.length === 0) {
            alert('Please select or drop at least one audio file first!');
            return;
        }

        let category = newSoundCategory.value;
        if (category === '__create_new__') {
            category = (newCategoryCustomInput && newCategoryCustomInput.value.trim()) ? newCategoryCustomInput.value.trim() : 'Custom Sounds';
            const sb = getActiveSoundboard();
            if (!sb.customCategories) sb.customCategories = [];
            if (!sb.customCategories.includes(category)) {
                sb.customCategories.push(category);
                saveSoundboards();
            }
        }
        const checkedColor = document.querySelector('input[name="accentColor"]:checked');
        const color = checkedColor ? checkedColor.value : '#3b82f6';
        const isBgm = newSoundIsBgm.checked;
        const loop = newSoundLoop.checked;
        const singleKeybind = newSoundKeybind.value.trim().toLowerCase();

        for (let i = 0; i < pendingFilesToAdd.length; i++) {
            const file = pendingFilesToAdd[i];
            const id = 'custom_' + Date.now() + '_' + i;
            const originalName = file.name.replace(/\.[^/.]+$/, "");
            const title = (pendingFilesToAdd.length === 1) ? newSoundTitle.value.trim() : cleanTitle(originalName);
            const keybind = (i === 0) ? singleKeybind : '';

            // Save blob to IndexedDB
            if (window.SoundDB) {
                await window.SoundDB.saveAudio(id, file);
            }

            const objectUrl = URL.createObjectURL(file);

            sounds.unshift({
                id,
                title,
                originalName,
                src: objectUrl,
                customBlobId: id,
                category,
                isBgm,
                loop,
                volume: 1.0,
                playbackRate: 1.0,
                keybind,
                color,
                favorite: false
            });
        }

        saveSounds();
        renderCategories();
        renderSounds();
        renderFolders();
        renderGeneralSfxTray();
        updateBreadcrumb();
        closeAddModal();
    }

    // ================= EDIT SOUND MODAL =================
    function openEditModal(sound) {
        editSoundId.value = sound.id;
        editSoundTitle.value = sound.title;
        populateCategorySelects(null, sound.category || getPinnedCategory());
        editSoundKeybind.value = sound.keybind ? sound.keybind.toUpperCase() : '';
        editSoundVolume.value = Math.round((sound.volume !== undefined ? sound.volume : 1) * 100);
        editVolumeDisplay.textContent = `${editSoundVolume.value}%`;
        editSoundPlaybackRate.value = sound.playbackRate ? String(sound.playbackRate) : "1.0";
        editSpeedDisplay.textContent = `${editSoundPlaybackRate.value}x`;
        editSoundLoop.checked = !!sound.loop;
        editSoundIsBgm.checked = !!sound.isBgm;
        if (editCategoryCustomGroup) editCategoryCustomGroup.classList.add('hidden');
        if (editCategoryCustomInput) editCategoryCustomInput.value = '';

        // Set radio color
        const color = sound.color || '#3b82f6';
        const colorRadio = document.querySelector(`input[name="editAccentColor"][value="${color}"]`);
        if (colorRadio) {
            colorRadio.checked = true;
        }

        editSoundModal.classList.remove('hidden');
    }

    function closeEditModal() {
        editSoundModal.classList.add('hidden');
    }

    function handleEditSoundSubmit(e) {
        e.preventDefault();
        const soundId = editSoundId.value;
        const sound = sounds.find(s => s.id === soundId);
        if (!sound) return;

        let category = editSoundCategory.value;
        if (category === '__create_new__') {
            category = (editCategoryCustomInput && editCategoryCustomInput.value.trim()) ? editCategoryCustomInput.value.trim() : 'General';
            const sb = getActiveSoundboard();
            if (!sb.customCategories) sb.customCategories = [];
            if (!sb.customCategories.includes(category)) {
                sb.customCategories.push(category);
                saveSoundboards();
            }
        }

        sound.title = editSoundTitle.value.trim();
        sound.category = category;
        sound.keybind = editSoundKeybind.value.trim().toLowerCase();
        sound.volume = parseInt(editSoundVolume.value, 10) / 100;
        sound.playbackRate = parseFloat(editSoundPlaybackRate.value) || 1.0;
        sound.loop = editSoundLoop.checked;
        sound.isBgm = editSoundIsBgm.checked;

        const checkedColor = document.querySelector('input[name="editAccentColor"]:checked');
        if (checkedColor) {
            sound.color = checkedColor.value;
        }

        // If currently playing, update live audio properties
        if (activeAudios.has(soundId)) {
            const active = activeAudios.get(soundId);
            active.audio.loop = sound.loop;
            active.audio.volume = calculateVolume(sound.volume);
            active.audio.playbackRate = sound.playbackRate;
        }

        saveSounds();
        renderCategories();
        renderSounds();
        renderFolders();
        renderGeneralSfxTray();
        updateBreadcrumb();
        updateNowPlayingDock();
        closeEditModal();
    }

    async function handleDeleteSound() {
        const soundId = editSoundId.value;
        const sound = sounds.find(s => s.id === soundId);
        if (!sound) return;

        if (!confirm(`Are you sure you want to delete "${sound.title}"?`)) {
            return;
        }

        stopSound(soundId);

        // Delete from IndexedDB if custom
        if (sound.customBlobId && window.SoundDB) {
            await window.SoundDB.deleteAudio(sound.customBlobId);
        }

        sounds = sounds.filter(s => s.id !== soundId);
        saveSounds();
        renderCategories();
        renderSounds();
        renderFolders();
        renderGeneralSfxTray();
        updateBreadcrumb();
        closeEditModal();
    }

    // ================= KEYBIND MAP CHEATSHEET =================
    function openKeybindMap() {
        const boundSounds = sounds.filter(s => s.keybind);
        if (boundSounds.length === 0) {
            keybindTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:#64748b;">No keybinds assigned yet. Click the keycap badge on any sound card to bind a key!</td></tr>`;
        } else {
            keybindTableBody.innerHTML = boundSounds.map(s => `
                <tr>
                    <td><span class="keycap-badge">${escapeHtml(s.keybind.toUpperCase())}</span></td>
                    <td><strong>${escapeHtml(s.title)}</strong></td>
                    <td><span class="category-badge">${escapeHtml(s.category)}</span></td>
                    <td>${s.isBgm ? '<span class="type-badge bgm">BGM</span>' : '<span class="type-badge">SFX</span>'}</td>
                    <td>
                        <button class="pill-btn small" onclick="window.triggerPlaySound('${s.id}')">Play</button>
                        <button class="pill-btn small" onclick="window.triggerEditSound('${s.id}')">Edit</button>
                    </td>
                </tr>
            `).join('');
        }
        keybindMapModal.classList.remove('hidden');
    }

    // Expose helpers for inline onclick in modal
    window.triggerPlaySound = (id) => playSound(id);
    window.triggerEditSound = (id) => {
        keybindMapModal.classList.add('hidden');
        const s = sounds.find(item => item.id === id);
        if (s) openEditModal(s);
    };

    // ================= DRAG & DROP HANDLING =================
    function setupDragAndDrop() {
        let dragCounter = 0;

        window.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
                dropOverlay.classList.remove('hidden');
            }
        });

        window.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                dropOverlay.classList.add('hidden');
            }
        });

        window.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        window.addEventListener('drop', async (e) => {
            e.preventDefault();
            dragCounter = 0;
            dropOverlay.classList.add('hidden');

            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/') || f.type.includes('mp4') || f.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i));
            if (files.length === 0) return;

            // Direct add to current category
            const category = (activeCategory !== 'All' && activeCategory !== 'Favorites') ? activeCategory : 'Custom Uploads';

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const id = 'custom_' + Date.now() + '_' + i;
                const originalName = file.name.replace(/\.[^/.]+$/, "");
                const title = cleanTitle(originalName);
                const isBgm = file.name.toLowerCase().includes('bgm');

                if (window.SoundDB) {
                    await window.SoundDB.saveAudio(id, file);
                }

                sounds.unshift({
                    id,
                    title,
                    originalName,
                    src: URL.createObjectURL(file),
                    customBlobId: id,
                    category,
                    isBgm,
                    loop: isBgm,
                    volume: 1.0,
                    playbackRate: 1.0,
                    keybind: '',
                    color: isBgm ? '#3b82f6' : '#60a5fa',
                    favorite: false
                });
            }

            saveSounds();
            renderCategories();
            renderSounds();
            renderFolders();
            renderGeneralSfxTray();
            updateBreadcrumb();
        });
    }

    // ================= EXPORT / IMPORT / RESET =================
    function handleExportConfig() {
        const exportData = {
            version: 2,
            exportedAt: new Date().toISOString(),
            settings,
            soundboards: soundboards.map(sb => {
                const copy = Object.assign({}, sb);
                copy.sounds = (sb.sounds || []).map(s => {
                    const scopy = Object.assign({}, s);
                    if (scopy.customBlobId) scopy.src = '';
                    return scopy;
                });
                return copy;
            })
        };

        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AQSound_Soundboards_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function handleImportConfig(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (imported.soundboards && Array.isArray(imported.soundboards)) {
                    soundboards = imported.soundboards;
                    if (imported.settings) settings = Object.assign(settings, imported.settings);
                    saveSoundboards();
                    saveSettings();
                    await loadSoundboards();
                    renderFolders();
                    renderCategories();
                    renderSounds();
                    renderGeneralSfxTray();
                    updateBreadcrumb();
                    updateSettingsUI();
                    alert('Soundboards configuration successfully restored!');
                    settingsModal.classList.add('hidden');
                } else if (imported.sounds && Array.isArray(imported.sounds)) {
                    // Backwards compatible with v1 export
                    const sb = getActiveSoundboard();
                    sb.sounds = imported.sounds;
                    sounds = sb.sounds;
                    saveSoundboards();
                    renderCategories();
                    renderSounds();
                    renderFolders();
                    renderGeneralSfxTray();
                    updateBreadcrumb();
                    alert('Sounds imported into active soundboard!');
                    settingsModal.classList.add('hidden');
                } else {
                    alert('Invalid configuration file.');
                }
            } catch (err) {
                alert('Failed to parse backup JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    function handleResetDefaults() {
        if (!confirm('Are you sure you want to reset your soundboards? Custom sound configurations will be reset.')) {
            return;
        }

        stopAllSounds();
        localStorage.removeItem(getSoundboardsStorageKey());
        localStorage.removeItem(getActiveSbStorageKey());
        soundboards = [];
        loadSoundboards().then(() => {
            renderCategories();
            renderSounds();
            renderFolders();
            renderGeneralSfxTray();
            updateBreadcrumb();
            alert('Reset to default soundboard setup complete!');
            settingsModal.classList.add('hidden');
        });
    }

    // Start App
    window.addEventListener('DOMContentLoaded', init);
})();
