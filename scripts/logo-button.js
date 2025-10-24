document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('logo-btn');
    const sidebar = document.getElementById('chat-list-sidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }
});
