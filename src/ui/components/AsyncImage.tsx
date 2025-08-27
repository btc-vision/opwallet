import React, { useEffect, useRef } from 'react';
import ImageService from '@/shared/services/ImageService';

interface AsyncImageProps {
    src: string;
    alt?: string;
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    height?: number;
    fallback?: React.ReactNode;
    onClick?: () => void;
}

export function AsyncImage({
    src,
    alt = '',
    className = '',
    style = {},
    width = 500,
    height = 500,
    fallback,
    onClick
}: AsyncImageProps) {
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!elementRef.current || !src) return;

        // Set data-src attribute
        elementRef.current.dataset.src = ImageService.encrypt(src);
        elementRef.current.dataset.width = width.toString();
        elementRef.current.dataset.height = height.toString();

        // Add to processing queue
        elementRef.current.classList.add('asyncImage');

        // Trigger processing
        setTimeout(() => {
            ImageService.processAllImages();
        }, 10);

        // Observe for lazy loading
        ImageService.observeElement(elementRef.current);

        return () => {
            // Cleanup if needed
            if (elementRef.current) {
                elementRef.current.classList.remove('asyncImage', 'loaded');
            }
        };
    }, [src, width, height]);

    return (
        <div
            ref={elementRef}
            className={`asyncImage ${className}`}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#434343',
                ...style
            }}
            onClick={onClick}
            data-src={src}>
            {fallback || <div style={{ fontSize: '24px', color: '#999' }}>⏳</div>}
        </div>
    );
}
