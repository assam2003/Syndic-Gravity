document.addEventListener('DOMContentLoaded', async () => {

    // --- REAL Auth Check (Supabase) ---
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    if (!session && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }

    // --- State ---
    const userRole = localStorage.getItem('userRole') || 'resident';
    let isDarkMode = localStorage.getItem('theme') === 'dark';
    let currentLang = localStorage.getItem('lang') || 'fr';

    const body = document.body;
    const themeBtn = document.getElementById('theme-btn');
    const langBtn = document.getElementById('lang-btn');
    const darkIcon = document.querySelector('.dark-icon');
    const lightIcon = document.querySelector('.light-icon');

    // --- Role UI Update ---
    const updateRoleUI = () => {
        const userNameEl = document.querySelector('.user-name');
        const userRoleEl = document.querySelector('.user-role');
        if (userRole === 'resident') {
            body.classList.add('resident-view');
            if(userNameEl) userNameEl.textContent = "Résident";
            if(userRoleEl) userRoleEl.textContent = "Lecture Seule";
        } else {
            body.classList.remove('resident-view');
            body.classList.add('admin-view');
            if(userNameEl) userNameEl.textContent = "Admin Syndic";
            if(userRoleEl) userRoleEl.textContent = "Gestionnaire";
        }
    };

    const applyTheme = () => {
        body.classList.toggle('dark-mode', isDarkMode);
        if(darkIcon && lightIcon) {
            darkIcon.classList.toggle('hidden', isDarkMode);
            lightIcon.classList.toggle('hidden', !isDarkMode);
        }
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    };

    const applyLanguage = () => {
        const currentFrElements = document.querySelectorAll('.lang-fr');
        const currentArElements = document.querySelectorAll('.lang-ar');
        const isAr = currentLang === 'ar';

        body.setAttribute('dir', isAr ? 'rtl' : 'ltr');
        currentFrElements.forEach(el => el.classList.toggle('hidden', isAr));
        currentArElements.forEach(el => el.classList.toggle('hidden', !isAr));
        localStorage.setItem('lang', currentLang);
    };

    // --- Event Listeners for Globals ---
    if(themeBtn) themeBtn.onclick = () => { isDarkMode = !isDarkMode; applyTheme(); };
    if(langBtn) langBtn.onclick = () => { currentLang = currentLang === 'fr' ? 'ar' : 'fr'; applyLanguage(); };

    // Initial state
    updateRoleUI();
    applyTheme();
    applyLanguage();

    // --- User Profile Dropdown & Logout ---
    const userProfileMenu = document.getElementById('user-profile-menu');
    const userDropdown = document.getElementById('user-dropdown');

    // Toggle dropdown on profile click (NOT logout)
    if (userProfileMenu) {
        userProfileMenu.onclick = (e) => {
            e.stopPropagation();
            if (userDropdown) userDropdown.classList.toggle('active');
        };
    }

    // Close dropdown when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (userDropdown && !userProfileMenu.contains(e.target)) {
            userDropdown.classList.remove('active');
        }
    });

    // Logout ONLY from the dedicated logout button
    const btnLogout = document.getElementById('btn-logout');
    const handleLogout = async (e) => {
        if (e) e.preventDefault();
        const confirmMsg = currentLang === 'fr' ? 'Voulez-vous vous déconnecter ?' : 'هل تريد تسجيل الخروج؟';
        if (!confirm(confirmMsg)) return;
        await window.supabaseClient.auth.signOut();
        localStorage.clear();
        window.location.href = 'login.html';
    };
    if (btnLogout) btnLogout.onclick = handleLogout;

    // =========================================================================
    //  DASHBOARD LOGIC
    // =========================================================================
    
    async function fetchRecentOperations() {
        // Fallback to payment_date, amount_paid if paid_at is not available, per schema
        const { data, error } = await window.supabaseClient
            .from('payments')
            .select(`
                id,
                amount_paid,
                payment_date,
                units (
                    apartment,
                    name
                )
            `)
            .order('payment_date', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error fetching recent operations:', error);
            return [];
        }
        return data;
    }

    async function renderRecentOperations() {
        const tbody = document.getElementById('recent-operations-tbody');
        if (!tbody) return;

        const operations = await fetchRecentOperations();

        if (!operations || operations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center" style="padding: 24px; color: var(--text-muted);">
                        <i data-lucide="inbox" style="margin-bottom: 8px; opacity: 0.5;"></i><br>
                        <span class="lang-fr">Aucune opération récente</span>
                        <span class="lang-ar hidden">لا توجد عمليات حديثة</span>
                    </td>
                </tr>
            `;
            if (window.lucide) lucide.createIcons();
            applyLanguage();
            return;
        }

        tbody.innerHTML = '';

        operations.forEach(op => {
            // Using payment_date as paid_at
            const dateObj = new Date(op.payment_date || op.paid_at);
            const formattedDate = dateObj.toLocaleDateString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });

            // Assuming status is 'Payé' for payments, or fallback to op.status
            const statusLabel = op.status || 'Payé';
            const isPaid = statusLabel.toLowerCase() === 'payé' || statusLabel.toLowerCase() === 'paid';
            const badgeClass = isPaid ? 'active' : 'pending'; // 'active' is green in CSS
            
            const unitLabel = op.units ? `Apt ${op.units.apartment}` : 'N/A';
            const ownerName = op.units ? op.units.name : 'Inconnu';
            const amount = parseFloat(op.amount_paid || 0).toLocaleString('fr-FR');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formattedDate}</td>
                <td>
                    <div class="tx-desc">
                        <div class="tx-icon add"><i data-lucide="plus"></i></div>
                        <div>
                            <span class="lang-fr">Cotisation Mensuelle</span>
                            <span class="lang-ar hidden">المساهمة الشهرية</span>
                        </div>
                    </div>
                </td>
                <td>${unitLabel} - ${ownerName}</td>
                <td>
                    <span class="status ${badgeClass} lang-fr">${statusLabel}</span>
                    <span class="status ${badgeClass} lang-ar hidden">${isPaid ? 'مدفوع' : 'قيد الانتظار'}</span>
                </td>
                <td class="text-right text-success" style="font-weight: 600;">+ ${amount} MAD</td>
            `;
            tbody.appendChild(tr);
        });

        if (window.lucide) lucide.createIcons();
        applyLanguage();
    }

    async function updateDashboardStats() {
        if (!document.getElementById('total-balance')) return;
        renderRecentOperations(); // Update the table
        try {
            const { data: payments } = await window.supabaseClient.from('payments').select('amount_paid');
            const { data: expenses } = await window.supabaseClient.from('expenses').select('amount');
            const { data: units } = await window.supabaseClient.from('units').select('id');
            const { data: monthPays } = await window.supabaseClient.from('payments').select('unit_id').gte('payment_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

            const income = (payments || []).reduce((s, p) => s + (parseFloat(p.amount_paid) || 0), 0);
            const expense = (expenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
            const paidIds = new Set(monthPays.map(p => p.unit_id));
            const lateCount = (units || []).filter(u => !paidIds.has(u.id)).length;

            if (document.getElementById('total-balance')) document.getElementById('total-balance').textContent = (income - expense).toLocaleString('fr-FR');
            if (document.getElementById('total-income')) document.getElementById('total-income').textContent = income.toLocaleString('fr-FR');
            if (document.getElementById('total-expense')) document.getElementById('total-expense').textContent = expense.toLocaleString('fr-FR');
            if (document.getElementById('total-late')) document.getElementById('total-late').textContent = lateCount;
        } catch (err) { console.error('Stats error:', err); }
    }

    // =========================================================================
    //  SPA CONTROLLER
    // =========================================================================
    
    window.App = {
        init() {
            this.setupSPA();
            this.setupRealtime();
            this.setupDelegates();
            
            // Initial path handling
            const path = window.location.pathname;
            if (path.includes('index') || path === '/' || path.endsWith('/')) updateDashboardStats();
        },
        setupRealtime() {
            window.supabaseClient.channel('db-sync').on('postgres_changes', { event: '*', schema: 'public' }, () => {
                if (document.getElementById('total-balance')) updateDashboardStats();
            }).subscribe();
        },
        setupDelegates() {
            // Global setup for parts of the app that are dynamically loaded
            document.addEventListener('submit', async (e) => {
                if (e.target.id === 'form-setup-units') {
                    e.preventDefault();
                    const count = parseInt(document.getElementById('input-units-count').value);
                    if (!count) return;
                    const units = Array.from({length: count}, (_, i) => ({ apartment: `Apt ${(i+1).toString().padStart(2,'0')}` }));
                    const { error } = await window.supabaseClient.from('units').insert(units);
                    if (!error) {
                        document.getElementById('modal-setup-units').classList.remove('active');
                        updateDashboardStats();
                    }
                }
            });

            // Units count preview listener
            document.addEventListener('input', (e) => {
                if (e.target.id === 'input-units-count') {
                    const val = e.target.value || '...';
                    if (document.getElementById('units-placeholder')) document.getElementById('units-placeholder').textContent = val;
                    if (document.getElementById('units-placeholder-ar')) document.getElementById('units-placeholder-ar').textContent = val;
                }
            });
        },
        async navigate(url, push = true) {
            const main = document.querySelector('.main-content');
            if (!main) return;

            // --- Optimistic UI: update nav active state IMMEDIATELY ---
            const clean = url.split('/').pop() || 'index.html';
            document.querySelectorAll('.nav-link').forEach(l => {
                const li = l.closest('.nav-item');
                if (li) li.classList.toggle('active', l.getAttribute('href') === clean);
            });

            try {
                const res = await fetch(url);
                const html = await res.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newMain = doc.querySelector('.main-content');

                if (newMain) {
                    main.innerHTML = newMain.innerHTML;
                    if (push) history.pushState({ url }, '', url);
                    
                    document.title = doc.title;

                    applyLanguage();
                    updateRoleUI();
                    if (window.lucide) lucide.createIcons();
                    if (url.includes('index.html') || url === '/' || url.endsWith('/')) updateDashboardStats();

                    // Re-bind user profile dropdown after content swap
                    const newProfileMenu = document.getElementById('user-profile-menu');
                    const newDropdown = document.getElementById('user-dropdown');
                    const newLogoutBtn = document.getElementById('btn-logout');
                    if (newProfileMenu && newDropdown) {
                        newProfileMenu.onclick = (e) => { e.stopPropagation(); newDropdown.classList.toggle('active'); };
                    }
                    if (newLogoutBtn) newLogoutBtn.onclick = handleLogout;

                    document.dispatchEvent(new CustomEvent('spa:pageLoaded', { detail: { url } }));
                }
            } catch (err) { console.error('SPA Navigation Error:', err); window.location.href = url; }
        },
        setupSPA() {
            document.addEventListener('click', (e) => {
                const l = e.target.closest('.nav-link');
                if (l && l.getAttribute('href') && !l.getAttribute('href').startsWith('http') && !l.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    this.navigate(l.getAttribute('href'));
                }
            });
            window.onpopstate = () => this.navigate(window.location.pathname, false);
        }
    };

    window.App.init();
});
