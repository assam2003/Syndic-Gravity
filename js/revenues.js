window.initRevenues = () => {
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

    if (!modal && !document.getElementById('revenues-tbody')) return;

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
        if (input) {
            input.removeEventListener('input', performSearch);
            input.addEventListener('input', performSearch);
        }
    });

    // --- Supabase Integration ---
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    const fetchCotisations = async () => {
        const { data: unitsData, error: resError } = await window.supabaseClient
            .from('units')
            .select(`
                id,
                unit_number,
                resident_email,
                payments (
                    amount_paid,
                    payment_date
                )
            `);

        if (resError) {
            console.error('Error:', resError);
            return;
        }

        renderRevenues(unitsData);
        updateSummaryCards(unitsData);
    };

    const renderRevenues = (unitsData) => {
        const tbody = document.getElementById('revenues-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        unitsData.forEach(res => {
            const currentMonthPayments = res.payments ? res.payments.filter(p => {
                const pd = new Date(p.payment_date);
                return pd.getMonth() + 1 === currentMonth && pd.getFullYear() === currentYear;
            }) : [];
            
            const cot = currentMonthPayments[0];
            const isPaid = !!cot;
            const payDate = cot && cot.payment_date ? new Date(cot.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '';

            const tr = document.createElement('tr');
            tr.dataset.id = res.id;
            tr.innerHTML = `
                <td>
                    <div class="apt-badge">${res.unit_number || '?'}</div>
                </td>
                <td>
                    <div class="user-desc">
                        <strong>${res.resident_email ? 'Occupé' : '<span style="color:var(--text-muted); font-style:italic;">Vacant</span>'}</strong>
                    </div>
                </td>
                <td>400 MAD</td>
                <td>
                    ${isPaid ? `
                        <span class="badge paid lang-fr"><i data-lucide="check" class="icon-xs"></i> Payé le ${payDate}</span>
                        <span class="badge paid lang-ar hidden"><i data-lucide="check" class="icon-xs"></i> دُفِع في ${payDate}</span>
                    ` : `
                        <span class="badge pending lang-fr">Non payé</span>
                        <span class="badge pending lang-ar hidden">غير مدفوع</span>
                    `}
                </td>
                <td class="${isPaid ? '' : 'action-cell'} text-right admin-only">
                    ${isPaid ? `
                        <button class="btn-icon-soft" disabled style="opacity:0.5"><i data-lucide="check-circle-2"></i></button>
                        <button class="btn-icon-soft" title="Historique"><i data-lucide="history"></i></button>
                    ` : `
                        <button class="btn-primary-soft mark-paid-btn lang-fr">Encaisser</button>
                        <button class="btn-primary-soft mark-paid-btn lang-ar hidden">تحصيل</button>
                    `}
                </td>
            `;
            tbody.appendChild(tr);
        });

        tableRows = document.querySelectorAll('#revenues-tbody tr');
        attachPaymentButtons();
        
        // Language sync
        const currentLang = localStorage.getItem('lang') || 'fr';
        if (currentLang === 'ar') {
            tbody.querySelectorAll('.lang-fr').forEach(el => el.classList.add('hidden'));
            tbody.querySelectorAll('.lang-ar').forEach(el => el.classList.remove('hidden'));
        }

        if (window.lucide) lucide.createIcons();
    };

    const openModal = (aptName, row) => {
        if (userRole === 'syndic') {
            currentRowToUpdate = row;
            if (inputApt) inputApt.value = aptName;
            if (modal) modal.classList.add('active');
            if (inputAmount) inputAmount.focus();
        }
    };

    const closeModal = () => {
        if (modal) modal.classList.remove('active');
        const revForm = document.getElementById('form-add-revenue');
        if (revForm) revForm.reset();
        currentRowToUpdate = null;
    };

    const attachPaymentButtons = () => {
        document.querySelectorAll('.mark-paid-btn').forEach(btn => {
            btn.onclick = (e) => {
                const tr = e.target.closest('tr');
                const aptName = tr.querySelector('.apt-badge').textContent.trim();
                openModal(aptName, tr);
            };
        });
    };

    [btnClose, btnCancel, btnCancelAr].forEach(btn => {
        if (btn) btn.addEventListener('click', closeModal);
    });

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    const updateSummaryCards = (unitsData) => {
        const monthlyFee = 400;
        const totalExpected = (unitsData || []).length * monthlyFee;
        let totalCollected = 0;

        (unitsData || []).forEach(res => {
            const currentMonthPayments = res.payments ? res.payments.filter(p => {
                const pd = new Date(p.payment_date);
                return pd.getMonth() + 1 === currentMonth && pd.getFullYear() === currentYear;
            }) : [];
            if (currentMonthPayments.length > 0) {
                totalCollected += parseFloat(currentMonthPayments[0].amount_paid) || monthlyFee;
            }
        });

        const remaining = totalExpected - totalCollected;

        // Update the summary card values in the DOM
        const summaryVals = document.querySelectorAll('.summary-val');
        if (summaryVals.length >= 3) {
            summaryVals[0].innerHTML = `${totalExpected.toLocaleString('fr-FR')} <span class="text-sm" style="color: rgba(255,255,255,0.7)">MAD</span>`;
            summaryVals[1].innerHTML = `${totalCollected.toLocaleString('fr-FR')} <span class="text-sm">MAD</span>`;
            summaryVals[2].innerHTML = `${remaining.toLocaleString('fr-FR')} <span class="text-sm">MAD</span>`;
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!currentRowToUpdate) return;
        const amount = inputAmount.value;
        const residentId = currentRowToUpdate.dataset.id;
        if (!amount || amount <= 0) {
            alert("Montant invalide");
            return;
        }

        // --- Optimistic UI: update the row immediately ---
        const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        const statusCell = currentRowToUpdate.querySelector('td:nth-child(4)');
        const actionCell = currentRowToUpdate.querySelector('td:nth-child(5)');
        if (statusCell) {
            statusCell.innerHTML = `
                <span class="badge paid lang-fr"><i data-lucide="check" class="icon-xs"></i> Payé le ${today}</span>
                <span class="badge paid lang-ar hidden"><i data-lucide="check" class="icon-xs"></i> دُفِع في ${today}</span>
            `;
        }
        if (actionCell) {
            actionCell.innerHTML = `
                <button class="btn-icon-soft" disabled style="opacity:0.5"><i data-lucide="check-circle-2"></i></button>
                <button class="btn-icon-soft" title="Historique"><i data-lucide="history"></i></button>
            `;
        }
        if (window.lucide) lucide.createIcons();
        closeModal();

        // --- Background: persist to Supabase ---
        const { error } = await window.supabaseClient
            .from('payments')
            .insert({
                unit_id: residentId,
                amount_paid: parseFloat(amount),
                payment_date: new Date().toISOString()
            });

        if (error) {
            alert('Error: ' + error.message);
            // Revert by re-fetching
            fetchCotisations();
            return;
        }

        // Background re-sync to keep summary cards accurate
        fetchCotisations();
    };

    if (btnSave) btnSave.addEventListener('click', handleSave);
    if (btnSaveAr) btnSaveAr.addEventListener('click', handleSave);

    const btnRemind = document.getElementById('btn-remind-all');
    if (btnRemind) {
        btnRemind.onclick = () => {
            const currentLang = localStorage.getItem('lang') || 'fr';
            alert(currentLang === 'fr' ? 'Rappels envoyés !' : 'تم إرسال التنبيهات!');
            btnRemind.style.opacity = '0.5';
            btnRemind.disabled = true;
        };
    }

    fetchCotisations();
};

document.addEventListener('DOMContentLoaded', window.initRevenues);
document.addEventListener('spa:pageLoaded', () => {
    if (window.location.pathname.includes('revenues.html')) {
        window.initRevenues();
    }
});
