import React, { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    speed: number;
    size: number;
    baseOpacity: number;
    offset: number;
    frequency: number;
    phase: number;
}

interface ParticleCanvasProps {
    count?: number;
    speed?: number; // base speed
    color?: string;
}

const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ count = 50, speed = 0.5, color = '#FE7901' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Particle[]>([]);
    const timeRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const createParticles = () => {
            const { width, height } = canvas;
            particles.current = Array.from({ length: count }).map(() => ({
                x: Math.random() * width,
                y: Math.random() * height,
                speed: speed + Math.random() * speed,
                size: 1.5,
                baseOpacity: 0.4 + Math.random() * 0.4,
                offset: 0.4 + Math.random() * 1.5, // very subtle sway
                frequency: 0.001 + Math.random() * 0.0015,
                phase: Math.random() * Math.PI * 2
            }));
        };

        createParticles();

        const animate = (time: number) => {
            if (!ctx || !canvas) return;
            const { width, height } = canvas;
            timeRef.current = time;

            ctx.clearRect(0, 0, width, height);

            for (const p of particles.current) {
                p.y -= p.speed;
                if (p.y < -p.size) {
                    p.y = height + p.size;
                    p.x = Math.random() * width;
                }

                const normalizedY = 1 - p.y / height;
                const fade = 1 - Math.abs(0.5 - normalizedY) * 2;
                const opacity = Math.max(0, Math.min(p.baseOpacity * fade, 1));

                const dx = Math.sin(time * p.frequency + p.phase) * p.offset;

                ctx.beginPath();
                ctx.globalAlpha = opacity;
                ctx.fillStyle = color;
                ctx.arc(p.x + dx, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
            }

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [count, speed, color]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" />;
};

export default ParticleCanvas;
