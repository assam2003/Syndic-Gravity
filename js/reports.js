document.addEventListener('DOMContentLoaded', () => {

    // Common Colors
    const primaryColor = '#4F46E5';
    const successColor = '#10B981';
    const warningColor = '#F59E0B';
    const dangerColor = '#EF4444';
    const diverseColor = '#8B5CF6';

    // Chart Options defaults for glassmorphism / dark mode compatibility
    Chart.defaults.color = '#94A3B8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    const evolutionCtx = document.getElementById('evolutionChart').getContext('2d');
    const breakdownCtx = document.getElementById('breakdownChart').getContext('2d');

    // 1. Bar Chart: Evolution
    const evolutionChart = new Chart(evolutionCtx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
            datasets: [
                {
                    label: 'Revenus',
                    data: [14200, 15000, 12400, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: successColor,
                    borderRadius: 4,
                },
                {
                    label: 'Dépenses',
                    data: [8500, 9200, 10700, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: dangerColor,
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });

    // 2. Doughnut Chart: Breakdown
    const breakdownChart = new Chart(breakdownCtx, {
        type: 'doughnut',
        data: {
            labels: ['Électricité & Eau', 'Nettoyage', 'Maintenance', 'Divers'],
            datasets: [{
                data: [12000, 4500, 8400, 3500],
                backgroundColor: [
                    warningColor, // Electricity
                    successColor, // Cleaning
                    primaryColor, // Maintenance
                    diverseColor  // Diverse
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            layout: {
                padding: {
                    bottom: 20
                }
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            }
        }
    });

    // Listen for language toggles to update labels inside chart if needed
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            // Need a slight timeout to let DOM update localStorage and language state
            setTimeout(() => {
                const currentLang = localStorage.getItem('lang') || 'fr';
                
                if (currentLang === 'ar') {
                    evolutionChart.data.labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                    evolutionChart.data.datasets[0].label = 'الإيرادات';
                    evolutionChart.data.datasets[1].label = 'المصروفات';

                    breakdownChart.data.labels = ['الماء والكهرباء', 'النظافة', 'الصيانة', 'متنوعات'];
                } else {
                    evolutionChart.data.labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
                    evolutionChart.data.datasets[0].label = 'Revenus';
                    evolutionChart.data.datasets[1].label = 'Dépenses';

                    breakdownChart.data.labels = ['Électricité & Eau', 'Nettoyage', 'Maintenance', 'Divers'];
                }

                evolutionChart.update();
                breakdownChart.update();

            }, 50);
        });
    }

    // Force language check on load for charts
    const initLang = localStorage.getItem('lang') || 'fr';
    if (initLang === 'ar') {
        evolutionChart.data.labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        evolutionChart.data.datasets[0].label = 'الإيرادات';
        evolutionChart.data.datasets[1].label = 'المصروفات';

        breakdownChart.data.labels = ['الماء والكهرباء', 'النظافة', 'الصيانة', 'متنوعات'];
        evolutionChart.update();
        breakdownChart.update();
    }
});
