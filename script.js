document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const navbar = document.querySelector('.navbar');

    // Evento para mostrar/ocultar el menú al hacer clic en el ícono
    hamburgerMenu.addEventListener('click', () => {
        navbar.classList.toggle('active');
    });

    // Opcional: Cierra el menú si se hace clic en un enlace
    const navLinks = document.querySelectorAll('.navbar a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navbar.classList.contains('active')) {
                navbar.classList.remove('active');
            }
        });
    });
});
