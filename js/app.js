document.addEventListener('DOMContentLoaded', async () => {

    // --- REAL Auth Check (Supabase) ---
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    if (!session && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }

    // --- Legacy Local Storage state (for UI role switching) ---
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole') || 'resident'; // 'syndic' ou 'resident'

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

    // --- Logout Logic ---
    const userProfileMenu = document.getElementById('user-profile-menu');
    const logoutBtn = document.getElementById('logout-btn');

    const handleLogout = async (e) => {
        if (e) e.preventDefault();
        
        const confirmMsg = currentLang === 'fr' ? 'Voulez-vous vous déconnecter ?' : 'هل تريد تسجيل الخروج؟';
        if (!confirm(confirmMsg)) return;

        // Sign out from Supabase
        await window.supabaseClient.auth.signOut();
        
        // Clear local storage
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        
        window.location.href = 'login.html';
    };

    if (userProfileMenu) {
        userProfileMenu.style.cursor = 'pointer';
        userProfileMenu.addEventListener('click', handleLogout);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // =========================================================================
    //  DASHBOARD MASTER WIRING
    // =========================================================================
    
    // Only run dashboard logic if we are on the dashboard
    const isDashboard = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/Syndic-Gravity/');

    if (isDashboard) {
        checkUnitsCapacity();
        updateDashboardStats();

        // Modal Setup Interaction
        const unitInput = document.getElementById('input-units-count');
        if (unitInput) {
            unitInput.addEventListener('input', (e) => {
                const val = e.target.value || '...';
                const phFr = document.getElementById('units-placeholder');
                const phAr = document.getElementById('units-placeholder-ar');
                if (phFr) phFr.textContent = val;
                if (phAr) phAr.textContent = val;
            });
        }

        const setupForm = document.getElementById('form-setup-units');
        if (setupForm) {
            setupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const count = parseInt(document.getElementById('input-units-count').value, 10);
                if (!count || count <= 0) return;

                const inputEl = document.getElementById('input-units-count');
                const loadingMsg = document.getElementById('setup-loading');
                
                inputEl.disabled = true;
                loadingMsg.style.display = 'block';

                try {
                    const unitsToInsert = [];
                    for (let i = 1; i <= count; i++) {
                        unitsToInsert.push({ apartment: `Apt ${i.toString().padStart(2, '0')}` });
                    }

                    const { error } = await window.supabaseClient
                        .from('units')
                        .insert(unitsToInsert);

                    if (error) throw error;

                    document.getElementById('modal-setup-units').classList.remove('active');
                    updateDashboardStats(); // Refresh
                    document.dispatchEvent(new Event('unitsCreated'));
                } catch (err) {
                    console.error('Error generating units:', err);
                    alert('Erreur: ' + err.message);
                } finally {
                    inputEl.disabled = false;
                    loadingMsg.style.display = 'none';
                }
            });
        }
    }

    async function checkUnitsCapacity() {
        try {
            const { count, error } = await window.supabaseClient
                .from('units')
                .select('*', { count: 'exact', head: true });
                
            if (error) throw error;

            if (count === 0 && userRole === 'syndic') {
                const modal = document.getElementById('modal-setup-units');
                if (modal) modal.classList.add('active');
            }
        } catch (err) {
            console.error('Error checking units capacity:', err);
        }
    }

    async function updateDashboardStats() {
        try {
            // Task 1: Financial Calculations
            
            // Total Income (from payments table)
            const { data: paymentsData, error: paymentsError } = await window.supabaseClient
                .from('payments')
                .select('amount_paid');
            if (paymentsError) throw paymentsError;

            const totalIncome = (paymentsData || []).reduce((sum, row) => sum + (parseFloat(row.amount_paid) || 0), 0);

            // Total Expenses (from expenses table)
            const { data: expensesData, error: expensesError } = await window.supabaseClient
                .from('expenses')
                .select('amount');
            if (expensesError) throw expensesError;

            const totalExpense = (expensesData || []).reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

            // Calculate Balance
            const totalBalance = totalIncome - totalExpense;

            const balanceEl = document.getElementById('total-balance');
            const incomeEl = document.getElementById('total-income');
            const expenseEl = document.getElementById('total-expense');

            if (balanceEl) balanceEl.textContent = totalBalance.toLocaleString('fr-FR');
            if (incomeEl) incomeEl.textContent = totalIncome.toLocaleString('fr-FR');
            if (expenseEl) expenseEl.textContent = totalExpense.toLocaleString('fr-FR');

            // Task 2: Automatic 'En Retard' (Late) Detection
            const d = new Date();
            const currentMonth = d.getMonth() + 1; // 1-12
            const currentYear = d.getFullYear();

            // Fetch all units
            const { data: units, error: unitsError } = await window.supabaseClient
                .from('units')
                .select('id');
            if (unitsError) throw unitsError;

            // Fetch payments for the current month
            const { data: currentMonthPayments, error: cmpError } = await window.supabaseClient
                .from('payments')
                .select('unit_id')
                .gte('created_at', new Date(currentYear, currentMonth - 1, 1).toISOString())
                .lt('created_at', new Date(currentYear, currentMonth, 1).toISOString());
                // Assuming payment created_at indicates month, or if you use 'month' column:
                // .eq('month', currentMonth)
                
            if (cmpError) throw cmpError;

            // Optional fallback if the DB uses a specific "month" column
            // Make sure the query logic aligns with the actual columns. 

            const paidUnitIds = new Set(currentMonthPayments.map(p => p.unit_id));
            let lateCount = 0;

            if (units && units.length > 0) {
                const lateUnits = units.filter(u => !paidUnitIds.has(u.id));
                lateCount = lateUnits.length;
                
                // Set these units to "En Retard" (Optional: update DB or just UI)
                // The prompt says: "automatically update that unit's status badge in the UI to 'En Retard' (Red status)"
                // This UI update refers to lists of units shown. On dashboard it's just the count.
            }

            const lateEl = document.getElementById('total-late');
            if (lateEl) lateEl.textContent = currentMonthPayments.length > 0 ? lateCount : units?.length || 0; // If no one paid, all are late
            
        } catch (err) {
            console.error('Error updating dashboard stats:', err);
        }
    }

    // =========================================================================
    //  SPA & APP STATE
    // =========================================================================
    
    window.App = {
        state: {
            financials: { income: 0, expenses: 0, balance: 0 },
            units: []
        },
        init() {
            this.setupSPA();
            this.setupRealtimeListeners();
        },
        setupRealtimeListeners() {
            window.supabaseClient
                .channel('public-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, payload => {
                    console.log('Realtime payment update:', payload);
                    if (document.getElementById('total-balance')) {
                        updateDashboardStats();
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, payload => {
                    console.log('Realtime expense update:', payload);
                    if (document.getElementById('total-balance')) {
                        updateDashboardStats();
                    }
                })
                .subscribe();
        },
        setupSPA() {
            const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
            const mainContent = document.querySelector('.main-content');
            
            navLinks.forEach(link => {
                link.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const url = link.getAttribute('href');
                    
                    // Update active state
                    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => item.classList.remove('active'));
                    link.closest('.nav-item').classList.add('active');
                    
                    try {
                        const response = await fetch(url);
                        const html = await response.text();
                        
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        
                        const newMainContent = doc.querySelector('.main-content');
                        if (newMainContent) {
                            mainContent.innerHTML = newMainContent.innerHTML;
                            
                            // Re-bind Lucide icons
                            if (window.lucide) lucide.createIcons();
                            
                            // Load scripts safely
                            const scripts = doc.querySelectorAll('script[src]');
                            scripts.forEach(script => {
                                const src = script.getAttribute('src');
                                if (src.includes('app.js') || src.includes('supabase') || src.includes('lucide')) return;
                                
                                // To make DOMContentLoaded fire in the imported script, we manually trigger the event
                                // Or better, we load it dynamically
                                const newScript = document.createElement('script');
                                newScript.src = src;
                                // Add timestamp to break cache and force reload so it executes
                                newScript.src = src + '?t=' + Date.now();
                                document.body.appendChild(newScript);
                            });

                            // Execute inline scripts (if any)
                            const inlineScripts = doc.querySelectorAll('script:not([src])');
                            inlineScripts.forEach(script => {
                                try {
                                    eval(script.innerText);
                                } catch(e) {}
                            });

                            // If back to dashboard, run update methods
                            if (url.includes('index.html') || url === '/' || url === '') {
                                checkUnitsCapacity();
                                updateDashboardStats();
                            }
                            
                            // Dispatch a custom event to notify components that the SPA page has loaded
                            const event = new Event('spa:pageLoaded');
                            document.dispatchEvent(event);
                        }
                    } catch (error) {
                        console.error("SPA Error: ", error);
                    }
                });
            });
        }
    };

    // Initialize the App state & SPA
    window.App.init();

}); // End of DOMContentLoaded
