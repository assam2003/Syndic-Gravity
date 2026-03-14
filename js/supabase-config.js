// Supabase Configuration
const supabaseUrl = 'https://qpirufuhgxppfqxtuixq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwaXJ1ZnVoZ3hwcGZxeHR1aXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDY2MDYsImV4cCI6MjA4OTA4MjYwNn0.mw1n7_Tu7qmRTK2UGWhar67HqicRi70qjMRiTjVnUA4';

// Initialize the Supabase client
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Export for use in other files
window.supabaseClient = _supabase;
