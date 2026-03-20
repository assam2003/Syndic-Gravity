window.initResidents = () => {
    // Prevent multiple event listeners by clearing existing ones if possible 
    // or ensuring this function is idempotent.
    
    const userRole = localStorage.getItem('userRole') || 'resident';

    // --- DOM Elements for Search ---
    const searchInputs = [
        document.getElementById('search-input-fr'),
        document.getElementById('search-input-ar')
    ];
    let tableRows = document.querySelectorAll('.data-table tbody tr');

    // --- DOM Elements for Add Modal ---
    const btnAdd = document.getElementById('btn-add-resident');
    const modal = document.getElementById('modal-add-resident');
    
    // Closer buttons
    const btnClose = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-cancel-modal');
    const btnCancelAr = document.getElementById('btn-cancel-modal-ar');
    
    // Save buttons
    const btnSave = document.getElementById('btn-save-resident');
    const btnSaveAr = document.getElementById('btn-save-resident-ar');

    const form = document.getElementById('form-add-resident');

    // --- DOM Elements for Edit Modal ---
    const editModal = document.getElementById('modal-edit-resident');
    const btnCloseEdit = document.getElementById('btn-close-edit-modal');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    const btnSaveEdit = document.getElementById('btn-save-edit');
    const editForm = document.getElementById('form-edit-resident');

    let editingRow = null; // track which row is being edited

    if (!modal && !editModal) return; // Not on residents page

    // --- Search functionality ---
    const performSearch = (e) => {
        const query = e.target.value.toLowerCase();

        tableRows.forEach(row => {
            const textContent = row.textContent.toLowerCase();
            if (textContent.includes(query)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });

        // Sync both inputs
        searchInputs.forEach(input => {
            if (input && input !== e.target) {
                input.value = e.target.value;
            }
        });
    };

    searchInputs.forEach(input => {
        if (input) {
            input.removeEventListener('input', performSearch);
            input.addEventListener('input', performSearch);
        }
    });

    // --- Supabase Integration Functions ---
    const fetchResidents = async () => {
        const { data, error } = await window.supabaseClient
            .from('units')
            .select('*')
            .order('apartment', { ascending: true });

        if (error) {
            console.error('Error fetching residents:', error);
            return;
        }

        renderResidents(data);
    };

    const renderResidents = (residents) => {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = ''; // Clear existing rows

        residents.forEach(res => {
            const row = createResidentRow(res);
            tbody.appendChild(row);
        });

        tableRows = document.querySelectorAll('.data-table tbody tr');
        attachEditListeners();
        
        // Re-init lucide
        if (window.lucide) lucide.createIcons();
    };

    const createResidentRow = (res) => {
        const tr = document.createElement('tr');
        const isVacant = !res.resident_email && !res.name;
        
        tr.dataset.id = res.id; // Store Supabase ID
        tr.innerHTML = `
            <td>
                <div class="apt-badge">${res.apartment || '-'}</div>
                <span class="text-sm">${res.floor || ''}</span>
            </td>
            <td>
                <div class="user-desc">
                    <strong>${isVacant ? '<span style="color:var(--text-muted); font-style:italic;" class="lang-fr">Vacant</span><span style="color:var(--text-muted); font-style:italic;" class="lang-ar hidden">شاغرة</span>' : (res.name || 'Inconnu')}</strong>
                    <span class="text-sm">${isVacant ? '-' : (res.type || 'Résident')}</span>
                </div>
            </td>
            <td>
                <div class="contact-info">
                    <span><i data-lucide="${res.resident_email ? 'mail' : 'phone'}" class="icon-sm"></i> ${res.resident_email || res.phone || '-'}</span>
                </div>
            </td>
            <td>
                <span class="status ${isVacant ? 'pending' : 'active'} lang-fr">${isVacant ? 'Non Assigné' : 'Actif'}</span>
                <span class="status ${isVacant ? 'pending' : 'active'} lang-ar hidden">${isVacant ? 'غير مخصص' : 'نشط'}</span>
            </td>
            <td class="text-right admin-only">
                <button class="btn-icon-soft btn-edit-resident" title="Modifier"><i data-lucide="edit"></i></button>
                <button class="btn-icon-soft" title="Historique"><i data-lucide="history"></i></button>
            </td>
        `;
        return tr;
    };

    // --- Add Modal functionality ---
    const openModal = () => {
        if (userRole === 'syndic') {
            modal.classList.add('active');
            const nameInput = document.getElementById('input-name');
            if (nameInput) nameInput.focus();
        }
    };

    const closeModal = () => {
        if (modal) {
            modal.classList.remove('active');
            if (form) form.reset();
        }
    };

    if (btnAdd) btnAdd.addEventListener('click', openModal);
    
    [btnClose, btnCancel, btnCancelAr].forEach(btn => {
        if (btn) btn.addEventListener('click', closeModal);
    });

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // --- Handle Save (Add New) ---
    const handleSave = async (e) => {
        e.preventDefault();

        const name = document.getElementById('input-name').value;
        const apt = document.getElementById('input-apt').value;
        const phone = document.getElementById('input-phone').value;
        const type = document.getElementById('input-type').value;

        if (!name || !apt) {
            alert('Veuillez remplir le nom et l\'appartement.');
            return;
        }

        // --- Optimistic UI: add row immediately ---
        const tempRow = createResidentRow({ id: 'temp-' + Date.now(), name, apartment: apt, phone, type, resident_email: null });
        const tbody = document.querySelector('.data-table tbody');
        if (tbody) tbody.appendChild(tempRow);
        if (window.lucide) lucide.createIcons();
        closeModal();

        // --- Background: persist to Supabase ---
        const { data, error } = await window.supabaseClient
            .from('units')
            .insert([{ name, apartment: apt, phone, type, status: 'À jour' }])
            .select();

        if (error) {
            alert('Error saving: ' + error.message);
        }

        // Re-sync from Supabase to get real IDs
        fetchResidents();
    };

    [btnSave, btnSaveAr].forEach(btn => {
        if (btn) btn.addEventListener('click', handleSave);
    });

    const openEditModal = (row) => {
        editingRow = row;
        const aptBadge = row.querySelector('.apt-badge');
        const nameEl = row.querySelector('.user-desc strong');
        const phoneEl = row.querySelector('.contact-info span');
        const typeEl = row.querySelector('.user-desc .text-sm');

        if (document.getElementById('edit-apt')) document.getElementById('edit-apt').value = aptBadge ? aptBadge.textContent.trim() : '';
        if (document.getElementById('edit-name')) document.getElementById('edit-name').value = nameEl ? nameEl.textContent.trim() : '';
        if (document.getElementById('edit-phone')) document.getElementById('edit-phone').value = phoneEl ? phoneEl.textContent.trim() : '';

        const typeSelect = document.getElementById('edit-type');
        if (typeSelect && typeEl) {
            const typeText = typeEl.textContent.trim();
            for (let i = 0; i < typeSelect.options.length; i++) {
                if (typeSelect.options[i].value === typeText || typeSelect.options[i].text === typeText) {
                    typeSelect.selectedIndex = i;
                    break;
                }
            }
        }

        editModal.classList.add('active');
        if (document.getElementById('edit-name')) document.getElementById('edit-name').focus();
    };

    const closeEditModal = () => {
        if (editModal) {
            editModal.classList.remove('active');
            if (editForm) editForm.reset();
            editingRow = null;
        }
    };

    const handleEditSave = async () => {
        if (!editingRow) return;
        const id = editingRow.dataset.id;
        const newName = document.getElementById('edit-name').value.trim();
        const newApt = document.getElementById('edit-apt').value.trim();
        const newPhone = document.getElementById('edit-phone').value.trim();
        const newType = document.getElementById('edit-type').value;

        // --- Optimistic UI: update DOM immediately ---
        const aptBadge = editingRow.querySelector('.apt-badge');
        const nameEl = editingRow.querySelector('.user-desc strong');
        const phoneEl = editingRow.querySelector('.contact-info span');
        const typeEl = editingRow.querySelector('.user-desc .text-sm');
        if (aptBadge) aptBadge.textContent = newApt;
        if (nameEl) nameEl.textContent = newName;
        if (phoneEl) phoneEl.textContent = newPhone;
        if (typeEl) typeEl.textContent = newType;
        closeEditModal();

        // --- Background: persist to Supabase ---
        const { error } = await window.supabaseClient
            .from('units')
            .update({ name: newName, apartment: newApt, phone: newPhone, type: newType })
            .eq('id', id);

        if (error) {
            alert('Error: ' + error.message);
            // Revert by re-fetching
            fetchResidents();
        }
    };

    [btnCloseEdit, btnCancelEdit].forEach(btn => {
        if (btn) btn.addEventListener('click', closeEditModal);
    });
    if (btnSaveEdit) btnSaveEdit.addEventListener('click', handleEditSave);

    const attachEditListeners = () => {
        document.querySelectorAll('.btn-edit-resident').forEach(btn => {
            btn.onclick = () => {
                const row = btn.closest('tr');
                if (row) openEditModal(row);
            };
        });
    };

    fetchResidents();
};

// Initial run
document.addEventListener('DOMContentLoaded', window.initResidents);
// SPA support
document.addEventListener('spa:pageLoaded', () => {
    if (window.location.pathname.includes('residents.html')) {
        window.initResidents();
    }
});
