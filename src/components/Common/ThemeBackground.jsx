import { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeBackground = () => {
    const { theme } = useTheme();
    const canvasRef = useRef(null);

    useEffect(() => {
        if (theme !== 'quantum' && theme !== 'neon') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const mouse = { x: -1000, y: -1000 };

        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        window.addEventListener('mousemove', handleMouseMove);

        // Particle system (Subtle & Ambient)
        const particles = [];
        const isLiving = theme === 'living';
        // drastically reduced counts for "less chaos"
        const particleCount = theme === 'quantum' ? 20 : (isLiving ? 25 : 15);
        const color = theme === 'quantum' ? '139, 92, 246' : (isLiving ? '244, 114, 182' : '0, 242, 255');

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * (isLiving ? 2.5 : 1.5) + 0.5,
                // Slower, calmer movement
                speedX: Math.random() * 0.2 - 0.1,
                speedY: Math.random() * 0.2 - 0.1,
                opacity: Math.random() * 0.3 + 0.1 // Lower opacity
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, i) => {
                p.x += p.speedX;
                p.y += p.speedY;

                // Mouse interaction for living theme
                if (isLiving) {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const maxDistance = 150;
                    const force = (maxDistance - distance) / maxDistance;

                    if (distance < maxDistance) {
                        p.x -= forceDirectionX * force * 2;
                        p.y -= forceDirectionY * force * 2;
                    }
                }

                if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
                if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${color}, ${p.opacity})`;
                ctx.fill();

                // Lines between close particles
                if (!isLiving && theme === 'quantum') {
                    for (let j = i + 1; j < particles.length; j++) {
                        const p2 = particles[j];
                        const dx = p.x - p2.x;
                        const dy = p.y - p2.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 150) {
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(${color}, ${0.1 * (1 - dist / 150)})`;
                            ctx.lineWidth = 0.5;
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    }
                }
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme]);

    if (theme !== 'quantum' && theme !== 'neon' && theme !== 'living') return null;

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: -1,
                pointerEvents: 'none',
                opacity: 0.6
            }}
        />
    );
};

export default ThemeBackground;
