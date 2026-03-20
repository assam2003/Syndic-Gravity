window.initExpenses = () => {
    const userRole = localStorage.getItem('userRole') || 'resident';

    // --- DOM Elements for Search ---
    const searchInputs = [
        document.getElementById('search-input-fr'),
        document.getElementById('search-input-ar')
    ];
    let expenseCards = document.querySelectorAll('.expense-card');

    // --- DOM Elements for Modal ---
    const btnAdd = document.getElementById('btn-add-expense');
    const modal = document.getElementById('modal-add-expense');
    
    if (!modal && !document.querySelector('.expense-card') && !document.querySelector('.glass-panel:nth-of-type(2)')) return;

    // Closer buttons
    const btnClose = document.getElementById('btn-close-expense');
    const btnCancel = document.getElementById('btn-cancel-expense');
    const btnCancelAr = document.getElementById('btn-cancel-expense-ar');
    
    // Save buttons
    const btnSave = document.getElementById('btn-save-expense');
    const btnSaveAr = document.getElementById('btn-save-expense-ar');

    const form = document.getElementById('form-add-expense');

    // --- Search functionality ---
    const performSearch = (e) => {
        const query = e.target.value.toLowerCase();
        expenseCards.forEach(card => {
            const textContent = card.textContent.toLowerCase();
            card.style.display = textContent.includes(query) ? 'flex' : 'none';
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
    const fetchExpenses = async () => {
        const { data, error } = await window.supabaseClient
            .from('expenses')
            .select('*')
            .order('expense_date', { ascending: false });

        if (error) {
            console.error('Error fetching expenses:', error);
            return;
        }

        renderExpenses(data);
    };

    const renderExpenses = (expenses) => {
        const section = document.querySelector('.glass-panel:nth-of-type(2)');
        if (!section) return;
        
        const existingCards = section.querySelectorAll('.expense-card');
        existingCards.forEach(c => c.remove());

        expenses.forEach(exp => {
            const card = createExpenseCard(exp);
            section.appendChild(card);
        });

        expenseCards = document.querySelectorAll('.expense-card');
        applyFilter(activeFilter);
        
        if (window.lucide) lucide.createIcons();
    };

    const createExpenseCard = (exp) => {
        let iconHtml = '<i data-lucide="file-text"></i>';
        let iconClass = 'electricity';
        const cat = exp.category;
        
        if (cat === 'electricity') { iconHtml = '<i data-lucide="zap"></i>'; iconClass = 'electricity'; }
        else if (cat === 'cleaning') { iconHtml = '<i data-lucide="sparkles"></i>'; iconClass = 'cleaning'; }
        else if (cat === 'maintenance') { iconHtml = '<i data-lucide="wrench"></i>'; iconClass = 'maintenance'; }

        const dateObj = new Date(exp.expense_date);
        const dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

        const div = document.createElement('div');
        div.className = 'expense-card';
        div.dataset.category = cat;
        div.dataset.id = exp.id;
        
        div.innerHTML = `
            <div class="expense-icon ${iconClass}">${iconHtml}</div>
            <div class="expense-details">
                <div class="expense-title">${exp.title}</div>
                <div class="expense-meta">
                    <span><i data-lucide="calendar"></i> ${dateStr}</span>
                    <span><i data-lucide="building"></i> ${exp.provider || 'N/A'}</span>
                </div>
            </div>
            <div class="receipt-badge"><i data-lucide="file-check"></i> Reçu</div>
            <div class="expense-amount">- ${parseFloat(exp.amount).toFixed(2)} MAD</div>
            <div class="expense-actions admin-only">
                <button class="btn-icon-soft"><i data-lucide="more-vertical"></i></button>
            </div>
        `;
        return div;
    };

    let activeFilter = 'all';
    const filterButtons = document.querySelectorAll('.filter-btn');

    const applyFilter = (category) => {
        activeFilter = category;
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === category);
        });

        expenseCards = document.querySelectorAll('.expense-card');
        expenseCards.forEach(card => {
            card.style.display = (category === 'all' || card.dataset.category === category) ? 'flex' : 'none';
        });
    };

    filterButtons.forEach(btn => {
        btn.onclick = () => applyFilter(btn.dataset.filter);
    });

    const openModal = () => {
        if (userRole === 'syndic' && modal) {
            modal.classList.add('active');
            const titleInput = document.getElementById('expense-title');
            if (titleInput) titleInput.focus();
        }
    };

    const closeModal = () => {
        if (modal) {
            modal.classList.remove('active');
            if (form) form.reset();
        }
    };

    if (btnAdd) btnAdd.onclick = openModal;
    [btnClose, btnCancel, btnCancelAr].forEach(btn => {
        if (btn) btn.onclick = closeModal;
    });

    const handleSave = async (e) => {
        e.preventDefault();
        const title = document.getElementById('expense-title').value;
        const provider = document.getElementById('expense-provider').value;
        const category = document.getElementById('expense-category').value;
        const amount = document.getElementById('expense-amount').value;

        if (!title || !amount) {
            alert('Veuillez remplir le titre et le montant.');
            return;
        }

        // --- Optimistic UI: add card immediately ---
        const tempExpense = {
            id: 'temp-' + Date.now(),
            title,
            provider,
            category,
            amount: parseFloat(amount),
            expense_date: new Date().toISOString()
        };
        const section = document.querySelector('.glass-panel:nth-of-type(2)');
        if (section) {
            const card = createExpenseCard(tempExpense);
            section.appendChild(card);
            if (window.lucide) lucide.createIcons();
        }
        closeModal();

        // --- Background: persist to Supabase ---
        const { data, error } = await window.supabaseClient
            .from('expenses')
            .insert([{ title, provider, category, amount: parseFloat(amount) }])
            .select();

        if (error) {
            alert('Error: ' + error.message);
        }

        // Re-sync from Supabase
        fetchExpenses();
    };

    if (btnSave) btnSave.onclick = handleSave;
    if (btnSaveAr) btnSaveAr.onclick = handleSave;

    fetchExpenses();
};

document.addEventListener('DOMContentLoaded', window.initExpenses);
document.addEventListener('spa:pageLoaded', () => {
    if (window.location.pathname.includes('expenses.html')) {
        window.initExpenses();
    }
});

