window.initRepairs = () => {
    const userRole = localStorage.getItem('userRole') || 'resident';

    // Search
    const searchInputs = [
        document.getElementById('search-repair'),
        document.getElementById('search-repair-ar')
    ];
    let projectCards = document.querySelectorAll('.repair-card');

    // Modals
    const modal = document.getElementById('modal-add-project');
    const btnAdd = document.getElementById('btn-add-project');

    if (!modal && !document.querySelector('.projects-grid')) return;

    // Closer buttons
    const btnClose = document.getElementById('btn-close-project');
    const btnCancel = document.getElementById('btn-cancel-project');
    const btnCancelAr = document.getElementById('btn-cancel-project-ar');
    
    // Save buttons
    const btnSave = document.getElementById('btn-save-project');
    const btnSaveAr = document.getElementById('btn-save-project-ar');

    // Detail View Logic in Global Scope (Keep it global for simple onclick handlers in templates)
    window.openDetailView = (projectName, partAmount) => {
        const projView = document.getElementById('projects-view');
        const detailView = document.getElementById('detail-view');
        
        if (projView) projView.style.display = 'none';
        if (detailView) detailView.classList.add('active');
        
        const titleFr = document.getElementById('project-name-display-fr');
        const titleAr = document.getElementById('project-name-display-ar');
        if (titleFr) titleFr.textContent = projectName;
        if (titleAr) titleAr.textContent = projectName;
        
        const partFr = document.getElementById('project-part-fr');
        const partAr = document.getElementById('project-part-ar');
        if (partFr) partFr.textContent = partAmount;
        if (partAr) partAr.textContent = partAmount;

        document.querySelectorAll('.display-part').forEach(cell => {
            cell.innerHTML = `<strong>${partAmount} MAD</strong>`;
        });
    };

    window.closeDetailView = () => {
        const detailView = document.getElementById('detail-view');
        const projView = document.getElementById('projects-view');
        if (detailView) detailView.classList.remove('active');
        if (projView) projView.style.display = 'block';
    };

    // Search logic
    const performSearch = (e) => {
        const query = e.target.value.toLowerCase();
        projectCards.forEach(card => {
            card.style.display = card.textContent.toLowerCase().includes(query) ? 'block' : 'none';
        });
        searchInputs.forEach(input => {
            if (input && input !== e.target) input.value = e.target.value;
        });
    };

    searchInputs.forEach(input => {
        if (input) {
            input.removeEventListener('input', performSearch);
            input.addEventListener('input', performSearch);
        }
    });

    // --- Supabase Integration ---
    const fetchProjects = async () => {
        const { data, error } = await window.supabaseClient
            .from('repair_projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error:', error);
            return;
        }
        renderProjects(data);
    };

    const renderProjects = (projects) => {
        const grid = document.querySelector('.projects-grid');
        if (!grid) return;
        grid.innerHTML = '';

        projects.forEach(proj => {
            const card = createProjectCard(proj);
            grid.appendChild(card);
        });

        projectCards = document.querySelectorAll('.repair-card');
        if (window.lucide) lucide.createIcons();

        // Language sync
        const currentLang = localStorage.getItem('lang') || 'fr';
        if (currentLang === 'ar') {
            grid.querySelectorAll('.lang-fr').forEach(el => el.classList.add('hidden'));
            grid.querySelectorAll('.lang-ar').forEach(el => el.classList.remove('hidden'));
        }
    };

    const createProjectCard = (proj) => {
        const budget = parseFloat(proj.budget_total);
        const collected = parseFloat(proj.budget_collected || 0);
        const partAmount = (budget / 20).toFixed(2);
        const budgetFormatted = new Intl.NumberFormat('fr-FR').format(budget);
        const collectedFormatted = new Intl.NumberFormat('fr-FR').format(collected);
        const percent = Math.round((collected / budget) * 100) || 0;

        const div = document.createElement('div');
        div.className = 'repair-card';
        div.dataset.id = proj.id;
        div.innerHTML = `
            <div class="repair-header">
                <div class="repair-icon"><i data-lucide="folder"></i></div>
                <span class="status ${proj.status === 'Planifié' ? 'pending' : 'active'}">
                   <span class="lang-fr">${proj.status}</span>
                </span>
            </div>
            <h3 class="repair-title">${proj.title}</h3>
            <p class="repair-desc">${proj.description || ''}</p>
            <div class="repair-stats">
                <div class="stat-item">
                    <span class="stat-label">Budget Total</span>
                    <span class="stat-value total">${budgetFormatted} MAD</span>
                </div>
                <div class="stat-item" style="align-items: flex-end;">
                    <span class="stat-label">Fonds Collectés</span>
                    <span class="stat-value collected">${collectedFormatted} MAD</span>
                </div>
            </div>
            <div class="progress-container">
                <div class="progress-bar"><div class="progress-fill" style="width: ${percent}%; background: var(--warning);"></div></div>
                <div class="progress-text">
                    <span>${percent}% collecté</span>
                    <span>Reste: ${new Intl.NumberFormat('fr-FR').format(budget - collected)} MAD</span>
                </div>
            </div>
            <div class="repair-actions">
                <button class="btn-view" onclick="openDetailView('${proj.title}', '${partAmount}')">
                    <i data-lucide="eye"></i><span>Gérer les Cotisations</span>
                </button>
            </div>
        `;
        return div;
    };

    const openModal = () => {
        if (userRole === 'syndic' && modal) {
            modal.classList.add('active');
            const titleInput = document.getElementById('project-title');
            if (titleInput) titleInput.focus();
        }
    };

    const closeModal = () => {
        if (modal) {
            modal.classList.remove('active');
            const projForm = document.getElementById('form-add-project');
            if (projForm) projForm.reset();
        }
    };

    if (btnAdd) btnAdd.onclick = openModal;
    [btnClose, btnCancel, btnCancelAr].forEach(btn => {
        if (btn) btn.onclick = closeModal;
    });

    const handleSave = async (e) => {
        e.preventDefault();
        const title = document.getElementById('project-title').value;
        const desc = document.getElementById('project-desc').value;
        const budget = parseFloat(document.getElementById('project-budget').value);

        if (!title || !budget || isNaN(budget)) {
            alert("Veuillez remplir le titre et un budget valide.");
            return;
        }

        // --- Optimistic UI: add card immediately ---
        const tempProject = {
            id: 'temp-' + Date.now(),
            title,
            description: desc,
            budget_total: budget,
            budget_collected: 0,
            status: 'Planifié',
            created_at: new Date().toISOString()
        };
        const grid = document.querySelector('.projects-grid');
        if (grid) {
            const card = createProjectCard(tempProject);
            grid.prepend(card);
            if (window.lucide) lucide.createIcons();
        }
        closeModal();

        // --- Background: persist to Supabase ---
        const { error } = await window.supabaseClient
            .from('repair_projects')
            .insert([{ title, description: desc, budget_total: budget, status: 'Planifié' }]);

        if (error) {
            alert('Error: ' + error.message);
        }
        fetchProjects();
    };

    if (btnSave) btnSave.onclick = handleSave;
    if (btnSaveAr) btnSaveAr.onclick = handleSave;

    fetchProjects();
};

document.addEventListener('DOMContentLoaded', window.initRepairs);
document.addEventListener('spa:pageLoaded', () => {
    if (window.location.pathname.includes('repairs.html')) {
        window.initRepairs();
    }
});
