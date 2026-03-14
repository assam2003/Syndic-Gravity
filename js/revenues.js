document.addEventListener('DOMContentLoaded', () => {

    const userRole = localStorage.getItem('userRole') || 'resident';

    // Search
    const searchInputs = [
        document.getElementById('search-input-fr'),
        document.getElementById('search-input-ar')
    ];
    let tableRows = document.querySelectorAll('#revenues-tbody tr');

    // Modals
    const modal = document.getElementById('modal-add-revenue');
    const inputApt = document.getElementById('rev-apt');
    const inputAmount = document.getElementById('rev-amount');

    // Buttons Close
    const btnClose = document.getElementById('btn-close-revenue');
    const btnCancel = document.getElementById('btn-cancel-revenue');
    const btnCancelAr = document.getElementById('btn-cancel-revenue-ar');
    
    // Button Save
    const btnSave = document.getElementById('btn-save-revenue');
    const btnSaveAr = document.getElementById('btn-save-revenue-ar');

    // State Tracking
    let currentRowToUpdate = null;

    // Search logic
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

        searchInputs.forEach(input => {
            if (input && input !== e.target) {
                input.value = e.target.value;
            }
        });
    };

    searchInputs.forEach(input => {
        if (input) input.addEventListener('input', performSearch);
    });

    // Opening Modal
    const openModal = (aptName, row) => {
        if (userRole === 'syndic') {
            currentRowToUpdate = row;
            inputApt.value = aptName;
            modal.classList.add('active');
            inputAmount.focus();
        }
    };

    const closeModal = () => {
        modal.classList.remove('active');
        document.getElementById('form-add-revenue').reset();
        currentRowToUpdate = null;
    };

    // Attach click event to Encasser buttons
    const attachPaymentButtons = () => {
        const payBtns = document.querySelectorAll('.mark-paid-btn');
        payBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tr = e.target.closest('tr');
                const aptName = tr.querySelector('.apt-badge').textContent.trim();
                openModal(aptName, tr);
            });
        });
    };
    attachPaymentButtons();

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

    // Save Payment Mock
    const handleSave = (e) => {
        e.preventDefault();
        
        if (!currentRowToUpdate) return;
        
        const amount = inputAmount.value;
        if (!amount || amount <= 0) {
            alert("Montant invalide");
            return;
        }

        // Generate date
        const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

        // Update the row DOM visually
        const statusCell = currentRowToUpdate.querySelector('td:nth-child(4)'); // 4th column is Status
        const actionCell = currentRowToUpdate.querySelector('.action-cell');

        // Swap Status Badge HTML
        statusCell.innerHTML = `
            <span class="badge paid lang-fr"><i data-lucide="check" style="width:12px; height:12px; display:inline-block; margin-right:4px;"></i> Payé le ${dateStr}</span>
            <span class="badge paid lang-ar hidden"><i data-lucide="check" style="width:12px; height:12px; display:inline-block; margin-left:4px;"></i> دُفِع في ${dateStr}</span>
        `;

        // Change Action button to Check and History
        actionCell.innerHTML = `
            <button class="btn-icon-soft" disabled style="opacity:0.5"><i data-lucide="check-circle-2"></i></button>
            <button class="btn-icon-soft" title="Historique"><i data-lucide="history"></i></button>
        `;
        actionCell.classList.remove('action-cell');

        // Fix language classes display
        const currentLang = localStorage.getItem('lang') || 'fr';
        if (currentLang === 'ar') {
            statusCell.querySelectorAll('.lang-fr').forEach(el => el.classList.add('hidden'));
            statusCell.querySelectorAll('.lang-ar').forEach(el => el.classList.remove('hidden'));
        }

        if (window.lucide) {
            lucide.createIcons();
        }

        closeModal();
    };

    [btnSave, btnSaveAr].forEach(btn => {
        if (btn) btn.addEventListener('click', handleSave);
    });

    // Alert Reminder Button
    const btnRemind = document.getElementById('btn-remind-all');
    if (btnRemind) {
        btnRemind.addEventListener('click', () => {
            const currentLang = localStorage.getItem('lang') || 'fr';
            alert(currentLang === 'fr' ? 'Rappels envoyés aux 1 retardataires avec succès !' : 'تم إرسال تذكير إلى 1 شخص متأخر بنجاح!');
            btnRemind.style.opacity = '0.5';
            btnRemind.disabled = true;
        });
    }
});
