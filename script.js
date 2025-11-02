document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const navbar = document.querySelector('.navbar');

    hamburgerMenu.addEventListener('click', () => {
        navbar.classList.toggle('active');
    });

    // Cierra el menú si se hace clic en un enlace (para móviles)
    const navLinks = document.querySelectorAll('.navbar a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navbar.classList.contains('active')) {
                navbar.classList.remove('active');
            }
        });
    });
});