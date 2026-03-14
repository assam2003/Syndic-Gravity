document.addEventListener('DOMContentLoaded', () => {

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

    // Closer buttons
    const btnClose = document.getElementById('btn-close-project');
    const btnCancel = document.getElementById('btn-cancel-project');
    const btnCancelAr = document.getElementById('btn-cancel-project-ar');
    
    // Save buttons
    const btnSave = document.getElementById('btn-save-project');
    const btnSaveAr = document.getElementById('btn-save-project-ar');

    // Detail View Logic in Global Scope
    window.openDetailView = (projectName, partAmount) => {
        document.getElementById('projects-view').style.display = 'none';
        document.getElementById('detail-view').classList.add('active');
        
        // Set titles
        document.getElementById('project-name-display-fr').textContent = projectName;
        document.getElementById('project-name-display-ar').textContent = projectName;
        
        // Set calculated part
        document.getElementById('project-part-fr').textContent = partAmount;
        document.getElementById('project-part-ar').textContent = partAmount;

        // Set parts in table column
        const partCells = document.querySelectorAll('.display-part');
        partCells.forEach(cell => {
            cell.innerHTML = `<strong>${partAmount} MAD</strong>`;
        });
    };

    window.closeDetailView = () => {
        document.getElementById('detail-view').classList.remove('active');
        document.getElementById('projects-view').style.display = 'block';
    };

    // Search logic
    const performSearch = (e) => {
        const query = e.target.value.toLowerCase();

        projectCards.forEach(card => {
            const textContent = card.textContent.toLowerCase();
            if (textContent.includes(query)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });

        searchInputs.forEach(input => {
            if (input && input !== e.target) {
                input.value = e.target.value;
            }
        });
    };

    searchInputs.forEach(input => {
        if (input) input.addEventListener('input', performSearch);
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
                <div class="repair-icon">
                    <i data-lucide="folder"></i>
                </div>
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
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%; background: var(--warning);"></div>
                </div>
                <div class="progress-text">
                    <span>${percent}% collecté</span>
                    <span>Reste: ${new Intl.NumberFormat('fr-FR').format(budget - collected)} MAD</span>
                </div>
            </div>

            <div class="repair-actions">
                <button class="btn-view" onclick="openDetailView('${proj.title}', '${partAmount}')">
                    <i data-lucide="eye"></i>
                    <span>Gérer les Cotisations</span>
                </button>
            </div>
        `;
        return div;
    };

    // Opening Modal
    const openModal = () => {
        if (userRole === 'syndic') {
            modal.classList.add('active');
            document.getElementById('project-title').focus();
        }
    };

    const closeModal = () => {
        modal.classList.remove('active');
        document.getElementById('form-add-project').reset();
    };

    if (btnAdd) btnAdd.addEventListener('click', openModal);

    [btnClose, btnCancel, btnCancelAr].forEach(btn => {
        if (btn) btn.addEventListener('click', closeModal);
    });

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Save Project to Supabase
    const handleSave = async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('project-title').value;
        const desc = document.getElementById('project-desc').value;
        const budget = parseFloat(document.getElementById('project-budget').value);

        if (!title || !budget || isNaN(budget)) {
            alert("Veuillez remplir le titre et un budget valide.");
            return;
        }

        const { error } = await window.supabaseClient
            .from('repair_projects')
            .insert([{ title, description: desc, budget_total: budget, status: 'Planifié' }]);

        if (error) {
            alert('Error: ' + error.message);
            return;
        }

        fetchProjects(); // Refresh
        closeModal();
    };

    // Initial fetch
    fetchProjects();

    [btnSave, btnSaveAr].forEach(btn => {
        if (btn) btn.addEventListener('click', handleSave);
    });

});
