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

    // --- Supabase Integration ---
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    const fetchCotisations = async () => {
        // Fetch residents and their cotisations for current month/year
        const { data: residents, error: resError } = await window.supabaseClient
            .from('residents')
            .select(`
                id,
                name,
                apartment,
                cotisations (
                    amount_paid,
                    is_paid,
                    payment_date
                )
            `)
            .eq('cotisations.month', currentMonth)
            .eq('cotisations.year', currentYear);

        if (resError) {
            console.error('Error:', resError);
            return;
        }

        renderRevenues(residents);
    };

    const renderRevenues = (residents) => {
        const tbody = document.getElementById('revenues-tbody');
        tbody.innerHTML = '';

        residents.forEach(res => {
            const cot = res.cotisations && res.cotisations[0];
            const isPaid = cot ? cot.is_paid : false;
            const payDate = cot && cot.payment_date ? new Date(cot.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '';

            const tr = document.createElement('tr');
            tr.dataset.id = res.id;
            tr.innerHTML = `
                <td>
                    <div class="apt-badge">${res.apartment}</div>
                </td>
                <td>
                    <div class="user-desc">
                        <strong>${res.name}</strong>
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

    // Save Payment to Supabase
    const handleSave = async (e) => {
        e.preventDefault();
        
        if (!currentRowToUpdate) return;
        
        const amount = inputAmount.value;
        const residentId = currentRowToUpdate.dataset.id;
        
        if (!amount || amount <= 0) {
            alert("Montant invalide");
            return;
        }

        const { error } = await window.supabaseClient
            .from('cotisations')
            .upsert({
                resident_id: residentId,
                month: currentMonth,
                year: currentYear,
                amount_paid: parseFloat(amount),
                is_paid: true,
                payment_date: new Date().toISOString()
            }, { onConflict: 'resident_id, month, year' });

        if (error) {
            alert('Error: ' + error.message);
            return;
        }

        fetchCotisations(); // Refresh list
        closeModal();
    };

    // Initial fetch
    fetchCotisations();

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
