document.addEventListener('DOMContentLoaded', () => {

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
        if (input) input.addEventListener('input', performSearch);
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
            document.getElementById('input-name').focus();
        }
    };

    const closeModal = () => {
        modal.classList.remove('active');
        form.reset();
    };

    if (btnAdd) btnAdd.addEventListener('click', openModal);
    
    [btnClose, btnCancel, btnCancelAr].forEach(btn => {
        if (btn) btn.addEventListener('click', closeModal);
    });

    // Close on overlay click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // --- Handle Save (Add New) ---
    const handleSave = async (e) => {
        e.preventDefault();

        // Get values
        const name = document.getElementById('input-name').value;
        const apt = document.getElementById('input-apt').value;
        const phone = document.getElementById('input-phone').value;
        const type = document.getElementById('input-type').value;

        if (!name || !apt) {
            alert('Veuillez remplir le nom et l\'appartement. / يرجى ملء الاسم والشقة.');
            return;
        }

        // --- Save to Supabase ---
        const { data, error } = await window.supabaseClient
            .from('units')
            .insert([
                { name, apartment: apt, phone, type, status: 'À jour' }
            ])
            .select();

        if (error) {
            alert('Error saving to Supabase: ' + error.message);
            return;
        }

        // --- Update UI ---
        const tbody = document.querySelector('.data-table tbody');
        const newRow = createResidentRow(data[0]);
        tbody.insertBefore(newRow, tbody.firstChild);

        // Re-init lucide icons
        if (window.lucide) lucide.createIcons();
        
        // Language sync
        const currentLang = localStorage.getItem('lang') || 'fr';
        if (currentLang === 'ar') {
            newRow.querySelectorAll('.lang-fr').forEach(el => el.classList.add('hidden'));
            newRow.querySelectorAll('.lang-ar').forEach(el => el.classList.remove('hidden'));
        }

        tableRows = document.querySelectorAll('.data-table tbody tr');
        attachEditListeners();
        closeModal();
    };

    // Fetch initial data
    fetchResidents();

    [btnSave, btnSaveAr].forEach(btn => {
        if (btn) btn.addEventListener('click', handleSave);
    });

    // ═══════════════════════════════════════
    //  EDIT MODAL FUNCTIONALITY
    // ═══════════════════════════════════════

    const openEditModal = (row) => {
        editingRow = row;

        // Extract current values from the row
        const aptBadge = row.querySelector('.apt-badge');
        const nameEl = row.querySelector('.user-desc strong');
        const typeEl = row.querySelector('.user-desc .text-sm');
        const phoneEl = row.querySelector('.contact-info span');

        // Fill edit form
        document.getElementById('edit-apt').value = aptBadge ? aptBadge.textContent.trim() : '';
        document.getElementById('edit-name').value = nameEl ? nameEl.textContent.trim() : '';
        
        // Extract phone number (remove the icon text)
        if (phoneEl) {
            const phoneText = phoneEl.textContent.trim();
            document.getElementById('edit-phone').value = phoneText;
        } else {
            document.getElementById('edit-phone').value = '';
        }

        // Set the type dropdown
        const typeSelect = document.getElementById('edit-type');
        if (typeEl) {
            const typeText = typeEl.textContent.trim();
            for (let i = 0; i < typeSelect.options.length; i++) {
                if (typeSelect.options[i].value === typeText || typeSelect.options[i].text === typeText) {
                    typeSelect.selectedIndex = i;
                    break;
                }
            }
        }

        // Show the modal
        editModal.classList.add('active');
        document.getElementById('edit-name').focus();

        // Apply current language to modal
        const currentLang = localStorage.getItem('lang') || 'fr';
        if (currentLang === 'ar') {
            editModal.querySelectorAll('.lang-fr').forEach(el => el.classList.add('hidden'));
            editModal.querySelectorAll('.lang-ar').forEach(el => el.classList.remove('hidden'));
        } else {
            editModal.querySelectorAll('.lang-ar').forEach(el => el.classList.add('hidden'));
            editModal.querySelectorAll('.lang-fr').forEach(el => el.classList.remove('hidden'));
        }

        if (window.lucide) lucide.createIcons();
    };

    const closeEditModal = () => {
        editModal.classList.remove('active');
        editForm.reset();
        editingRow = null;
    };

    const handleEditSave = async () => {
        if (!editingRow) return;

        const id = editingRow.dataset.id;
        const newName = document.getElementById('edit-name').value.trim();
        const newApt = document.getElementById('edit-apt').value.trim();
        const newPhone = document.getElementById('edit-phone').value.trim();
        const newType = document.getElementById('edit-type').value;

        if (!newName || !newApt) {
            alert('Veuillez remplir le nom et l\'appartement. / يرجى ملء الاسم والشقة.');
            return;
        }

        // --- Update Supabase ---
        const { error } = await window.supabaseClient
            .from('units')
            .update({ name: newName, apartment: newApt, phone: newPhone, type: newType })
            .eq('id', id);

        if (error) {
            alert('Error updating Supabase: ' + error.message);
            return;
        }

        // Update the row in place
        const aptBadge = editingRow.querySelector('.apt-badge');
        const nameEl = editingRow.querySelector('.user-desc strong');
        const typeEl = editingRow.querySelector('.user-desc .text-sm');
        const contactInfo = editingRow.querySelector('.contact-info');

        if (aptBadge) aptBadge.textContent = newApt;
        if (nameEl) nameEl.textContent = newName;
        if (typeEl) typeEl.textContent = newType;
        
        if (contactInfo) {
            const phoneSpan = contactInfo.querySelector('span');
            if (phoneSpan) {
                phoneSpan.innerHTML = `<i data-lucide="phone" class="icon-sm"></i> ${newPhone || '-'}`;
            }
        }

        // Add a brief highlight animation
        editingRow.style.transition = 'background 0.5s ease';
        editingRow.style.background = 'rgba(79, 70, 229, 0.15)';
        setTimeout(() => {
            editingRow.style.background = '';
        }, 1500);

        if (window.lucide) lucide.createIcons();
        closeEditModal();
    };

    // Close edit modal
    [btnCloseEdit, btnCancelEdit].forEach(btn => {
        if (btn) btn.addEventListener('click', closeEditModal);
    });

    // Save edit
    if (btnSaveEdit) btnSaveEdit.addEventListener('click', handleEditSave);

    // Close on overlay click
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                closeEditModal();
            }
        });
    }

    // Attach edit listeners to all edit buttons
    const attachEditListeners = () => {
        document.querySelectorAll('.btn-edit-resident').forEach(btn => {
            // Remove old listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', () => {
                const row = newBtn.closest('tr');
                if (row) openEditModal(row);
            });
        });

        // Re-init lucide icons for cloned buttons
        if (window.lucide) lucide.createIcons();
    };

    // Initial attachment
    attachEditListeners();
});
