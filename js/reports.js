window.initReports = async () => {
    // Common Colors
    const primaryColor = '#4F46E5';
    const successColor = '#10B981';
    const warningColor = '#F59E0B';
    const dangerColor = '#EF4444';
    const diverseColor = '#8B5CF6';

    const evolutionCanvas = document.getElementById('evolutionChart');
    const breakdownCanvas = document.getElementById('breakdownChart');

    if (!evolutionCanvas || !breakdownCanvas) return;

    // Destroy existing charts if they exist to prevent memory leaks and canvas reuse errors
    if (window.evolutionChartInstance) window.evolutionChartInstance.destroy();
    if (window.breakdownChartInstance) window.breakdownChartInstance.destroy();

    Chart.defaults.color = '#94A3B8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    const evolutionCtx = evolutionCanvas.getContext('2d');
    const breakdownCtx = breakdownCanvas.getContext('2d');

    // --- Fetch LIVE data from Supabase ---
    const currentYear = new Date().getFullYear();

    // Fetch payments (revenues) for the current year
    const { data: payments } = await window.supabaseClient
        .from('payments')
        .select('amount_paid, payment_date')
        .gte('payment_date', `${currentYear}-01-01`)
        .lte('payment_date', `${currentYear}-12-31`);

    // Fetch expenses for the current year
    const { data: expenses } = await window.supabaseClient
        .from('expenses')
        .select('amount, category, expense_date')
        .gte('expense_date', `${currentYear}-01-01`)
        .lte('expense_date', `${currentYear}-12-31`);

    // --- Build monthly revenue/expense arrays ---
    const monthlyRevenues = new Array(12).fill(0);
    const monthlyExpenses = new Array(12).fill(0);

    (payments || []).forEach(p => {
        const month = new Date(p.payment_date).getMonth(); // 0-11
        monthlyRevenues[month] += parseFloat(p.amount_paid) || 0;
    });

    (expenses || []).forEach(e => {
        const month = new Date(e.expense_date).getMonth();
        monthlyExpenses[month] += parseFloat(e.amount) || 0;
    });

    // --- Build expense category breakdown ---
    const categoryMap = { electricity: 0, cleaning: 0, maintenance: 0, diverse: 0 };
    (expenses || []).forEach(e => {
        const cat = e.category || 'diverse';
        categoryMap[cat] = (categoryMap[cat] || 0) + (parseFloat(e.amount) || 0);
    });

    // --- Update KPI cards with live data ---
    const totalRevenues = monthlyRevenues.reduce((a, b) => a + b, 0);
    const totalExpenses = monthlyExpenses.reduce((a, b) => a + b, 0);
    const netBalance = totalRevenues - totalExpenses;

    // Fetch total units for recovery rate
    const { data: units } = await window.supabaseClient.from('units').select('id');
    const totalUnits = (units || []).length;
    const monthlyFee = 400; // default monthly fee
    const expectedYTD = totalUnits * monthlyFee * (new Date().getMonth() + 1);
    const recoveryRate = expectedYTD > 0 ? ((totalRevenues / expectedYTD) * 100).toFixed(1) : 0;

    // Update KPI DOM elements if they exist
    const kpiValues = document.querySelectorAll('.kpi-value');
    if (kpiValues.length >= 4) {
        kpiValues[0].innerHTML = `+${totalRevenues.toLocaleString('fr-FR')} <span style="font-size:0.9rem; opacity:0.7">MAD</span>`;
        kpiValues[1].innerHTML = `-${totalExpenses.toLocaleString('fr-FR')} <span style="font-size:0.9rem; opacity:0.7">MAD</span>`;
        kpiValues[2].innerHTML = `${netBalance >= 0 ? '+' : ''}${netBalance.toLocaleString('fr-FR')} <span style="font-size:0.9rem; opacity:0.7">MAD</span>`;
        kpiValues[3].innerHTML = `${recoveryRate} <span style="font-size:0.9rem; opacity:0.7">%</span>`;
    }

    // 1. Bar Chart: Evolution — now with LIVE data
    window.evolutionChartInstance = new Chart(evolutionCtx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
            datasets: [
                {
                    label: 'Revenus',
                    data: monthlyRevenues,
                    backgroundColor: successColor,
                    borderRadius: 4,
                },
                {
                    label: 'Dépenses',
                    data: monthlyExpenses,
                    backgroundColor: dangerColor,
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
                tooltip: { mode: 'index', intersect: false },
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // 2. Doughnut Chart: Breakdown — now with LIVE data
    window.breakdownChartInstance = new Chart(breakdownCtx, {
        type: 'doughnut',
        data: {
            labels: ['Électricité & Eau', 'Nettoyage', 'Maintenance', 'Divers'],
            datasets: [{
                data: [categoryMap.electricity, categoryMap.cleaning, categoryMap.maintenance, categoryMap.diverse],
                backgroundColor: [warningColor, successColor, primaryColor, diverseColor],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            layout: { padding: { bottom: 20 } },
            plugins: {
                legend: { position: 'right', labels: { usePointStyle: true, padding: 20 } }
            }
        }
    });

    // Update charts based on current language
    const updateChartLang = () => {
        const currentLang = localStorage.getItem('lang') || 'fr';
        if (currentLang === 'ar') {
            window.evolutionChartInstance.data.labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
            window.evolutionChartInstance.data.datasets[0].label = 'الإيرادات';
            window.evolutionChartInstance.data.datasets[1].label = 'المصروفات';
            window.breakdownChartInstance.data.labels = ['الماء والكهرباء', 'النظافة', 'الصيانة', 'متنوعات'];
        } else {
            window.evolutionChartInstance.data.labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            window.evolutionChartInstance.data.datasets[0].label = 'Revenus';
            window.evolutionChartInstance.data.datasets[1].label = 'Dépenses';
            window.breakdownChartInstance.data.labels = ['Électricité & Eau', 'Nettoyage', 'Maintenance', 'Divers'];
        }
        window.evolutionChartInstance.update();
        window.breakdownChartInstance.update();
    };

    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.removeEventListener('click', updateChartLang);
        langBtn.addEventListener('click', () => setTimeout(updateChartLang, 50));
    }

    updateChartLang();
};

document.addEventListener('DOMContentLoaded', window.initReports);
document.addEventListener('spa:pageLoaded', () => {
    if (window.location.pathname.includes('reports.html')) {
        window.initReports();
    }
});
