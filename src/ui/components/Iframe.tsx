import { CSSProperties, memo, type RefObject, useMemo } from 'react';

export interface IframeProps {
    preview: string;
    style?: CSSProperties;
    ref: RefObject<HTMLIFrameElement | null>;
}

const Iframe = ({ preview, style, ref }: IframeProps) => {
    return useMemo(
        () => (
            <iframe
                onClick={(e) => e.preventDefault()}
                ref={ref}
                style={Object.assign({}, { pointerEvents: 'none', overflow: 'hidden' }, style)} // prevent events in iframe
                src={preview}
                sandbox="allow-scripts"
                loading="lazy"></iframe>
        ),
        [preview]
    );
};

export default memo(Iframe, (p, n) => {
    return p.preview === n.preview;
});
