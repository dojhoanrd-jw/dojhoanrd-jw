// Datos de los proyectos
const projects = {
    project1: {
        title: "ToDoPro",
        description: "This application is a task manager designed to help users organize, track, and prioritize their tasks efficiently. Users can create tasks with detailed descriptions.",
        technologies: "React, Firebase",
        github: "https://github.com/dojhoanrd-jw/ToDoPro",
        demo: "https://dojhoanrd-jw.github.io/ToDoPro"
    },
    project2: {
        title: "Notes app",
        description: "I developed a dynamic and efficient note manager using Node.js, Express, and MongoDB for data management, with EJS as the templating engine for a clear and responsive interface. The application allows users to create, edit, and organize their notes intuitively, with a non-relational database ensuring secure and scalable storage.",
        technologies: "Nodejs, Express, MongoDB Atlas",
        github: "https://github.com/dojhoanrd-jw/ToDoPro",
        demo: "https://notes-app-5tk3.onrender.com/notes"
    },
    project3: {
        title: "Taetgen",
        description: "I created a web interface generator using JavaScript, HTML, and CSS, integrating the Géminis API for dynamic content creation. This tool allows users to design and customize web interfaces with ease, leveraging the API to streamline the development process and enhance user experience with a responsive and intuitive interface.",
        technologies: "HTML, CSS, JavaScript, Geminis",
        github: "https://github.com/dojhoanrd-jw/TaetGen",
        demo: "https://dojhoanrd-jw.github.io/TaetGen/"
    },
    project4: {
        title: "Movie search",
        description: "I developed a movie search application using React and TypeScript, powered by The Movie DB API. The app allows users to search for movies and view detailed descriptions, providing an intuitive and responsive interface for quickly finding movie information.",
        technologies: "React, Typescript",
        github: "https://github.com/dojhoanrd-jw/movie-search",
        demo: "https://dojhoanrd-jw.github.io/movie-search/"
    },
    
};

function showProjectDetails(projectId) {
    const project = projects[projectId];
    document.getElementById('projectTitle').innerText = project.title;
    document.getElementById('projectDescription').innerText = project.description;
    document.getElementById('projectTechnologies').innerText = "Tecnologías usadas: " + project.technologies;
    document.getElementById('githubLink').href = project.github;
    document.getElementById('demoLink').href = project.demo;

    document.getElementById('projectDetailsOverlay').style.display = 'flex';
}

function closeProjectDetails() {
    document.getElementById('projectDetailsOverlay').style.display = 'none';
}
