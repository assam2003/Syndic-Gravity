window.initExpenses = () => {
    console.log("Initializing Expenses module...");
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
            if (textContent.includes(query)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
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
        // Remove existing cards but keep header if any
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
        let iconHtml = '';
        let iconClass = '';
        const cat = exp.category;
        
        if (cat === 'electricity') {
            iconHtml = '<i data-lucide="zap"></i>';
            iconClass = 'electricity';
        } else if (cat === 'cleaning') {
            iconHtml = '<i data-lucide="sparkles"></i>';
            iconClass = 'cleaning';
        } else if (cat === 'maintenance') {
            iconHtml = '<i data-lucide="wrench"></i>';
            iconClass = 'maintenance';
        } else {
            iconHtml = '<i data-lucide="file-text"></i>';
            iconClass = 'electricity';
        }

        const dateObj = new Date(exp.expense_date);
        const dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

        const div = document.createElement('div');
        div.className = 'expense-card';
        div.dataset.category = cat;
        div.dataset.id = exp.id;
        
        div.innerHTML = `
            <div class="expense-icon ${iconClass}">
                ${iconHtml}
            </div>
            <div class="expense-details">
                <div class="expense-title">${exp.title}</div>
                <div class="expense-meta">
                    <span><i data-lucide="calendar"></i> ${dateStr}</span>
                    <span><i data-lucide="building"></i> ${exp.provider || 'N/A'}</span>
                </div>
            </div>
            <div class="receipt-badge">
                <i data-lucide="file-check"></i> Reçu
            </div>
            <div class="expense-amount">- ${parseFloat(exp.amount).toFixed(2)} MAD</div>
            <div class="expense-actions admin-only">
                <button class="btn-icon-soft"><i data-lucide="more-vertical"></i></button>
            </div>
        `;
        return div;
    };

    // ═══════════════════════════════════════
    //  FILTER BUTTONS FUNCTIONALITY
    // ═══════════════════════════════════════
    let activeFilter = 'all';

    const filterButtons = document.querySelectorAll('.filter-btn');

    const applyFilter = (category) => {
        activeFilter = category;

        // Update active state
        filterButtons.forEach(btn => {
            if (btn.dataset.filter === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Show/hide expense cards
        expenseCards = document.querySelectorAll('.expense-card');
        expenseCards.forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    };

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            if (filter) {
                applyFilter(filter);
            }
        });
    });

    // --- Modal functionality ---
    const openModal = () => {
        if (userRole === 'syndic') {
            modal.classList.add('active');
            document.getElementById('expense-title').focus();
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

    // --- Handle Save to Supabase ---
    const handleSave = async (e) => {
        e.preventDefault();

        // Get values
        const title = document.getElementById('expense-title').value;
        const provider = document.getElementById('expense-provider').value;
        const category = document.getElementById('expense-category').value;
        const amount = document.getElementById('expense-amount').value;

        if (!title || !amount) {
            alert('Veuillez remplir le titre et le montant.');
            return;
        }

        const { data, error } = await window.supabaseClient
            .from('expenses')
            .insert([{ title, provider, category, amount: parseFloat(amount) }])
            .select();

        if (error) {
            alert('Error: ' + error.message);
            return;
        }

        const section = document.querySelector('.glass-panel:nth-of-type(2)');
        const newCard = createExpenseCard(data[0]);
        section.insertBefore(newCard, section.firstChild.nextSibling || section.firstChild);

        if (window.lucide) lucide.createIcons();
        expenseCards = document.querySelectorAll('.expense-card');
        applyFilter(activeFilter);
        closeModal();
    };

    // Initial fetch
    fetchExpenses();

    [btnSave, btnSaveAr].forEach(btn => {
        if (btn) btn.addEventListener('click', handleSave);
    });
};

// Handle load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initExpenses);
} else {
    window.initExpenses();
}

// SPA Hook
document.addEventListener('spa:pageLoaded', () => {
    if (document.getElementById('modal-add-expense')) {
        window.initExpenses();
    }
});

