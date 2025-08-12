// static/js/app.js
document.addEventListener('DOMContentLoaded', function() {
    // Find the Add Flight button in the footer
    const addFlightFab = document.querySelector('#add-flight-fab');

    if (addFlightFab) {
        addFlightFab.addEventListener('click', () => {
            const url = addFlightFab.getAttribute('data-url');
            if (url) {
                window.location.href = url;
            }
        });
    }
});