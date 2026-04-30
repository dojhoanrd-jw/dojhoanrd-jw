/**
 * Network Globe — KubeStellar-style hero animation
 * Category bubbles distributed in 3D around a wireframe globe.
 * Drag the globe with mouse/touch to rotate and see clusters on the other side.
 * HTML cluster bubbles are anchored to Object3D nodes inside the rotating root group;
 * each frame, world positions are projected to 2D screen coords to position the HTML.
 */
(function () {
    'use strict';

    const CATEGORIES = [
        {
            name: 'Frontend',
            icon: 'fa-solid fa-window-maximize',
            techs: [
                { icon: 'fab fa-react',         label: 'React' },
                { icon: 'fa-brands fa-angular', label: 'Angular' },
                { icon: 'fa-brands fa-vuejs',   label: 'Vue.js' },
            ],
        },
        {
            name: 'Backend',
            icon: 'fa-solid fa-server',
            techs: [
                { icon: 'devicon-go-plain',     label: 'Go' },
                { icon: 'bx bxl-typescript',    label: 'TypeScript' },
                { icon: 'fab fa-js-square',     label: 'JavaScript' },
                { icon: 'devicon-csharp-plain', label: 'C#' },
                { icon: 'fa-brands fa-python',  label: 'Python' },
            ],
        },
        {
            name: 'Mobile',
            icon: 'fa-solid fa-mobile-screen-button',
            techs: [
                { icon: 'devicon-flutter-plain', label: 'Flutter' },
                { icon: 'fab fa-react',          label: 'React Native' },
                { icon: 'devicon-dot-net-plain', label: '.NET MAUI' },
            ],
        },
        {
            name: 'Databases',
            icon: 'fa-solid fa-database',
            techs: [
                { icon: 'devicon-microsoftsqlserver-plain', label: 'SQL Server' },
                { icon: 'bx bxl-postgresql',                label: 'PostgreSQL' },
                { icon: 'devicon-mysql-plain',              label: 'MySQL' },
                { icon: 'devicon-mongodb-plain',            label: 'MongoDB' },
                { icon: 'devicon-redis-plain',              label: 'Redis' },
            ],
        },
        {
            name: 'Cloud',
            icon: 'fa-solid fa-cloud',
            techs: [
                { icon: 'fab fa-aws',                label: 'AWS' },
                { icon: 'devicon-azure-plain',       label: 'Azure' },
                { icon: 'devicon-googlecloud-plain', label: 'GCP' },
            ],
        },
        {
            name: 'DevOps',
            icon: 'fa-solid fa-gears',
            techs: [
                { icon: 'fa-solid fa-file-code',  label: 'IaC' },
                { icon: 'fa-solid fa-infinity',   label: 'CI/CD' },
                { icon: 'fa-solid fa-cubes',      label: 'Containers' },
                { icon: 'fa-solid fa-gauge-high', label: 'Observability' },
            ],
        },
        {
            name: 'AI',
            icon: 'fa-solid fa-brain',
            techs: [
                { icon: 'fa-solid fa-diagram-project', label: 'AI Orchestration & Apps' },
                { icon: 'fa-solid fa-microchip',       label: 'LLMs & Foundational Models' },
                { icon: 'fa-solid fa-network-wired',   label: 'Deep Learning & Training' },
                { icon: 'fa-solid fa-cube',            label: 'Data & Vector Storage' },
            ],
        },
    ];

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const NODE_RADIUS = 1.7;  // 3D radius where category anchors sit (right at the globe surface)
    const GLOBE_RADIUS = 1.65;

    function ready() {
        if (typeof THREE === 'undefined') {
            console.error('[globe] Three.js not loaded');
            return;
        }
        const container = document.getElementById('hero-globe');
        if (!container) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        initGlobe(container);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ready);
    } else {
        ready();
    }

    function initGlobe(mount) {
        // ==================== THEME PALETTES ====================
        const PALETTES = {
            dark: {
                primary: 0x004aad,
                wire: 0x1a5fbd,
                dot: 0x78aaff,
                ring: 0x004aad,
                center: 0xffffff,
                halo: 0x78aaff,
                marker: 0x78aaff,
            },
            light: {
                primary: 0x000000,
                wire: 0x000000,
                dot: 0x222222,
                ring: 0x000000,
                center: 0x000000,
                halo: 0x444444,
                marker: 0x000000,
            },
        };
        const getTheme = () =>
            document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
        const getBlending = () =>
            getTheme() === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending;

        // ==================== THREE.JS SCENE ====================
        const PRIMARY = new THREE.Color(PALETTES[getTheme()].primary);
        const scene = new THREE.Scene();

        let width = mount.clientWidth || 600;
        let height = mount.clientHeight || 600;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0, 7);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.classList.add('globe-canvas');
        mount.appendChild(renderer.domElement);

        const root = new THREE.Group();
        scene.add(root);

        // RoundedBoxGeometry fallback if addon failed to load
        const RoundedBox = THREE.RoundedBoxGeometry || THREE.BoxGeometry;
        const wireSize = GLOBE_RADIUS * 1.7;
        const cornerRadius = GLOBE_RADIUS * 0.35;

        // Inner glowing core (rounded box)
        const coreMat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: { uColor: { value: PRIMARY }, uTime: { value: 0 } },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform float uTime;
                varying vec3 vNormal;
                void main() {
                    float fres = pow(1.0 - abs(vNormal.z), 2.5);
                    float pulse = 0.85 + 0.15 * sin(uTime * 1.2);
                    vec3 col = mix(uColor * 0.25, uColor * 1.3, fres) * pulse;
                    float alpha = fres * 0.6 + 0.1;
                    gl_FragColor = vec4(col, alpha);
                }
            `,
            blending: THREE.AdditiveBlending,
        });
        const coreSize = GLOBE_RADIUS * 1.3;
        const core = new THREE.Mesh(
            new RoundedBox(coreSize, coreSize, coreSize, 6, cornerRadius * 0.7),
            coreMat,
        );
        root.add(core);

        // Wireframe globe — rounded box
        const wireGlobe = new THREE.LineSegments(
            new THREE.WireframeGeometry(new RoundedBox(wireSize, wireSize, wireSize, 6, cornerRadius)),
            new THREE.LineBasicMaterial({
                color: PALETTES[getTheme()].wire, transparent: true, opacity: 0.32, depthWrite: false,
            }),
        );
        root.add(wireGlobe);

        // Dotted shell — points scattered on the rounded-box surface
        const dotPositions = [];
        const halfSize = wireSize / 2 + 0.04;
        const cR = cornerRadius;
        for (let i = 0; i < 1000; i++) {
            // Pick a random face (0..5)
            const face = Math.floor(Math.random() * 6);
            // Random point in [-1, 1]^2 within the face
            const u = Math.random() * 2 - 1;
            const v = Math.random() * 2 - 1;
            // Map to face coords with slight inset so dots stay near the curved corner area too
            const fu = u * halfSize;
            const fv = v * halfSize;
            let x, y, z;
            if (face === 0)      { x =  halfSize; y = fu; z = fv; }
            else if (face === 1) { x = -halfSize; y = fu; z = fv; }
            else if (face === 2) { x = fu; y =  halfSize; z = fv; }
            else if (face === 3) { x = fu; y = -halfSize; z = fv; }
            else if (face === 4) { x = fu; y = fv; z =  halfSize; }
            else                 { x = fu; y = fv; z = -halfSize; }

            // Round corners: pull points outside the inner core box toward a sphere of corner radius
            const inner = halfSize - cR;
            const dx = Math.max(Math.abs(x) - inner, 0);
            const dy = Math.max(Math.abs(y) - inner, 0);
            const dz = Math.max(Math.abs(z) - inner, 0);
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist > cR) {
                const k = cR / dist;
                if (Math.abs(x) > inner) x = Math.sign(x) * (inner + dx * k);
                if (Math.abs(y) > inner) y = Math.sign(y) * (inner + dy * k);
                if (Math.abs(z) > inner) z = Math.sign(z) * (inner + dz * k);
            }
            dotPositions.push(x, y, z);
        }
        const dotGeo = new THREE.BufferGeometry();
        dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(dotPositions, 3));
        const dotTexture = createDotTexture();
        const dotShell = new THREE.Points(
            dotGeo,
            new THREE.PointsMaterial({
                color: PALETTES[getTheme()].dot, size: 0.045, map: dotTexture,
                transparent: true, opacity: 0.85, depthWrite: false,
                blending: getBlending(), sizeAttenuation: true,
            }),
        );
        root.add(dotShell);

        // Equatorial rings (outside the cluster orbit)
        const ringMat = new THREE.MeshBasicMaterial({
            color: PALETTES[getTheme()].ring, side: THREE.DoubleSide,
            transparent: true, opacity: 0.4, depthWrite: false,
        });
        const ring = new THREE.Mesh(new THREE.RingGeometry(1.92, 1.94, 128), ringMat);
        ring.rotation.x = Math.PI / 2 - 0.18;
        ring.rotation.z = 0.25;
        root.add(ring);

        const ring2 = ring.clone();
        ring2.material = ring.material.clone();
        ring2.material.opacity = 0.16;
        ring2.scale.setScalar(1.08);
        ring2.rotation.x = Math.PI / 2 + 0.4;
        ring2.rotation.z = -0.4;
        root.add(ring2);

        // Center node — small rounded box
        const centerNode = new THREE.Mesh(
            new RoundedBox(0.32, 0.32, 0.32, 4, 0.08),
            new THREE.MeshBasicMaterial({ color: PALETTES[getTheme()].center }),
        );
        root.add(centerNode);
        const centerHalo = new THREE.Sprite(new THREE.SpriteMaterial({
            map: createDotTexture(), color: PALETTES[getTheme()].halo,
            transparent: true, opacity: 1, depthWrite: false, blending: getBlending(),
        }));
        centerHalo.scale.set(1.5, 1.5, 1.5);
        root.add(centerHalo);

        // Starfield
        const starPos = [];
        for (let i = 0; i < 220; i++) {
            const r = 18 + Math.random() * 10;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            starPos.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi),
            );
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
        const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
            color: 0xffffff, size: 0.07, map: dotTexture,
            transparent: true, opacity: 0.6, depthWrite: false,
            blending: THREE.AdditiveBlending,
        }));
        scene.add(stars);

        // ==================== HTML LAYERS ====================
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.classList.add('cluster-arcs');
        svg.setAttribute('preserveAspectRatio', 'none');
        mount.appendChild(svg);

        const clusterLayer = document.createElement('div');
        clusterLayer.className = 'cluster-layer';
        mount.appendChild(clusterLayer);

        // ==================== 3D CLUSTER ANCHORS ====================
        const clusters = CATEGORIES.map((cat, i) => {
            // Distribute via fibonacci sphere
            const y = ((i + 0.5) / CATEGORIES.length) * 2 - 1;
            const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
            const goldenAngle = Math.PI * (3 - Math.sqrt(5));
            const theta = goldenAngle * i + 0.6;
            const x = Math.cos(theta) * radiusAtY;
            const z = Math.sin(theta) * radiusAtY;

            // 3D anchor inside the rotating root group
            const anchor = new THREE.Object3D();
            anchor.position.set(x * NODE_RADIUS, y * NODE_RADIUS, z * NODE_RADIUS);
            root.add(anchor);

            // Connection line endpoint marker (attached to globe surface)
            const surfaceMarker = new THREE.Mesh(
                new RoundedBox(0.1, 0.1, 0.1, 3, 0.025),
                new THREE.MeshBasicMaterial({ color: PALETTES[getTheme()].marker, transparent: true, opacity: 0.9, blending: getBlending() }),
            );
            surfaceMarker.position.copy(anchor.position).multiplyScalar(GLOBE_RADIUS / NODE_RADIUS);
            root.add(surfaceMarker);

            // HTML cluster bubble
            const cluster = document.createElement('div');
            cluster.className = 'cluster';

            const orbit = document.createElement('div');
            orbit.className = 'cluster-orbit';

            const cCore = document.createElement('div');
            cCore.className = 'cluster-core';
            const coreIcon = document.createElement('i');
            coreIcon.className = cat.icon;
            coreIcon.setAttribute('aria-hidden', 'true');
            cCore.appendChild(coreIcon);
            orbit.appendChild(cCore);

            cat.techs.forEach((tech, ti) => {
                const angleDeg = (ti / cat.techs.length) * 360 - 90;
                const orb = document.createElement('div');
                orb.className = 'tech-orb';
                orb.style.setProperty('--angle', `${angleDeg}deg`);
                orb.title = tech.label;
                const orbIcon = document.createElement('i');
                orbIcon.className = tech.icon;
                orbIcon.setAttribute('aria-hidden', 'true');
                orb.appendChild(orbIcon);
                orbit.appendChild(orb);
            });

            const label = document.createElement('span');
            label.className = 'cluster-label';
            label.textContent = cat.name;

            cluster.appendChild(orbit);
            cluster.appendChild(label);
            clusterLayer.appendChild(cluster);

            // SVG arc
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('class', 'cluster-arc');
            svg.appendChild(path);

            return { anchor, surfaceMarker, el: cluster, path };
        });

        // ==================== THEME CHANGE WATCHER ====================
        function applyTheme() {
            const p = PALETTES[getTheme()];
            const blending = getBlending();
            coreMat.uniforms.uColor.value.setHex(p.primary);
            wireGlobe.material.color.setHex(p.wire);
            dotShell.material.color.setHex(p.dot);
            dotShell.material.blending = blending;
            dotShell.material.needsUpdate = true;
            ring.material.color.setHex(p.ring);
            ring2.material.color.setHex(p.ring);
            centerNode.material.color.setHex(p.center);
            centerHalo.material.color.setHex(p.halo);
            centerHalo.material.blending = blending;
            centerHalo.material.needsUpdate = true;
            clusters.forEach((c) => {
                c.surfaceMarker.material.color.setHex(p.marker);
                c.surfaceMarker.material.blending = blending;
                c.surfaceMarker.material.needsUpdate = true;
            });
        }
        const themeObserver = new MutationObserver(applyTheme);
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });

        // ==================== POINTER / DRAG TO ROTATE ====================
        const heroSection = mount.closest('.hero') || mount.parentElement;

        let baseRotY = 0;
        let baseRotX = -0.15;
        let dragRotY = 0;
        let dragRotX = 0;
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let lastInteractionAt = 0;

        // Hover parallax (when not dragging)
        const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

        mount.style.cursor = 'grab';

        function getPoint(e) {
            if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            return { x: e.clientX, y: e.clientY };
        }

        function startDrag(e) {
            isDragging = true;
            const p = getPoint(e);
            dragStartX = p.x;
            dragStartY = p.y;
            mount.style.cursor = 'grabbing';
        }

        function moveDrag(e) {
            if (!isDragging) return;
            const p = getPoint(e);
            dragRotY = (p.x - dragStartX) * 0.006;
            dragRotX = (p.y - dragStartY) * 0.006;
            lastInteractionAt = performance.now();
            if (e.cancelable) e.preventDefault();
        }

        function endDrag() {
            if (!isDragging) return;
            baseRotY += dragRotY;
            baseRotX = clamp(baseRotX + dragRotX, -0.85, 0.85);
            dragRotY = 0;
            dragRotX = 0;
            isDragging = false;
            mount.style.cursor = 'grab';
        }

        function onPointerHover(e) {
            const rect = heroSection.getBoundingClientRect();
            pointer.tx = clamp(((e.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
            pointer.ty = clamp(((e.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
        }

        function onHoverLeave() {
            pointer.tx = 0;
            pointer.ty = 0;
        }

        mount.addEventListener('mousedown', startDrag);
        window.addEventListener('mousemove', moveDrag);
        window.addEventListener('mouseup', endDrag);

        mount.addEventListener('touchstart', startDrag, { passive: true });
        window.addEventListener('touchmove', moveDrag, { passive: false });
        window.addEventListener('touchend', endDrag);

        heroSection.addEventListener('mousemove', onPointerHover, { passive: true });
        heroSection.addEventListener('mouseleave', onHoverLeave);

        // ==================== RESIZE ====================
        function resize() {
            width = mount.clientWidth;
            height = mount.clientHeight;
            if (width === 0 || height === 0) return;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            svg.setAttribute('width', String(width));
            svg.setAttribute('height', String(height));
        }
        const ro = new ResizeObserver(resize);
        ro.observe(mount);
        resize();

        // ==================== ANIMATION LOOP ====================
        let running = true;
        const clock = new THREE.Clock();

        const tmpWorld = new THREE.Vector3();
        const tmpProj = new THREE.Vector3();
        const tmpCenter = new THREE.Vector3();

        function updateClusters() {
            // Project the world center for arc start
            tmpCenter.set(0, 0, 0).project(camera);
            const cx = (tmpCenter.x * 0.5 + 0.5) * width;
            const cy = (-tmpCenter.y * 0.5 + 0.5) * height;

            clusters.forEach((c) => {
                c.anchor.getWorldPosition(tmpWorld);
                tmpProj.copy(tmpWorld).project(camera);
                const x = (tmpProj.x * 0.5 + 0.5) * width;
                const y = (-tmpProj.y * 0.5 + 0.5) * height;

                // Depth (world z): + = front (toward camera), - = back
                const depth = tmpWorld.z;
                const t = clamp((depth + NODE_RADIUS) / (NODE_RADIUS * 2), 0, 1);
                const opacity = 0.12 + t * 0.88;
                const scale = 0.55 + t * 0.45;

                c.el.style.transform =
                    `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
                c.el.style.opacity = String(opacity);
                c.el.style.zIndex = String(Math.round(1000 + depth * 200));

                // SVG arc from globe center to cluster screen position
                const mx = (cx + x) / 2;
                const my = (cy + y) / 2;
                const dx = x - cx;
                const dy = y - cy;
                const perpX = -dy * 0.18;
                const perpY = dx * 0.18;
                c.path.setAttribute(
                    'd',
                    `M ${cx.toFixed(1)} ${cy.toFixed(1)} Q ${(mx + perpX).toFixed(1)} ${(my + perpY).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`,
                );
                c.path.style.opacity = String(opacity * 0.55);
            });
        }

        function animate() {
            if (!running) return;
            requestAnimationFrame(animate);
            const time = clock.getElapsedTime();

            // Auto-rotate when not actively dragging (slows to a stop briefly after release)
            const sinceInteraction = (performance.now() - lastInteractionAt) / 1000;
            if (!isDragging) {
                const autoFactor = clamp(sinceInteraction / 1.5, 0, 1); // ramp back over 1.5s
                baseRotY += 0.0025 * autoFactor;
            }

            // Hover parallax adds gentle offset
            pointer.x += (pointer.tx - pointer.x) * 0.08;
            pointer.y += (pointer.ty - pointer.y) * 0.08;

            const rotY = baseRotY + dragRotY + (isDragging ? 0 : pointer.x * 0.18);
            const rotX = clamp(baseRotX + dragRotX + (isDragging ? 0 : pointer.y * 0.12), -0.95, 0.95);

            root.rotation.y = rotY;
            root.rotation.x = rotX;

            wireGlobe.rotation.y = -time * 0.04;
            dotShell.rotation.y = time * 0.03;
            ring.rotation.z = 0.25 + time * 0.04;
            ring2.rotation.z = -0.4 - time * 0.035;
            coreMat.uniforms.uTime.value = time;

            const haloS = 1.4 + Math.sin(time * 1.5) * 0.12;
            centerHalo.scale.set(haloS, haloS, haloS);
            stars.rotation.y = time * 0.008;

            updateClusters();
            renderer.render(scene, camera);
        }

        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                running = entry.isIntersecting;
                if (running) animate();
            });
        }, { threshold: 0.05 });
        io.observe(mount);

        animate();
    }

    function clamp(v, min, max) {
        return v < min ? min : v > max ? max : v;
    }

    function createDotTexture() {
        const size = 64;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
        g.addColorStop(0.6, 'rgba(120,170,255,0.25)');
        g.addColorStop(1, 'rgba(0,74,173,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(c);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        return tex;
    }
})();
