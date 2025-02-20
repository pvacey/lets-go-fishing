import { Paper, styled } from '@mui/material';
import shuffle from 'lodash/shuffle';
import { useRef, useState } from 'react';
import {
    CARD_HEIGHT_PX,
    CARD_WIDTH_PX,
    PaneBgStyle,
    STARTING_HAND_SIZE,
    STARTING_LIFE,
    ZONE_BORDER_PX,
    ZONE_PADDING_PX,
} from '../../global/constants';
import { DeckInfo } from '../../services/dbSvc';
import { Lefter } from '../lefter/lefter';
import { useGlobalShortcuts } from '../hooks/useKeyDown';
import { BattlefieldZone } from './battlefieldZone';
import { SearchZone } from './searchZone';
import { StackZone } from './stackZone';
import { ZoneCardInfo } from './zone';
import useMousePosition from '../hooks/useMousePosition';
import { EnableCardAnimation } from './visualCard';
import { RestartPopup } from './restartPopup';

export const Pane = styled(Paper)(() => ({
    ...PaneBgStyle,
    minWidth: CARD_WIDTH_PX,
    minHeight: CARD_HEIGHT_PX,
    position: 'relative',
    margin: ZONE_BORDER_PX,
    padding: ZONE_PADDING_PX,
}));

export enum ManaColor {
    White = 'White',
    Blue = 'Blue',
    Black = 'Black',
    Red = 'Red',
    Green = 'Green',
    Colorless = 'Colorless',
}

export interface GameDetailsState {
    life: number;
    [ManaColor.White]: number;
    [ManaColor.Blue]: number;
    [ManaColor.Black]: number;
    [ManaColor.Red]: number;
    [ManaColor.Green]: number;
    [ManaColor.Colorless]: number;
}

export enum ZoneName {
    Library = 'library',
    Hand = 'hand',
    Battlefield = 'battlefield',
    Graveyard = 'graveyard',
    Exile = 'exile',
    Command = 'command',
}

export interface CurrentDragInfo {
    zoneCard: ZoneCardInfo;
    sourceZone: ZoneName;
}

interface GameZonesState {
    [ZoneName.Library]: ZoneCardInfo[];
    [ZoneName.Hand]: ZoneCardInfo[];
    [ZoneName.Battlefield]: ZoneCardInfo[];
    [ZoneName.Graveyard]: ZoneCardInfo[];
    [ZoneName.Exile]: ZoneCardInfo[];
    [ZoneName.Command]: ZoneCardInfo[];
}

