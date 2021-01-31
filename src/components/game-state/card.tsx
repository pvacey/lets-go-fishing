import React, { useEffect, useState } from 'react';
import { CardInfoService } from '../../services/cardInfoSvc';

import cardBack from '../../assets/mtg-card-back.png';
import Draggable, { ControlPosition, DraggableData } from 'react-draggable';
import { cancelablePromise } from '../../utilities/helpers';
import { ZoneCardInfo } from './zone';
import { CardInfo } from '../../services/dbSvc';

export interface CardActionInfo {
    card: CardInfo;
    node?: Element;
    sourceZone?: string;
    targetZone?: string;
}

interface CardProps {
    zoneCard: ZoneCardInfo;
    faceDown?: boolean;
    enablePreview?: boolean;
    onDrag: CardActionEventHandler;
    onDragStop: CardActionEventHandler;
    onClick: CardActionEventHandler;
}

export type CardActionEventHandler = (drag: CardActionInfo) => boolean;

export const Card = (
    { zoneCard, faceDown, enablePreview, onDrag, onDragStop, onClick }: CardProps
) => {
    const { card, x, y, tapped, zIndex } = zoneCard;

    const [imageUrl, setImageUrl] = useState('');
    const [manualDragPos, setManualDragPos] = useState<ControlPosition>();

    const isLoading = !imageUrl && !faceDown;

    useEffect(() => {
        const { promise, cancel } = cancelablePromise(CardInfoService.getCardImageUrl(card));
        promise.then(url => setImageUrl(url)).catch(() => { });
        return cancel;
    }, [card]);

    const getCardStyles = () => {
        const imageUrlToUse = (isLoading || faceDown) ? cardBack : imageUrl;
        return { backgroundImage: `url(${imageUrlToUse})`, };
    };

    const getTransformStyles = () => {
        const round = (n?: number) => n ? Math.round(n) : 0;
        const translation = `translate(${round(x)}px, ${round(y)}px)`;
        const rotation = tapped ? 'rotate(90deg)' : '';
        return { transform: `${translation} ${rotation}` };
    }

    const getClasses = () => {
        const faceUpAndLoaded = !isLoading && !faceDown;
        return 'card' +
            (isLoading ? ' loading' : '') +
            (faceUpAndLoaded && enablePreview ? ' enable-preview' : '') +
            (faceUpAndLoaded && card.foil ? ' foil' : '');
    };

    const createDrag = (data?: DraggableData) => ({ card, node: data?.node.firstElementChild! });

    const fireDrag = (_: any, data: DraggableData) => {
        setManualDragPos(undefined);
        const success = onDrag(createDrag(data));
        if (!success) return false;
    };

    const fireDragStop = (_: any, data: DraggableData) => {
        if (!onDragStop(createDrag(data))) setManualDragPos({ x: 0, y: 0 });
        // Don't let react-draggable update since the card was dragged to a new zone.
        else return false;
    };

    const fireClick = () => {
        if (onClick) return onClick(createDrag());
        return true;
    }

    const nodeRef = React.useRef(null);
    return (
        <Draggable
            nodeRef={nodeRef}
            defaultClassName='card-drag-layer'
            onDrag={fireDrag}
            onStop={fireDragStop}
            position={manualDragPos}
        >
            <div ref={nodeRef} style={{ zIndex }} onClick={fireClick}>
                <div className='card-position-layer' style={getTransformStyles()}>
                    <div className={getClasses()} style={getCardStyles()}>
                        {isLoading ?
                            <div className='loader' /> :
                            <div className='card-face' />
                        }
                    </div>
                </div>
            </div>
        </Draggable>
    );
};
