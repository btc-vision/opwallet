import base from 'base-x';

interface LoadedImage {
    element: HTMLElement;
    url: string;
    type: 'image' | 'video';
    blob?: Blob;
    objectUrl?: string;
}

interface QueuedImage {
    element: HTMLElement;
    src: string;
    priority: number;
}

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz-.,';
const bs58 = base(BASE58);

class ImageService {
    private static instance: ImageService;

    private loadedImages = new Map<string, LoadedImage>();
    private imageQueue: QueuedImage[] = [];
    private isProcessing = false;
    private readonly MAX_THREADS = 60;

    private readonly IMAGE_SERVER = 'https://images.opnet.org';
    private readonly IPFS_GATEWAY = 'https://ipfs.opnet.org';

    private activeObserver: IntersectionObserver | null = null;

    private constructor() {
        this.initializeObserver();
    }

    static getInstance(): ImageService {
        if (!ImageService.instance) {
            ImageService.instance = new ImageService();
        }
        return ImageService.instance;
    }

    resolveIPFSUri(uri: string): string {
        if (uri.startsWith('ipfs://')) {
            const hash = uri.replace('ipfs://', '');
            return `${this.IPFS_GATEWAY}/ipfs/${hash}`;
        }

        if (uri.includes('/ipfs/')) {
            return uri; // Already a gateway URL
        }

        // TODO: Add a reverse proxy check for other gateways if needed

        return uri; // Return as-is if not IPFS
    }

    encrypt(imageUrl: string): string {
        try {
            let url = imageUrl;

            // Handle IPFS URLs
            if (url.includes('ipfs://')) {
                url = url.replace('ipfs://', 'https://ipfs.opnet.org/ipfs/');
            }

            if (url.includes('ipfs.io')) {
                url = url.replace('https://ipfs.io/', 'https://ipfs.opnet.org/');
            } else if (url.includes('ipfs.moralis.io:2053')) {
                url = url.replace('https://ipfs.moralis.io:2053/', 'https://ipfs.opnet.org/');
            } else if (url.includes('gateway.pinata.cloud')) {
                url = url.replace('https://gateway.pinata.cloud/', 'https://ipfs.opnet.org/');
            } else if (url.includes('niftylabs.mypinata.cloud')) {
                url = url.replace('https://niftylabs.mypinata.cloud/', 'https://ipfs.opnet.org/');
            }

            if (url.includes('/ipfs/')) {
                const split = url.split('/ipfs/');
                url = `https://ipfs.opnet.org/ipfs/${split[1]}`;
            }

            if (url.includes('/ipns/')) {
                const split = url.split('/ipns/');
                url = `https://ipfs.opnet.org/ipns/${split[1]}`;
            }

            // For IPFS URLs that are already on opnet, return modified format
            if (url.startsWith('https://ipfs.opnet.org')) {
                const imgSplit = url.split('https://ipfs.opnet.org/');
                return `https://images.opnet.org/500/500/${imgSplit[1]}`;
            }

            // For other URLs, encode them with base58
            const str = url.replace('https://', '').replace('http://', '');
            const uriSplit = str.split('/');
            const uriA = uriSplit[0]; // Domain part
            const finalUriData = str.replace(uriA, ''); // Path part

            // Encode the domain part with base58
            const encodedDomain = bs58.encode(Buffer.from(uriA));

            // Return the full encoded URL
            return `https://images.opnet.org/v2/500/500/${encodedDomain}${finalUriData}`;
        } catch (e) {
            console.error('Encoding error:', e);
            return 'somethingwentwrong';
        }
    }

    /**
     * Process all async images on the page
     */
    processAllImages() {
        if (typeof document === 'undefined') return;

        const images = document.getElementsByClassName('asyncImage');
        const imageArray = Array.from(images) as HTMLElement[];

        // Clear queue and start fresh
        this.imageQueue = [];

        imageArray.forEach((element, index) => {
            const src = element.dataset.src;
            if (!src) {
                this.setImageError(element);
                return;
            }

            if (this.isValidSource(src)) {
                // Check if already loaded
                const cached = this.loadedImages.get(src);
                if (cached) {
                    this.applyLoadedAsset(element, cached);
                } else {
                    // Add to queue with priority based on position
                    this.queueImage(element, src, imageArray.length - index);
                }
            } else {
                this.setImageError(element);
            }
        });

        // Start processing
        void this.processQueue();
    }

