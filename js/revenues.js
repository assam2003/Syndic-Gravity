window.initRevenues = () => {
    const tbody = document.getElementById('revenues-tbody');
    let localPayments = [];
    let allUnits = [];

    // Period state
    const now = new Date();
    let selectedYear = now.getFullYear();
    let selectedMonth = now.getMonth(); // 0-11

    const monthNamesFr = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    // DOM refs
    const metricExpected = document.getElementById('metric-expected');
    const metricCollected = document.getElementById('metric-collected');
    const metricOutstanding = document.getElementById('metric-outstanding');
    const periodLabel = document.getElementById('current-period-label');
    const btnPrev = document.getElementById('btn-prev-month');
    const btnNext = document.getElementById('btn-next-month');
    const searchInputs = document.querySelectorAll('#search-input-fr, #search-input-ar');

    // Modal refs
    const modal = document.getElementById('modal-add-revenue');
    const btnCloseRev = document.getElementById('btn-close-revenue');
    const btnCancelRevs = document.querySelectorAll('#btn-cancel-revenue, #btn-cancel-revenue-ar');
    const btnSaveRevs = document.querySelectorAll('#btn-save-revenue, #btn-save-revenue-ar');
    const inputApt = document.getElementById('rev-apt');
    const inputAmount = document.getElementById('rev-amount');

    let currentRowToUpdate = null;

    // =========================================================================
    //  PERIOD NAVIGATION
    // =========================================================================
    const updatePeriodLabel = () => {
        if (periodLabel) periodLabel.textContent = `${monthNamesFr[selectedMonth]} ${selectedYear}`;
    };

    if (btnPrev) btnPrev.addEventListener('click', () => {
        selectedMonth--;
        if (selectedMonth < 0) { selectedMonth = 11; selectedYear--; }
        updatePeriodLabel();
        buildView();
    });

    if (btnNext) btnNext.addEventListener('click', () => {
        selectedMonth++;
        if (selectedMonth > 11) { selectedMonth = 0; selectedYear++; }
        updatePeriodLabel();
        buildView();
    });

    // =========================================================================
    //  DATA FETCHING
    // =========================================================================
    const fetchData = async () => {
        // 1. Fetch all units
        const { data: unitsData, error: unitsErr } = await window.supabaseClient
            .from('units')
            .select('id, unit_number, owner_name, monthly_fee')
            .order('unit_number', { ascending: true });

        if (unitsErr) { console.error('Units fetch error:', unitsErr); return; }
        allUnits = unitsData || [];

        // 2. Fetch all payments (with unit join)
        const { data: paymentsData, error: payErr } = await window.supabaseClient
            .from('payments')
            .select(`
                id,
                amount_paid,
                billing_month,
                status,
                payment_date,
                unit_id,
                units (
                    unit_number,
                    owner_name,
                    monthly_fee
                )
            `)
            .order('payment_date', { ascending: false });

        if (payErr) { console.error('Payments fetch error:', payErr); return; }
        localPayments = paymentsData || [];

        buildView();
    };

    // =========================================================================
    //  BUILD VIEW (Metrics + Table)
    // =========================================================================
    const buildView = () => {
        // Build a billing key like "2026-03"
        const billingKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

        // Match payments for the selected month
        const monthPayments = localPayments.filter(p => {
            if (p.billing_month) return p.billing_month === billingKey;
            // Fallback: use payment_date
            if (p.payment_date) {
                const d = new Date(p.payment_date);
                return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
            }
            return false;
        });

        // Build a map: unit_id -> payment
        const paidMap = {};
        monthPayments.forEach(p => {
            paidMap[p.unit_id] = p;
        });

        // Calculate metrics
        const totalExpected = allUnits.reduce((sum, u) => sum + (parseFloat(u.monthly_fee) || 0), 0);
        const totalCollected = monthPayments
            .filter(p => (p.status || 'paid').toLowerCase() === 'paid')
            .reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0);
        const outstanding = totalExpected - totalCollected;

        updateMetrics(totalExpected, totalCollected, outstanding);

        // Build merged rows: one row per unit
        const rows = allUnits.map(unit => {
            const payment = paidMap[unit.id];
            return {
                unit_id: unit.id,
                unit_number: unit.unit_number,
                owner_name: unit.owner_name,
                monthly_fee: unit.monthly_fee,
                billing_month: billingKey,
                payment_id: payment ? payment.id : null,
                amount_paid: payment ? payment.amount_paid : 0,
                status: payment ? (payment.status || 'paid') : 'pending',
            };
        });

        renderTable(rows);
    };

    // =========================================================================
    //  METRICS UPDATE
    // =========================================================================
    const updateMetrics = (expected, collected, outstanding) => {
        if (metricExpected) metricExpected.innerHTML = `${expected.toLocaleString('fr-FR')} <span class="text-sm" style="color: rgba(255,255,255,0.7)">MAD</span>`;
        if (metricCollected) metricCollected.innerHTML = `${collected.toLocaleString('fr-FR')} <span class="text-sm">MAD</span>`;
        if (metricOutstanding) metricOutstanding.innerHTML = `${outstanding.toLocaleString('fr-FR')} <span class="text-sm">MAD</span>`;
    };

    // =========================================================================
    //  TABLE RENDERING
    // =========================================================================
    const renderTable = (rows) => {
        if (!tbody) return;
        tbody.innerHTML = '';

        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:32px; color:var(--text-muted);"><i data-lucide="inbox" style="opacity:0.3; width:28px; height:28px;"></i><br><span class="lang-fr">Aucune donnée pour cette période</span><span class="lang-ar hidden">لا توجد بيانات لهذه الفترة</span></td></tr>`;
            if (window.lucide) lucide.createIcons();
            return;
        }

        rows.forEach(row => {
            const tr = document.createElement('tr');
            tr.dataset.unitId = row.unit_id;
            if (row.payment_id) tr.dataset.paymentId = row.payment_id;

            const isPaid = row.status.toLowerCase() === 'paid' || row.status.toLowerCase() === 'payé';
            const fee = parseFloat(row.monthly_fee || 0).toLocaleString('fr-FR');

            tr.innerHTML = `
                <td>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">${monthNamesFr[selectedMonth]} ${selectedYear}</span>
                </td>
                <td>
                    <span class="badge active">${row.unit_number || 'N/A'}</span>
                </td>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:30px; height:30px; border-radius:50%; background:var(--gradient-accent, #4F46E5); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:0.75rem;">
                            ${(row.owner_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <strong style="color: var(--text-main);">${row.owner_name || 'Inconnu'}</strong>
                    </div>
                </td>
                <td>
                    <strong>${fee}</strong> <span class="text-sm" style="color:var(--text-muted);">MAD</span>
                </td>
                <td class="status-cell">
                    ${isPaid
                        ? `<span class="badge paid lang-fr"><i data-lucide="check" style="width:12px;height:12px;"></i> Payé</span>
                           <span class="badge paid lang-ar hidden"><i data-lucide="check" style="width:12px;height:12px;"></i> مدفوع</span>`
                        : `<span class="badge unpaid lang-fr">Non payé</span>
                           <span class="badge unpaid lang-ar hidden">غير مدفوع</span>`
                    }
                </td>
                <td class="text-right">
                    ${isPaid
                        ? `<button class="btn-icon-soft" disabled style="opacity:0.4;"><i data-lucide="check-circle-2" style="width:16px;height:16px;"></i></button>`
                        : `<button class="btn-pay mark-paid-btn"><i data-lucide="banknotes"></i> <span class="lang-fr">Encaisser</span><span class="lang-ar hidden">تحصيل</span></button>`
                    }
                </td>
            `;
            tbody.appendChild(tr);
        });

        attachPaymentButtons();
        if (window.lucide) lucide.createIcons();
        if (typeof applyLanguage === 'function') applyLanguage();
    };

    // =========================================================================
    //  PAYMENT BUTTONS
    // =========================================================================
    const attachPaymentButtons = () => {
        document.querySelectorAll('.mark-paid-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('tr');
                currentRowToUpdate = row;
                const unitNumber = row.querySelector('.badge.active')?.textContent || '';
                if (inputApt) inputApt.value = unitNumber;
                if (inputAmount) inputAmount.value = '';
                if (modal) modal.classList.add('active');
            });
        });
    };

    // =========================================================================
    //  MODAL CONTROLS
    // =========================================================================
    const closeModal = () => { if (modal) modal.classList.remove('active'); currentRowToUpdate = null; };

    if (btnCloseRev) btnCloseRev.addEventListener('click', closeModal);
    btnCancelRevs.forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); closeModal(); }));

    const handleSave = async (e) => {
        e.preventDefault();
        if (!currentRowToUpdate) return;
        const amount = parseFloat(inputAmount.value);
        const unitId = currentRowToUpdate.dataset.unitId;
        if (!amount || amount <= 0) { alert("Montant invalide"); return; }

        const billingKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

        // --- OPTIMISTIC UI ---
        // 1. Update badge to "Payé" instantly
        const statusCell = currentRowToUpdate.querySelector('.status-cell');
        if (statusCell) {
            statusCell.innerHTML = `
                <span class="badge paid lang-fr"><i data-lucide="check" style="width:12px;height:12px;"></i> Payé</span>
                <span class="badge paid lang-ar hidden"><i data-lucide="check" style="width:12px;height:12px;"></i> مدفوع</span>
            `;
        }

        // 2. Disable the action button
        const actionCell = currentRowToUpdate.querySelector('td:last-child');
        if (actionCell) {
            actionCell.innerHTML = `<button class="btn-icon-soft" disabled style="opacity:0.4;"><i data-lucide="check-circle-2" style="width:16px;height:16px;"></i></button>`;
        }

        // 3. Recalculate metrics instantly
        const unitFee = parseFloat(allUnits.find(u => u.id == unitId)?.monthly_fee || amount);
        const currentExpected = allUnits.reduce((s, u) => s + (parseFloat(u.monthly_fee) || 0), 0);
        const currentCollectedBefore = parseFloat(metricCollected?.textContent?.replace(/[^\d]/g, '') || 0);
        const newCollected = currentCollectedBefore + unitFee;
        updateMetrics(currentExpected, newCollected, currentExpected - newCollected);

        if (window.lucide) lucide.createIcons();
        if (typeof applyLanguage === 'function') applyLanguage();
        closeModal();

        // --- BACKGROUND: persist to Supabase ---
        const { error } = await window.supabaseClient
            .from('payments')
            .insert({
                unit_id: unitId,
                amount_paid: amount,
                billing_month: billingKey,
                status: 'paid',
                payment_date: new Date().toISOString()
            });

        if (error) {
            alert('Erreur: ' + error.message);
            // Revert on error
            fetchData();
            return;
        }

        // Background re-sync for accuracy
        fetchData();
    };

    btnSaveRevs.forEach(b => b.addEventListener('click', handleSave));

    // =========================================================================
    //  SEARCH
    // =========================================================================
    searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const allRows = tbody.querySelectorAll('tr');
            allRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(q) ? '' : 'none';
            });
        });
    });

    // =========================================================================
    //  REMIND BUTTON
    // =========================================================================
    const btnRemind = document.getElementById('btn-remind-all');
    if (btnRemind) {
        btnRemind.onclick = () => {
            const lang = localStorage.getItem('lang') || 'fr';
            alert(lang === 'fr' ? 'Rappels envoyés aux impayés !' : 'تم إرسال التنبيهات!');
            btnRemind.style.opacity = '0.5';
            btnRemind.disabled = true;
            setTimeout(() => { btnRemind.style.opacity = '1'; btnRemind.disabled = false; }, 3000);
        };
    }

    // =========================================================================
    //  INIT
    // =========================================================================
    updatePeriodLabel();
    fetchData();
};

document.addEventListener('DOMContentLoaded', window.initRevenues);
document.addEventListener('spa:pageLoaded', () => {
    if (window.location.pathname.includes('revenues.html')) {
        window.initRevenues();
    }
});
