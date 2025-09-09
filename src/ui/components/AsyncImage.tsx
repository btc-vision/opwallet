import React, { useEffect, useRef, useState } from 'react';
import ImageService from '@/shared/services/ImageService';

interface AsyncImageProps {
    src: string;
    alt?: string;
    className?: string;
    style?: React.CSSProperties;
    width?: number | string;
    height?: number | string;
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
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!elementRef.current || !src) return;

        // Set data-src attribute
        elementRef.current.dataset.src = ImageService.encrypt(src);
        elementRef.current.dataset.width = width.toString();
        elementRef.current.dataset.height = height.toString();

        // Add to processing queue
        elementRef.current.classList.add('asyncImage');

        // Create an observer to watch for class changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const element = mutation.target as HTMLElement;
                    if (element.classList.contains('loaded')) {
                        setIsLoaded(true);
                        observer.disconnect();
                    } else if (element.classList.contains('load-error')) {
                        // Keep showing fallback on error
                        observer.disconnect();
                    }
                }
            });
        });

        // Start observing the element for class changes
        observer.observe(elementRef.current, {
            attributes: true,
            attributeFilter: ['class']
        });

        // Trigger processing
        setTimeout(() => {
            ImageService.processAllImages();
        }, 10);

        // Observe for lazy loading
        ImageService.observeElement(elementRef.current);

        return () => {
            // Cleanup
            observer.disconnect();
            if (elementRef.current) {
                elementRef.current.classList.remove('asyncImage', 'loaded');
            }
            setIsLoaded(false);
        };
    }, [src, width, height]);

    return (
        <div
            ref={elementRef}
            className={`relative ${className}`}
            style={{
                ...style,
                width: width,
                height: height,
                overflow: 'hidden'
            }}
            onClick={onClick}>
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    {fallback || <span>⏳</span>}
                </div>
            )}
        </div>
    );
}