    /**
     * Observe element for lazy loading
     */
    observeElement(element: HTMLElement) {
        if (this.activeObserver && element.dataset.src) {
            this.activeObserver.observe(element);
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Revoke object URLs
        this.loadedImages.forEach((item) => {
            if (item.objectUrl) {
                URL.revokeObjectURL(item.objectUrl);
            }
        });

        this.loadedImages.clear();
        this.imageQueue = [];

        if (this.activeObserver) {
            this.activeObserver.disconnect();
        }
    }

    /**
     * Initialize intersection observer for lazy loading
     */
    private initializeObserver() {
        if (typeof window === 'undefined') return;

        this.activeObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const element = entry.target as HTMLElement;
                        const src = element.dataset.src;
                        if (src && !element.classList.contains('loaded')) {
                            this.queueImage(element, src, 1);
                        }
                    }
                });
            },
            {
                rootMargin: '50px',
                threshold: 0.01
            }
        );
    }

    /**
     * Queue an image for loading
     */
    private queueImage(element: HTMLElement, src: string, priority: number): void {
        // Remove if already in queue
        this.imageQueue = this.imageQueue.filter((item) => item.element !== element);

        // Add with priority
        this.imageQueue.push({ element, src, priority });

        // Sort by priority (higher priority first)
        this.imageQueue.sort((a, b) => b.priority - a.priority);

        // Start processing if not already
        if (!this.isProcessing) {
            void this.processQueue();
        }
    }

    /**
     * Process the image queue
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.imageQueue.length === 0) return;

        this.isProcessing = true;

        // Process in batches
        const batchSize = Math.min(this.MAX_THREADS, this.imageQueue.length);
        const batch = this.imageQueue.splice(0, batchSize);

        const promises = batch.map((item) => this.loadImage(item));

        await Promise.allSettled(promises);

        this.isProcessing = false;

        // Continue if more in queue
        if (this.imageQueue.length > 0) {
            setTimeout(() => this.processQueue(), 10);
        }
    }

    /**
     * Load a single image/video
     */
    private async loadImage(item: QueuedImage): Promise<void> {
        const { element, src } = item;

        try {
            // Optimize URL
            const optimizedUrl = this.getOptimizedUrl(src);

            // Check content type
            const response = await fetch(optimizedUrl, { method: 'HEAD' });
            const contentType = response.headers.get('content-type') || '';

            // Handle video/GIF content
            if (this.isVideoContent(contentType, optimizedUrl)) {
                await this.loadVideo(element, optimizedUrl, src);
            } else {
                await this.loadStandardImage(element, optimizedUrl, src);
            }
        } catch (error) {
            console.error('Failed to load image:', src, error);
            this.setImageError(element);
        }
    }

    /**
     * Load video content (including converted GIFs)
     */
    private async loadVideo(element: HTMLElement, url: string, originalSrc: string): Promise<void> {
        try {
            // Fetch video blob
            const response = await fetch(url);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            // Create video element
            const video = document.createElement('video');
            video.className = element.className.replace('asyncImage', 'loaded');
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.style.cssText = element.style.cssText;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';

            // Add source
            const source = document.createElement('source');
            source.src = objectUrl;
            source.type = blob.type;
            video.appendChild(source);

            // Replace element
            if (element.parentNode) {
                element.parentNode.replaceChild(video, element);
            }

            // Cache the result
            this.loadedImages.set(originalSrc, {
                element: video,
                url: objectUrl,
                type: 'video',
                blob,
                objectUrl
            });
        } catch (error) {
            console.error('Failed to load video:', error);
            this.setImageError(element);
        }
    }

    /**
     * Load standard image
     */
    private async loadStandardImage(element: HTMLElement, url: string, originalSrc: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                this.applyImageToElement(element, url);

                // Cache the result
                this.loadedImages.set(originalSrc, {
                    element,
                    url,
                    type: 'image'
                });

                resolve();
            };

            img.onerror = () => {
                // Try to load as video if image fails
                this.loadVideo(element, url, originalSrc).catch(() => {
                    this.setImageError(element);
                    reject(new Error('Failed to load image or video'));
                });
            };

            img.src = url;
        });
    }

    /**
     * Apply loaded image to element
     */
    private applyImageToElement(element: HTMLElement, url: string) {
        element.classList.remove('asyncImage');
        element.classList.add('loaded');

        if (element.nodeName === 'IMG') {
            (element as HTMLImageElement).src = url;
        } else {
            element.style.backgroundImage = `url(${url})`;
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
        }
    }

    /**
     * Apply cached asset to element
     */
    private applyLoadedAsset(element: HTMLElement, cached: LoadedImage) {
        if (cached.type === 'video' && cached.element) {
            // Clone video element
            const video = cached.element.cloneNode(true) as HTMLVideoElement;
            video.className = element.className.replace('asyncImage', 'loaded');
            video.style.cssText = element.style.cssText;

            if (element.parentNode) {
                element.parentNode.replaceChild(video, element);
            }
        } else {
            this.applyImageToElement(element, cached.url);
        }
    }

    /**
     * Set error state for element
     */
    private setImageError(element: HTMLElement) {
        element.classList.remove('asyncImage');
        element.classList.add('load-error');

        if (element.nodeName === 'IMG') {
            (element as HTMLImageElement).src =
                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23434343" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="20"%3E⚠️%3C/text%3E%3C/svg%3E';
        } else {
            element.style.backgroundImage = '';
            element.innerHTML =
                '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:48px;">ERROR</div>';
        }
    }

    /**
     * Check if URL is valid
     */
    private isValidSource(src: string | undefined): boolean {
        if (!src) return false;
        if (src === 'undefined' || src === 'null') return false;
        if (src === '/' || src === '/index' || src === 'index') return false;
        if (src.includes('google.com')) return false;
        return !src.includes('raritysniffer.com/index');
    }

    /**
     * Check if content is video
     */
    private isVideoContent(contentType: string, url: string): boolean {
        return (
            contentType.includes('video') ||
            contentType.includes('gif') ||
            url.endsWith('.mp4') ||
            url.endsWith('.mov') ||
            url.endsWith('.webm') ||
            url.endsWith('.gif')
        );
    }

    /**
     * Get optimized URL through image server
     */
    private getOptimizedUrl(originalUrl: string, width: number = 500, height: number = 500): string {
        // Handle SVG strings
        if (originalUrl.startsWith('<svg')) {
            try {
                return `data:image/svg+xml;base64,${btoa(originalUrl)}`;
            } catch {
                return originalUrl;
            }
        }

        // Handle data URLs
        if (originalUrl.startsWith('data:')) {
            return originalUrl;
        }

        // Already optimized
        if (originalUrl.includes('images.opnet.org')) {
            return originalUrl;
        }

        // Handle IPFS
        if (originalUrl.includes('ipfs.')) {
            const ipfsHash = originalUrl.split('/ipfs/')[1] || originalUrl.split('ipfs.')[1];
            if (ipfsHash) {
                return `${this.IMAGE_SERVER}/${width}/${height}/ipfs/${ipfsHash}`;
            }
        }

        // Handle ipfs:// protocol
        if (originalUrl.startsWith('ipfs://')) {
            const hash = originalUrl.replace('ipfs://', '');
            return `${this.IMAGE_SERVER}/${width}/${height}/ipfs/${hash}`;
        }

        // External URLs - proxy through server
        return `${this.IMAGE_SERVER}/${width}/${height}/proxy/${encodeURIComponent(originalUrl)}`;
    }
}

export default ImageService.getInstance();
