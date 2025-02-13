const mobileMenu = document.querySelector('.mobile-menu');
const navLinks = document.querySelector('.nav-links');

const handleMobileMenuClick = (e) => {
    e.stopPropagation();
    navLinks.classList.toggle('active');
};

const handleNavLinkClick = () => {
    navLinks.classList.remove('active');
};

const handleDocumentClick = (e) => {
    if (navLinks.classList.contains('active') && 
        !navLinks.contains(e.target) && 
        !mobileMenu.contains(e.target)) {
        navLinks.classList.remove('active');
    }
};

const enableDragScroll = (containerSelector) => {
    const container = document.querySelector(containerSelector);
    let isDown = false;
    let startX;
    let scrollLeft;

    const dragStart = (e) => {
        isDown = true;
        container.classList.add('active');
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    };

    const dragEnd = () => {
        isDown = false;
        container.classList.remove('active');
    };

    const drag = (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 2;
        container.scrollLeft = scrollLeft - walk;
    };

    container.addEventListener('mousedown', dragStart);
    container.addEventListener('mouseleave', dragEnd);
    container.addEventListener('mouseup', dragEnd);
    container.addEventListener('mousemove', drag);
};

mobileMenu.addEventListener('click', handleMobileMenuClick);
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', handleNavLinkClick);
});
document.addEventListener('click', handleDocumentClick);

enableDragScroll('.projects-container');
enableDragScroll('.skills-container');





