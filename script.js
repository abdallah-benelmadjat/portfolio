document.addEventListener('DOMContentLoaded', function() {
    const header = document.getElementById('main-header');
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    const revealElements = document.querySelectorAll('.reveal');

    // --- Header styling on scroll ---
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('bg-white/80', 'shadow-lg', 'backdrop-blur-sm');
        } else {
            header.classList.remove('bg-white/80', 'shadow-lg', 'backdrop-blur-sm');
        }
    });

    // --- Intersection Observer for scroll animations and nav highlighting ---
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.2 };
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                const id = entry.target.getAttribute('id');
                if (id) {
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            }
        });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));
    sections.forEach(section => observer.observe(section));

    // --- Canvas Particle Animation with Plexus Effect ---
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    
    function setCanvasSize() {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
    }
    setCanvasSize();

    const particleCount = Math.floor(canvas.width / 20);

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 1 - 0.5;
            this.speedY = Math.random() * 1 - 0.5;
            this.color = 'rgba(255, 255, 255, 0.7)';
        }
        update() {
            if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
            if (this.y > canvas.height || this.y < 0) this.speedY *= -1;
            this.x += this.speedX;
            this.y += this.speedY;
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function connectParticles() {
        let opacityValue = 1;
        for (let a = 0; a < particles.length; a++) {
            for (let b = a; b < particles.length; b++) {
                let distance = Math.sqrt(
                    Math.pow(particles[a].x - particles[b].x, 2) +
                    Math.pow(particles[a].y - particles[b].y, 2)
                );
                if (distance < 100) {
                    opacityValue = 1 - (distance / 100);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${opacityValue})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        connectParticles();
        requestAnimationFrame(animateParticles);
    }

    initParticles();
    animateParticles();

    window.addEventListener('resize', () => {
        setCanvasSize();
        initParticles();
    });

    // --- Three.js Experience Section ---
    const experienceData = [
        {
            title: 'AI Research Assistant',
            company: 'Connected Systems Institute · Internship',
            date: 'Jun 2025 - Present · Milwaukee, WI · On-site',
            logo: 'images/csi-logo.png',
            description: [
                'Conduct industrial on-site audits to collect manufacturing data for Microsoft\'s Co-Innovation Lab at UWM.',
                'Perform AI readiness assessments and develop digitalization roadmaps to help manufacturers adopt Industry 4.0 solutions.',
            ]
        },
        {
            title: 'Energy Engineer',
            company: 'Industrial Assessment Center at UW-Milwaukee',
            date: 'Aug 2024 - Present · Milwaukee, WI',
            logo: 'images/doe-logo.png',
            description: [
                'Analyze customer utility consumption and costs to identify and recommend opportunities for energy savings.',
                'Conduct on-site assessments to evaluate the performance of energy systems and identify areas for improvement.',
                'Develop tailored energy efficiency measures that align with client goals and applications.',
                'Perform research to enhance energy efficiency solutions based on data collected from energy audits.',
            ]
        },
        {
            title: 'Energy Engineering Intern',
            company: 'Leidos · Internship',
            date: 'May 2023 - Aug 2023 · Illinois, United States · On-site',
            logo: 'images/leidos-logo.png',
            description: [
                'Highlighted on the front page of the company as intern spotlight.',
                'Conducted 45 compliance reviews and updates to the Energy Efficiency Illinois Statewide Technical Manual.',
                'Managed Salesforce database reports to identify trends and write weekly budgeting reports ahead of schedule.',
                'Analyzed utility bills and technical datasheets to calculate energy savings and approve incentives for Ameren’s energy efficiency program, finishing 72 applications and reducing processing time by 30%.',
            ]
        }
    ];

    const container = document.getElementById('experience-canvas-container');
    if (container) {
        let scene, camera, renderer, objects = [], raycaster, mouse;

        function initThree() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            camera.position.z = 10;

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            container.appendChild(renderer.domElement);

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);
            const pointLight = new THREE.PointLight(0xffffff, 0.8, 100);
            pointLight.position.set(5, 5, 10);
            scene.add(pointLight);

            const textureLoader = new THREE.TextureLoader();
            const radius = 4;

            experienceData.forEach((exp, i) => {
                const angle = (i / experienceData.length) * Math.PI * 2;
                const x = radius * Math.cos(angle);
                const y = radius * Math.sin(angle);

                const geometry = new THREE.SphereGeometry(1, 32, 32);
                const material = new THREE.MeshStandardMaterial({ color: 0x1e40af, metalness: 0.3, roughness: 0.7 });

                textureLoader.load(exp.logo, (texture) => {
                    material.map = texture;
                    material.needsUpdate = true;
                });

                const sphere = new THREE.Mesh(geometry, material);
                sphere.position.set(x, y, 0);
                sphere.userData = exp;
                scene.add(sphere);
                objects.push(sphere);
            });

            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();

            container.addEventListener('mousemove', onMouseMove, false);
            container.addEventListener('click', onClick, false);
            window.addEventListener('resize', onWindowResize, false);

            animateThree();
        }

        let hoveredObject = null;

        function onMouseMove(event) {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(objects);

            if (intersects.length > 0) {
                if (hoveredObject !== intersects[0].object) {
                    if (hoveredObject) {
                        // Reset previous hovered object
                        hoveredObject.scale.set(1, 1, 1);
                    }
                    hoveredObject = intersects[0].object;
                    // Scale up new hovered object
                    hoveredObject.scale.set(1.2, 1.2, 1.2);
                    container.style.cursor = 'pointer';
                }
            } else {
                if (hoveredObject) {
                    // Reset previously hovered object
                    hoveredObject.scale.set(1, 1, 1);
                }
                hoveredObject = null;
                container.style.cursor = 'default';
            }
        }

        function onClick(event) {
            if (hoveredObject) {
                showExperienceDetails(hoveredObject.userData);
            }
        }

        const detailsPanel = document.getElementById('experience-details');
        const closeButton = document.getElementById('close-details');
        const detailsTitle = document.getElementById('details-title');
        const detailsCompany = document.getElementById('details-company');
        const detailsDate = document.getElementById('details-date');
        const detailsList = document.getElementById('details-list');

        function showExperienceDetails(data) {
            detailsTitle.textContent = data.title;
            detailsCompany.textContent = data.company;
            detailsDate.textContent = data.date;
            detailsList.innerHTML = '';
            data.description.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                detailsList.appendChild(li);
            });
            detailsPanel.classList.add('visible');
        }

        function hideExperienceDetails() {
            detailsPanel.classList.remove('visible');
        }

        closeButton.addEventListener('click', hideExperienceDetails);

        function onWindowResize() {
            if (!container) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }

        function animateThree() {
            requestAnimationFrame(animateThree);
            const time = Date.now() * 0.0002;
            objects.forEach((obj, i) => {
                const angle = (i / experienceData.length) * Math.PI * 2 + time;
                obj.position.x = 4 * Math.cos(angle);
                obj.position.y = 4 * Math.sin(angle);
                obj.rotation.y += 0.005;
                obj.rotation.x += 0.005;
            });
            renderer.render(scene, camera);
        }

        // Use a short delay to ensure container is sized by Tailwind CSS
        setTimeout(() => {
            initThree();
        }, 100);
    }
});
