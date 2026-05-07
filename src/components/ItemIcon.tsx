import { Box, Text } from '@chakra-ui/react';
import type { Item } from '../types';
import { getRarityColor } from '../utils/rarity';

interface ItemIconProps {
    item?: Item;
    label?: string;
    size?: number;
}

export const ItemIcon = ({ item, label, size = 40 }: ItemIconProps) => {
    const borderColor = getRarityColor(item?.rarity);
    const displayLabel = label || item?.name || '?';
    const imageUrl = item ? new URL(`../assets/items/${item.id}.webp`, import.meta.url).href : null;

    return (
        <Box
            width={`${size}px`}
            height={`${size}px`}
            minWidth={`${size}px`}
            position="relative"
            display="flex"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
            borderBottom={borderColor ? `3px solid ${borderColor}` : undefined}
            background="rgba(0,0,0,0.16)"
        >
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={displayLabel}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    onError={(event) => {
                        event.currentTarget.style.display = 'none';
                    }}
                />
            ) : (
                <Text fontSize="xs" color="var(--gray-light)" textAlign="center" px="1">
                    {displayLabel.slice(0, 2)}
                </Text>
            )}
        </Box>
    );
};
