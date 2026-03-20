window.initResidents = () => {
    const tbody = document.querySelector('.data-table tbody');
    let localUnits = [];

    // Metrics
    const statsTotalUnits = document.getElementById('stats-total-units');
    const statsTotalFee = document.getElementById('stats-total-fee');

    // Search
    const searchInputs = document.querySelectorAll('#search-input-fr, #search-input-ar');

    // Modals & Buttons
    const modalAdd = document.getElementById('modal-add-resident');
    const btnAdd = document.getElementById('btn-add-resident');
    const btnCloseAdd = document.getElementById('btn-close-modal');
    const btnCancelAdds = document.querySelectorAll('#btn-cancel-modal, #btn-cancel-modal-ar');
    const btnSaveAdds = document.querySelectorAll('#btn-save-resident, #btn-save-resident-ar');
    const formAdd = document.getElementById('form-add-resident');

    const modalEdit = document.getElementById('modal-edit-resident');
    const btnCloseEdit = document.getElementById('btn-close-edit-modal');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    const btnSaveEdit = document.getElementById('btn-save-edit');
    const formEdit = document.getElementById('form-edit-resident');

    let currentEditId = null;

    // --- State & DOM Updates ---
    const updateMetrics = () => {
        if (statsTotalUnits) {
            statsTotalUnits.textContent = localUnits.length;
        }
        if (statsTotalFee) {
            const sum = localUnits.reduce((acc, unit) => acc + (parseFloat(unit.monthly_fee) || 0), 0);
            statsTotalFee.textContent = sum.toLocaleString('fr-FR');
        }
    };

    const createRow = (unit) => {
        const fee = parseFloat(unit.monthly_fee || 0).toLocaleString('fr-FR');
        const unitLabel = unit.unit_number || 'N/A';
        const ownerLabel = unit.owner_name || 'Inconnu';
        const initial = ownerLabel.charAt(0).toUpperCase();

        const tr = document.createElement('tr');
        tr.dataset.id = unit.id;
        tr.innerHTML = `
            <td>
                <span class="badge active lang-fr">${unitLabel}</span>
                <span class="badge active lang-ar hidden">${unitLabel}</span>
            </td>
            <td>
                <div class="user-info-row" style="display:flex; align-items:center; gap:12px;">
                    <div class="avatar-sm" style="width:32px; height:32px; border-radius:50%; background:var(--gradient-accent, #4F46E5); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:0.8rem; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);">
                        ${initial}
                    </div>
                    <div>
                        <strong style="color: var(--text-main);">${ownerLabel}</strong>
                    </div>
                </div>
            </td>
            <td>
                <strong style="font-size: 1.05rem; color: var(--success);">${fee}</strong> <span class="text-sm" style="color: var(--text-muted);">MAD</span>
            </td>
            <td class="text-right">
                <button class="btn-icon-soft btn-edit" title="Modifier" style="color: var(--accent); margin-right: 4px;">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                </button>
                <button class="btn-icon-soft btn-delete" title="Supprimer" style="color: var(--danger);">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                </button>
            </td>
        `;

        tr.querySelector('.btn-edit').addEventListener('click', () => openEditModal(unit));
        tr.querySelector('.btn-delete').addEventListener('click', () => handleDelete(unit.id, tr));

        return tr;
    };

    const renderTable = (data = localUnits) => {
        if (!tbody) return;
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 32px; color: var(--text-muted);"><i data-lucide="users" style="opacity:0.3; width:32px; height:32px; margin-bottom:12px;"></i><br><span class="lang-fr">Aucun propriétaire trouvé</span><span class="lang-ar hidden">لم يتم العثور على ملاك</span></td></tr>`;
            if (window.lucide) lucide.createIcons();
            return;
        }
        data.forEach(unit => tbody.appendChild(createRow(unit)));
        if (window.lucide) lucide.createIcons();
        if (typeof applyLanguage === 'function') applyLanguage();
    };

    // --- Data Fetching ---
    const fetchUnits = async () => {
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 40px;"><div class="spinner"></div></td></tr>`;

        const { data, error } = await window.supabaseClient
            .from('units')
            .select('id, unit_number, owner_name, monthly_fee')
            .order('unit_number', { ascending: true });

        if (error) {
            console.error('Fetch units error:', error);
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger" style="padding: 24px;">Erreur de chargement des données.</td></tr>`;
            return;
        }

        localUnits = data || [];
        updateMetrics();
        renderTable();
    };

    // --- Search ---
    searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = localUnits.filter(u =>
                (u.owner_name && u.owner_name.toLowerCase().includes(query)) ||
                (u.unit_number && u.unit_number.toLowerCase().includes(query))
            );
            renderTable(filtered);
        });
    });

    // --- Add Logistics ---
    const openAddModal = () => {
        if (formAdd) formAdd.reset();
        if (modalAdd) modalAdd.classList.add('active');
    };
    
    const closeAddModal = () => {
        if (modalAdd) modalAdd.classList.remove('active');
    };

    const handleAdd = async (e) => {
        if (e) e.preventDefault();

        const nameInput = document.getElementById('input-name');
        const aptInput = document.getElementById('input-apt');
        const feeInput = document.getElementById('input-fee');

        const owner_name = (nameInput?.value || '').trim();
        const unit_number = (aptInput?.value || '').trim();
        const monthly_fee = parseFloat(feeInput?.value);

        if (!owner_name || !unit_number || isNaN(monthly_fee)) {
            alert("Veuillez remplir tous les champs correctement.");
            return;
        }

        // --- Optimistic UI: instant local update ---
        const tempId = 'temp-' + Date.now();
        const newUnit = { id: tempId, owner_name, unit_number, monthly_fee };
        localUnits.push(newUnit);
        updateMetrics();
        renderTable();
        closeAddModal();

        // --- Background: persist to Supabase ---
        const { data: inserted, error } = await window.supabaseClient
            .from('units')
            .insert([{ owner_name, unit_number, monthly_fee }])
            .select();

        if (error) {
            console.error('Insert error:', error);
            alert('Erreur: ' + error.message);
            // Revert: remove optimistic entry
            localUnits = localUnits.filter(u => u.id !== tempId);
            updateMetrics();
            renderTable();
            return;
        }

        // Replace temp ID with real DB id
        if (inserted && inserted[0]) {
            const idx = localUnits.findIndex(u => u.id === tempId);
            if (idx > -1) {
                localUnits[idx] = inserted[0];
                renderTable();
            }
        }
    };

    // Prevent form default submit (which causes page reload)
    if (formAdd) formAdd.addEventListener('submit', handleAdd);

    // --- Edit Logistics ---
    const openEditModal = (unit) => {
        currentEditId = unit.id;
        const editName = document.getElementById('edit-name');
        const editApt = document.getElementById('edit-apt');
        const editFee = document.getElementById('edit-fee');
        if (editName) editName.value = unit.owner_name || '';
        if (editApt) editApt.value = unit.unit_number || '';
        if (editFee) editFee.value = unit.monthly_fee || 0;
        if (modalEdit) modalEdit.classList.add('active');
    };
    
    const closeEditModal = () => {
        if (modalEdit) modalEdit.classList.remove('active');
        currentEditId = null;
    };

    const handleEditSave = async (e) => {
        if (e) e.preventDefault();
        if (!currentEditId) return;

        const owner_name = (document.getElementById('edit-name')?.value || '').trim();
        const unit_number = (document.getElementById('edit-apt')?.value || '').trim();
        const monthly_fee = parseFloat(document.getElementById('edit-fee')?.value);

        if (!owner_name || !unit_number || isNaN(monthly_fee)) {
            alert("Champs invalides.");
            return;
        }

        // --- Optimistic UI ---
        const index = localUnits.findIndex(u => u.id === currentEditId);
        if (index > -1) {
            localUnits[index] = { ...localUnits[index], owner_name, unit_number, monthly_fee };
            updateMetrics();
            renderTable();
        }
        closeEditModal();

        // --- Background persist to Supabase ---
        const { error } = await window.supabaseClient
            .from('units')
            .update({ owner_name, unit_number, monthly_fee })
            .eq('id', currentEditId);

        if (error) {
            console.error('Update error:', error);
            alert('Erreur: ' + error.message);
            fetchUnits(); // revert
        }
    };

    if (formEdit) formEdit.addEventListener('submit', handleEditSave);

    // --- Delete Logistics ---
    const handleDelete = async (id, rowElement) => {
        const langInfo = localStorage.getItem('lang') === 'ar' ? "هل تريد حقًا حذف هذا المالك؟" : "Voulez-vous vraiment supprimer ce propriétaire ?";
        if (!confirm(langInfo)) return;

        // --- Optimistic UI ---
        rowElement.style.transition = 'all 0.3s ease';
        rowElement.style.opacity = '0.4';
        rowElement.style.pointerEvents = 'none';

        // --- Background Sync ---
        const { error } = await window.supabaseClient.from('units').delete().eq('id', id);
        
        if (error) {
            alert("Erreur: " + error.message);
            rowElement.style.opacity = '1';
            rowElement.style.pointerEvents = 'auto';
        } else {
            localUnits = localUnits.filter(u => u.id !== id);
            updateMetrics();
            rowElement.remove();
            // Show empty state if needed
            if (localUnits.length === 0) renderTable();
        }
    };

    // --- Event Listeners ---
    if (btnAdd) btnAdd.addEventListener('click', openAddModal);
    if (btnCloseAdd) btnCloseAdd.addEventListener('click', closeAddModal);
    btnCancelAdds.forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); closeAddModal(); }));
    // Also bind save buttons as click handlers (in case form submit doesn't fire)
    btnSaveAdds.forEach(b => b.addEventListener('click', (e) => {
        e.preventDefault();
        handleAdd(e);
    }));

    if (btnCloseEdit) btnCloseEdit.addEventListener('click', closeEditModal);
    if (btnCancelEdit) btnCancelEdit.addEventListener('click', (e) => { e.preventDefault(); closeEditModal(); });
    if (btnSaveEdit) btnSaveEdit.addEventListener('click', (e) => {
        e.preventDefault();
        handleEditSave(e);
    });

    // Bootstrap
    fetchUnits();
};

document.addEventListener('DOMContentLoaded', window.initResidents);
document.addEventListener('spa:pageLoaded', () => {
    if (window.location.pathname.includes('residents.html')) {
        window.initResidents();
    }
});
