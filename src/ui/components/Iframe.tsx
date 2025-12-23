import { CSSProperties, memo, type RefObject } from 'react';

export interface IframeProps {
    preview: string;
    style?: CSSProperties;
    ref: RefObject<HTMLIFrameElement | null>;
}

const Iframe = ({ preview, style, ref }: IframeProps) => {
    return (
        <iframe
            onClick={(e) => e.preventDefault()}
            ref={ref}
            style={Object.assign({}, { pointerEvents: 'none', overflow: 'hidden' }, style)}
            src={preview}
            sandbox="allow-scripts"
            loading="lazy"
        />
    );
};

export default memo(Iframe, (p, n) => {
    return p.preview === n.preview && p.style === n.style;
});