export const GameLayout = () => {
    const contentDiv = useRef<HTMLDivElement>(null);
    const mousePosInContent = useMousePosition(contentDiv);
    const [currentDrag, setCurrentDrag] = useState<CurrentDragInfo>();
    const [currentDragTargetZone, setCurrentDragTargetZone] = useState<ZoneName>();

    const [currentDeckInfo, setCurrentDeckInfo] = useState<DeckInfo>();
    const [gameDetailsState, setGameDetailsState] = useState<GameDetailsState>({
        life: 0,
        [ManaColor.White]: 0,
        [ManaColor.Blue]: 0,
        [ManaColor.Black]: 0,
        [ManaColor.Green]: 0,
        [ManaColor.Red]: 0,
        [ManaColor.Colorless]: 0,
    });
    const [gameZonesState, setGameZonesState] = useState<GameZonesState>({
        [ZoneName.Library]: [],
        [ZoneName.Hand]: [],
        [ZoneName.Battlefield]: [],
        [ZoneName.Graveyard]: [],
        [ZoneName.Exile]: [],
        [ZoneName.Command]: [],
    });
    const [searchingZone, setSearchingZone] = useState<ZoneName>();
    const [libraryShuffleAnimationRunning, setLibraryShuffleAnimationRunning] = useState(true);
    const [restartPopupOpen, setRestartPopupOpen] = useState(false);

    const isDragWithinZone = (): boolean => {
        return !!currentDrag && currentDrag.sourceZone === currentDragTargetZone;
    };

    const isDragToNewZone = (): boolean => {
        return (
            !!currentDrag &&
            !!currentDragTargetZone &&
            currentDrag.sourceZone !== currentDragTargetZone
        );
    };

    const resetZoneCard = (zoneCard: ZoneCardInfo): ZoneCardInfo => ({
        card: zoneCard.card,
        tapped: false,
        transformed: zoneCard.transformed,
        counters: 0,
        node: zoneCard.node,
    });

    const getFirstElemByClass = (elems: Element[], className: string): Element | undefined => {
        return elems.find((elem) => elem.classList.contains(className));
    };

    const getHoveredElems = (): Element[] => {
        if (!mousePosInContent) return [];
        return document.elementsFromPoint(mousePosInContent.x, mousePosInContent.y);
    };

    const getHoveredZone = (hoveredElems = getHoveredElems()): ZoneName | undefined => {
        const zoneElem = getFirstElemByClass(hoveredElems, 'zone');
        return zoneElem ? (zoneElem.id as ZoneName) : undefined;
    };

    const getHoveredZoneAndCard = () => {
        const hoveredElems = getHoveredElems();
        const zone = getHoveredZone(hoveredElems);
        if (!zone) return undefined;

        const hoveredCardId = getFirstElemByClass(hoveredElems, 'card')?.id;
        const zoneCard =
            hoveredCardId !== undefined
                ? gameZonesState[zone].find((zc) => zc.card.id === hoveredCardId)
                : undefined;

        return { zone, zoneCard };
    };

    const sliceEndElements = (fromArray: any[], toArray: any[], num: number) => {
        const cutIndex = fromArray.length - num;
        return {
            fromArray: fromArray.slice(0, cutIndex),
            toArray: toArray.concat(fromArray.slice(cutIndex)),
        };
    };

    const sliceCardFromZone = (zoneCard: ZoneCardInfo, zone: ZoneName) => {
        const cards = gameZonesState[zone];
        const index = cards.findIndex((zc) => zc.card.id === zoneCard.card.id);
        return [cards.slice(0, index), cards.slice(index + 1)];
    };

    const updateCardStateInZone = (zoneCard: ZoneCardInfo, zone: ZoneName) => {
        EnableCardAnimation(zoneCard);
        const [piece1, piece2] = sliceCardFromZone(zoneCard, zone);
        setGameZonesState((g) => ({ ...g, [zone]: piece1.concat(zoneCard, piece2) }));
    };

    const getStartingZoneCards = ({
        mainboard,
        commanders,
    }: DeckInfo): { library: any[]; hand: any[]; command: ZoneCardInfo[] } => {
        const newLibraryCards = shuffle(mainboard.map((card) => ({ card })));
        const { fromArray, toArray } = sliceEndElements(newLibraryCards, [], STARTING_HAND_SIZE);
        return {
            library: fromArray,
            hand: toArray,
            command: commanders.map(
                (card): ZoneCardInfo => ({
                    card,
                    tapped: false,
                    transformed: false,
                    counters: 0,
                })
            ),
        };
    };

    const animateShuffle = () => {
        setLibraryShuffleAnimationRunning(true);
        setTimeout(() => setLibraryShuffleAnimationRunning(false), 300);
    };

    const restartGame = () => setRestartPopupOpen(true);
    const onCloseRestartPopup = (confirm: boolean) => {
        setRestartPopupOpen(false);
        if (confirm) startGame(currentDeckInfo);
    };

    const startGame = (deckInfo?: DeckInfo) => {
        setCurrentDeckInfo(deckInfo);
        setGameDetailsState({
            life: STARTING_LIFE,
            [ManaColor.White]: 0,
            [ManaColor.Blue]: 0,
            [ManaColor.Black]: 0,
            [ManaColor.Green]: 0,
            [ManaColor.Red]: 0,
            [ManaColor.Colorless]: 0,
        });
        const { library, hand, command } = deckInfo
            ? getStartingZoneCards(deckInfo)
            : { library: [], hand: [], command: [] };
        setGameZonesState({
            [ZoneName.Library]: library,
            [ZoneName.Hand]: hand,
            [ZoneName.Battlefield]: [],
            [ZoneName.Graveyard]: [],
            [ZoneName.Exile]: [],
            [ZoneName.Command]: command,
        });
        animateShuffle();
    };

    const drawOne = () => draw();
    const draw = (num = 1) => {
        const { fromArray, toArray } = sliceEndElements(
            gameZonesState[ZoneName.Library],
            gameZonesState[ZoneName.Hand],
            num
        );
        setGameZonesState((g) => ({
            ...g,
            [ZoneName.Library]: fromArray,
            [ZoneName.Hand]: toArray,
        }));
        return true;
    };

    const shuffleLibrary = () => {
        setGameZonesState((g) => ({
            ...g,
            [ZoneName.Library]: shuffle(g[ZoneName.Library]),
        }));
        animateShuffle();
    };

    const untapAll = () => {
        gameZonesState[ZoneName.Battlefield].forEach((zc) => EnableCardAnimation(zc));
        setGameZonesState((g) => ({
            ...g,
            [ZoneName.Battlefield]: g[ZoneName.Battlefield].map((zc) => ({
                ...zc,
                tapped: false,
            })),
        }));
    };

    const takeNextTurn = () => {
        untapAll();
        draw();
    };

    const tapCard = () => {
        const hoveredZoneAndCard = getHoveredZoneAndCard();
        if (!hoveredZoneAndCard?.zoneCard) return false;
        const { zone, zoneCard } = hoveredZoneAndCard;
        if (zone !== ZoneName.Battlefield) return false;
        zoneCard.tapped = !zoneCard.tapped;
        updateCardStateInZone(zoneCard, zone);
        return true;
    };

    const transformCard = () => {
        const hoveredZoneAndCard = getHoveredZoneAndCard();
        if (!hoveredZoneAndCard?.zoneCard) return;
        const { zone, zoneCard } = hoveredZoneAndCard;
        if (zone === ZoneName.Library) return;
        zoneCard.transformed = !zoneCard.transformed;
        updateCardStateInZone(zoneCard, zone);
    };

    const putCardOnLibraryBottom = () => {
        const hoveredZoneAndCard = getHoveredZoneAndCard();
        if (!hoveredZoneAndCard?.zoneCard) return;
        const { zone, zoneCard } = hoveredZoneAndCard;

        const [piece1, piece2] = sliceCardFromZone(zoneCard, zone);
        const updatedZoneCard = resetZoneCard(zoneCard);
        if (zone === ZoneName.Library) {
            const libraryCards = [updatedZoneCard].concat(piece1, piece2);
            setGameZonesState((g) => ({ ...g, [ZoneName.Library]: libraryCards }));
        } else {
            const libraryCards = [updatedZoneCard].concat(gameZonesState[ZoneName.Library]);
            setGameZonesState((g) => ({
                ...g,
                [ZoneName.Library]: libraryCards,
                [zone]: piece1.concat(piece2),
            }));
        }
    };

    const modifyCounters = (amount: number, relative: boolean) => {
        const hoveredZoneAndCard = getHoveredZoneAndCard();
        if (!hoveredZoneAndCard?.zoneCard) return;
        const { zone, zoneCard } = hoveredZoneAndCard;
        if (zone !== ZoneName.Battlefield) return;
        zoneCard.counters = relative ? (zoneCard.counters ?? 0) + amount : amount;
        updateCardStateInZone(zoneCard, zone);
    };

    const getIncrementedZIndex = (zone: ZoneName) => {
        const cards = gameZonesState[zone];
        const highestIndex = cards.some(() => true)
            ? cards.map((zc) => zc.zIndex ?? 0).reduce((prev, curr) => Math.max(prev, curr))
            : 0;
        return highestIndex + 1;
    };

    const updateZoneCardAfterDrag = (action: CurrentDragInfo) => {
        const { sourceZone } = action;
        let zoneCard = { ...action.zoneCard };
        if (currentDragTargetZone === ZoneName.Battlefield) {
            const { x, y } = zoneCard.node!.getBoundingClientRect();
            zoneCard.x = x - ZONE_BORDER_PX;
            zoneCard.y = y - ZONE_BORDER_PX;
            zoneCard.zIndex = getIncrementedZIndex(ZoneName.Battlefield);
        } else {
            zoneCard = resetZoneCard(zoneCard);
        }

        const [sourceSlice1, sourceSlice2] = sliceCardFromZone(zoneCard, sourceZone);
        if (isDragWithinZone()) {
            const sourceZoneCards = sourceSlice1.concat(zoneCard).concat(sourceSlice2);
            setGameZonesState((g) => ({ ...g, [sourceZone]: sourceZoneCards }));
            return;
        }

        const sourceZoneCards = sourceSlice1.concat(sourceSlice2);
        const targetZoneCards = gameZonesState[currentDragTargetZone!].concat(zoneCard);
        setGameZonesState((g) => ({
            ...g,
            [sourceZone]: sourceZoneCards,
            [currentDragTargetZone!]: targetZoneCards,
        }));
    };

    const onCardDrag = (action: CurrentDragInfo) => {
        if (!currentDrag) setCurrentDrag(action);
        setCurrentDragTargetZone(getHoveredZone());
        return true;
    };

    const onCardDragStop = (action: CurrentDragInfo) => {
        try {
            const draggedToNewZone = isDragToNewZone();
            const draggedWithinBattlefield =
                isDragWithinZone() && action.sourceZone === ZoneName.Battlefield;
            if (draggedToNewZone || draggedWithinBattlefield) {
                // Only allow commanders to be moved to the command zone.
                if (currentDragTargetZone === ZoneName.Command && !action.zoneCard.card.commander) {
                    return false;
                }
                updateZoneCardAfterDrag(action);
            }
            return draggedToNewZone;
        } finally {
            setCurrentDrag(undefined);
            setCurrentDragTargetZone(undefined);
        }
    };

    const searchZone = (zone: ZoneName, e: KeyboardEvent) => {
        setSearchingZone(zone);
        // Prevent input from proliferating into the search box.
        e.preventDefault();
    };
    const searchExile = (e: KeyboardEvent) => searchZone(ZoneName.Exile, e);
    const searchGraveyard = (e: KeyboardEvent) => searchZone(ZoneName.Graveyard, e);
    const searchHand = (e: KeyboardEvent) => searchZone(ZoneName.Hand, e);
    const searchLibrary = (e: KeyboardEvent) => searchZone(ZoneName.Library, e);

    const retrieveCard = (zoneCard?: ZoneCardInfo) => {
        const fromZone = searchingZone;
        const toZone = ZoneName.Hand;
        const isSameZone = fromZone === toZone;
        setSearchingZone(undefined);

        if (!zoneCard || !fromZone) return;
        setGameZonesState((g) => {
            const [piece1, piece2] = sliceCardFromZone(zoneCard, fromZone);
            const fromZoneContents = piece1.concat(piece2);
            const toZoneContents = (isSameZone ? fromZoneContents : g[toZone]).concat(zoneCard);
            return { ...g, [fromZone]: fromZoneContents, [toZone]: toZoneContents };
        });

        if (fromZone === ZoneName.Library) shuffleLibrary();
    };

    const checkShortcutsEnabled = () => currentDrag === undefined && !restartPopupOpen;
    useGlobalShortcuts(
        {
            b: putCardOnLibraryBottom,
            d: drawOne,
            e: searchExile,
            g: searchGraveyard,
            h: searchHand,
            l: searchLibrary,
            n: takeNextTurn,
            r: restartGame,
            s: shuffleLibrary,
            t: transformCard,
            u: untapAll,
            '=': () => modifyCounters(1, true),
            '-': () => modifyCounters(-1, true),
            '0': () => modifyCounters(0, false),
        },
        checkShortcutsEnabled
    );

    const zoneProps = { currentDrag, currentDragTargetZone, onCardDrag, onCardDragStop };
    return (
        <div ref={contentDiv} className='gameLayout'>
            <div style={{ display: 'flex', flex: 1 }}>
                <Lefter
                    gameDetailsState={gameDetailsState}
                    onUpdateGameDetailsState={setGameDetailsState}
                    onDeckSelect={startGame}
                />
                <BattlefieldZone
                    {...zoneProps}
                    name={ZoneName.Battlefield}
                    contents={gameZonesState[ZoneName.Battlefield]}
                    onCardDoubleClick={tapCard}
                />
                <StackZone
                    {...zoneProps}
                    name={ZoneName.Graveyard}
                    contents={gameZonesState[ZoneName.Graveyard]}
                    vertical={true}
                />
            </div>
            <div style={{ display: 'flex' }}>
                <StackZone
                    {...zoneProps}
                    name={ZoneName.Command}
                    contents={gameZonesState[ZoneName.Command]}
                />
                <StackZone
                    {...zoneProps}
                    name={ZoneName.Hand}
                    contents={gameZonesState[ZoneName.Hand]}
                    disablePreview={true}
                />
                <StackZone
                    {...zoneProps}
                    name={ZoneName.Library}
                    contents={gameZonesState[ZoneName.Library]}
                    faceDown={true}
                    showTopOnly={true}
                    wiggleCards={libraryShuffleAnimationRunning}
                    onCardClick={drawOne}
                />
                <StackZone
                    {...zoneProps}
                    name={ZoneName.Exile}
                    contents={gameZonesState[ZoneName.Exile]}
                    disablePreview={true}
                    showTopOnly={true}
                />
            </div>
            <SearchZone
                zone={searchingZone}
                contents={searchingZone ? gameZonesState[searchingZone] : []}
                requestClose={retrieveCard}
            />
            <RestartPopup isOpen={restartPopupOpen} onClose={onCloseRestartPopup} />
        </div>
    );
};
