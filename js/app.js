document.addEventListener('DOMContentLoaded', () => {

    // --- Auth Check ---
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole') || 'resident'; // 'syndic' ou 'resident'

    // Redirect to login if not logged in (and we are not already on login page)
    if (isLoggedIn !== 'true' && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return; // Stop execution
    }

    // --- State ---
    let isDarkMode = localStorage.getItem('theme') === 'dark';
    let currentLang = localStorage.getItem('lang') || 'fr';

    // --- DOM Elements ---
    const body = document.body;
    const themeBtn = document.getElementById('theme-btn');
    const langBtn = document.getElementById('lang-btn');
    const darkIcon = document.querySelector('.dark-icon');
    const lightIcon = document.querySelector('.light-icon');

    // Removed static language node lists

    // User Profile DOM element
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');

    // --- Setup User Info & Permissions ---
    if (userRole === 'resident') {
        body.classList.add('resident-view');
        if(userNameEl) userNameEl.textContent = "Résident";
        if(userRoleEl) userRoleEl.textContent = "Lecture Seule";
    } else {
        body.classList.add('admin-view');
        if(userNameEl) userNameEl.textContent = "Admin Syndic";
        if(userRoleEl) userRoleEl.textContent = "Gestionnaire";
    }

    // --- Functions ---
    const applyTheme = () => {
        if(isDarkMode) {
            body.classList.add('dark-mode');
            if(darkIcon && lightIcon) {
                darkIcon.classList.add('hidden');
                lightIcon.classList.remove('hidden');
            }
        } else {
            body.classList.remove('dark-mode');
            if(darkIcon && lightIcon) {
                darkIcon.classList.remove('hidden');
                lightIcon.classList.add('hidden');
            }
        }
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    };

    const applyLanguage = () => {
        const currentFrElements = document.querySelectorAll('.lang-fr');
        const currentArElements = document.querySelectorAll('.lang-ar');

        if (currentLang === 'ar') {
            body.setAttribute('dir', 'rtl');
            currentFrElements.forEach(el => el.classList.add('hidden'));
            currentArElements.forEach(el => el.classList.remove('hidden'));
        } else {
            body.setAttribute('dir', 'ltr');
            currentArElements.forEach(el => el.classList.add('hidden'));
            currentFrElements.forEach(el => el.classList.remove('hidden'));
        }
        localStorage.setItem('lang', currentLang);
    };

    const toggleTheme = () => {
        isDarkMode = !isDarkMode;
        applyTheme();
    };

    const toggleLanguage = () => {
        currentLang = currentLang === 'fr' ? 'ar' : 'fr';
        applyLanguage();
    };

    // --- Event Listeners ---
    if(themeBtn) themeBtn.addEventListener('click', toggleTheme);
    if(langBtn) langBtn.addEventListener('click', toggleLanguage);

    // Initial check for system preference if no localStorage
    if (!localStorage.getItem('theme') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDarkMode = true;
    }

    // Apply initial state
    applyTheme();
    applyLanguage();

    // Logic for User Profile dropdown / Logout (Simulated action)
    const userProfileMenu = document.querySelector('.user-profile');
    if (userProfileMenu) {
        userProfileMenu.style.cursor = 'pointer';
        userProfileMenu.addEventListener('click', () => {
            if (confirm(currentLang === 'fr' ? 'Voulez-vous vous déconnecter ?' : 'هل تريد تسجيل الخروج؟')) {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userRole');
                window.location.href = 'login.html';
            }
        });
    }
});
