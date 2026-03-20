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

    const modalEdit = document.getElementById('modal-edit-resident');
    const btnCloseEdit = document.getElementById('btn-close-edit-modal');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    const btnSaveEdit = document.getElementById('btn-save-edit');

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
        const tr = document.createElement('tr');
        tr.dataset.id = unit.id;
        tr.innerHTML = `
            <td>
                <span class="badge active lang-fr">${unit.apartment || 'N/A'}</span>
                <span class="badge active lang-ar hidden">${unit.apartment || 'N/A'}</span>
            </td>
            <td>
                <div class="user-info-row" style="display:flex; align-items:center; gap:12px;">
                    <div class="avatar-sm" style="width:32px; height:32px; border-radius:50%; background:var(--gradient-accent, #4F46E5); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:0.8rem; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);">
                        ${(unit.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <strong style="color: var(--text-main);">${unit.name || 'Inconnu'}</strong>
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
            .select('id, apartment, name, monthly_fee')
            .order('apartment', { ascending: true });

        if (error) {
            console.error(error);
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
                (u.name && u.name.toLowerCase().includes(query)) ||
                (u.apartment && u.apartment.toLowerCase().includes(query))
            );
            renderTable(filtered);
        });
    });

    // --- Add Logistics ---
    const openAddModal = () => {
        document.getElementById('form-add-resident').reset();
        modalAdd.classList.add('active');
    };
    
    const closeAddModal = () => {
        if (modalAdd) modalAdd.classList.remove('active');
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const name = document.getElementById('input-name').value.trim();
        const apt = document.getElementById('input-apt').value.trim();
        const fee = parseFloat(document.getElementById('input-fee').value);

        if (!name || !apt || isNaN(fee)) {
            alert("Veuillez remplir tous les champs correctement.");
            return;
        }

        // --- Optimistic UI ---
        const tempId = 'temp-' + Date.now();
        const newUnit = { id: tempId, name, apartment: apt, monthly_fee: fee };
        localUnits.push(newUnit);
        
        updateMetrics();
        renderTable();
        closeAddModal();

        // --- Background: persist to Supabase ---
        // (Removing 'phone', 'type', 'status' payload parts to strictly map the requested new schema. 
        // If the DB throws a Not Null error on other columns, they should be made nullable).
        const payload = { name, apartment: apt, monthly_fee: fee };
        
        const { error } = await window.supabaseClient.from('units').insert([payload]);
        if (error) {
            alert('Erreur: ' + error.message);
        }
        
        // Final Background re-sync to fetch proper real database IDs
        fetchUnits();
    };

    // --- Edit Logistics ---
    const openEditModal = (unit) => {
        currentEditId = unit.id;
        document.getElementById('edit-name').value = unit.name || '';
        document.getElementById('edit-apt').value = unit.apartment || '';
        document.getElementById('edit-fee').value = unit.monthly_fee || 0;
        if (modalEdit) modalEdit.classList.add('active');
    };
    
    const closeEditModal = () => {
        if (modalEdit) modalEdit.classList.remove('active');
        currentEditId = null;
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        if (!currentEditId) return;

        const name = document.getElementById('edit-name').value.trim();
        const apt = document.getElementById('edit-apt').value.trim();
        const fee = parseFloat(document.getElementById('edit-fee').value);
        if (!name || !apt || isNaN(fee)) return alert("Champs invalides.");

        // --- Optimistic UI ---
        const index = localUnits.findIndex(u => u.id === currentEditId);
        if (index > -1) {
            localUnits[index] = { ...localUnits[index], name, apartment: apt, monthly_fee: fee };
            updateMetrics();
            
            // Replace specifically the edited row to prevent full table flicker
            const row = tbody.querySelector(`tr[data-id="${currentEditId}"]`);
            if (row) {
                row.replaceWith(createRow(localUnits[index]));
                if (window.lucide) lucide.createIcons();
                if (typeof applyLanguage === 'function') applyLanguage();
            } else {
                renderTable(); // Fallback
            }
        }
        closeEditModal();

        // --- Background persist to Supabase ---
        const { error } = await window.supabaseClient
            .from('units')
            .update({ name, apartment: apt, monthly_fee: fee })
            .eq('id', currentEditId);

        if (error) {
            alert('Erreur: ' + error.message);
            // Revert changes on error
            fetchUnits();
        }
    };

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
            // Success - remove from local array and completely from DOM
            localUnits = localUnits.filter(u => u.id !== id);
            updateMetrics();
            rowElement.remove();
        }
    };

    // --- Event Listeners hooks ---
    if (btnAdd) btnAdd.addEventListener('click', openAddModal);
    if (btnCloseAdd) btnCloseAdd.addEventListener('click', closeAddModal);
    btnCancelAdds.forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); closeAddModal(); }));
    btnSaveAdds.forEach(b => b.addEventListener('click', handleAdd));

    if (btnCloseEdit) btnCloseEdit.addEventListener('click', closeEditModal);
    if (btnCancelEdit) btnCancelEdit.addEventListener('click', (e) => { e.preventDefault(); closeEditModal(); });
    if (btnSaveEdit) btnSaveEdit.addEventListener('click', handleEditSave);

    // Bootstrap data fetch on load
    fetchUnits();
};

document.addEventListener('DOMContentLoaded', window.initResidents);
document.addEventListener('spa:pageLoaded', () => {
    if (window.location.pathname.includes('residents.html')) {
        window.initResidents();
    }
});
