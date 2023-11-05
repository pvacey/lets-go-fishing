import { Card, List, ListItem, ListItemButton, ListItemText, Modal, Paper } from '@mui/material';
import { SxProps, Theme } from '@mui/system';
import { useState } from 'react';
import { Pane, ZoneName } from './gameLayout';
import { IsCardTransformable, VisualCard } from './visualCard';
import { ZoneCardInfo } from './zone';
import { StyledTextField } from '../controls/styledTextField';
import { CARD_HEIGHT_PX } from '../../global/constants';

interface SearchZoneProps {
    zone?: ZoneName;
    contents: ZoneCardInfo[];
    requestClose(selection?: ZoneCardInfo): void;
}

interface CardOptionProps {
    label: string;
    zoneCard: ZoneCardInfo;
    count: number;
}

const style: SxProps<Theme> = {
    position: 'absolute' as 'absolute',
    top: '10%',
    left: '50%',
    transform: 'translate(-50%, -10%)',
    bgcolor: 'background.default',
    p: '12px',
};

const transformContents = (contents: ZoneCardInfo[]) => {
    const map: { [label: string]: CardOptionProps } = {};
    contents.forEach((zoneCard) => {
        const label: string = zoneCard.card.name;
        if (map[label]) map[label].count++;
        else map[label] = { label, zoneCard, count: 1 };
    });

    const cardOptions = [];
    for (let label in map) cardOptions.push(map[label]);
    return cardOptions.reverse();
};

export const SearchZone = ({ zone, contents, requestClose }: SearchZoneProps) => {
    const [searchString, setSearchString] = useState('');
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const options = transformContents(contents).filter((c) =>
        c.label.toLowerCase().includes(searchString)
    );
    const selectedZoneCard = options.length > 0 ? options[selectedIndex].zoneCard : undefined;

    const createZoneCard = (transformed: boolean): ZoneCardInfo | undefined => {
        return selectedZoneCard ? { ...selectedZoneCard, transformed } : undefined;
    };

    const frontCard = createZoneCard(false);
    const backCard =
        selectedZoneCard && IsCardTransformable(selectedZoneCard)
            ? createZoneCard(true)
            : undefined;
    let open = !!zone;

    const close = (accepted: boolean) => {
        requestClose(accepted ? selectedZoneCard : undefined);

        setSearchString('');
        setSelectedIndex(0);
    };

    const processKeys = (key: string) => {
        switch (key) {
            case 'Enter':
                if (selectedZoneCard) close(true);
                break;
            case 'ArrowUp':
                setSelectedIndex((si) => Math.max(0, si - 1));
                break;
            case 'ArrowDown':
                setSelectedIndex((si) => Math.min(options.length - 1, si + 1));
                break;
        }
    };

    return (
        <Modal open={open} onClose={() => close(false)}>
            <Pane
                sx={{ ...style, display: 'flex', gap: '12px', height: `${CARD_HEIGHT_PX * 2}px` }}
            >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <VisualCard zoneCard={frontCard} />
                    <VisualCard zoneCard={backCard} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Paper>
                        <StyledTextField
                            sx={{ width: 400 }}
                            placeholder={`Search ${zone}`}
                            autoFocus
                            onChange={(e) => setSearchString(e.target.value.toLowerCase())}
                            onKeyDown={(e) => processKeys(e.key)}
                        />
                    </Paper>
                    <Card sx={{ marginBottom: '1px' }}>
                        <List sx={{ height: '100%', overflowY: 'auto' }} disablePadding dense>
                            {options.map(({ label, count }, index) => {
                                return (
                                    <ListItem disablePadding key={label}>
                                        <ListItemButton
                                            selected={index === selectedIndex}
                                            onClick={() => {
                                                setSelectedIndex(index);
                                                close(true);
                                            }}
                                        >
                                            <ListItemText
                                                primary={label}
                                                secondary={count > 1 ? `x${count}` : undefined}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Card>
                </div>
            </Pane>
        </Modal>
    );
};
