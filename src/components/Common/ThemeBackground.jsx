import { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeBackground = () => {
    const { theme } = useTheme();
    const canvasRef = useRef(null);

    useEffect(() => {
        if (theme !== 'codex' && theme !== 'pastel' && theme !== 'white') return;

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

        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);

        // Particle system (Subtle & Ambient)
        const particles = [];
        const particleCount = theme === 'codex' ? 24 : theme === 'pastel' ? 20 : 14;
        const color = theme === 'codex' ? '56, 189, 248' : theme === 'pastel' ? '236, 72, 153' : '100, 116, 139';
        const glow = theme === 'codex' ? 0.35 : theme === 'pastel' ? 0.28 : 0.2;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * (theme === 'pastel' ? 3 : 2) + 0.5,
                speedX: Math.random() * 0.18 - 0.09,
                speedY: Math.random() * 0.18 - 0.09,
                opacity: Math.random() * glow + 0.08
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, i) => {
                p.x += p.speedX;
                p.y += p.speedY;

                if (theme === 'pastel') {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const maxDistance = 120;
                    const force = (maxDistance - distance) / maxDistance;

                    if (distance < maxDistance) {
                        p.x -= forceDirectionX * force * 1.5;
                        p.y -= forceDirectionY * force * 1.5;
                    }
                }

                if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
                if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${color}, ${p.opacity})`;
                ctx.fill();

                // Lines between close particles (codex tech grid feel)
                if (theme === 'codex') {
                    for (let j = i + 1; j < particles.length; j++) {
                        const p2 = particles[j];
                        const dx = p.x - p2.x;
                        const dy = p.y - p2.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 160) {
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(${color}, ${0.12 * (1 - dist / 160)})`;
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

    if (theme !== 'codex' && theme !== 'pastel' && theme !== 'white') return null;

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
                opacity: theme === 'white' ? 0.35 : 0.6
            }}
        />
    );
};

export default ThemeBackground;
