import { Box, Text } from '@chakra-ui/react';
import type { Item } from '../types';
import { getRarityColor } from '../utils/rarity';
import { getItemByIdIncludingDynamic } from '../utils/dynamicRecipes';
import { getItemImageUrl } from '../utils/assetUrls';

interface ItemIconProps {
    item?: Item;
    label?: string;
    size?: number;
    showRarityBorder?: boolean;
}

export const ItemIcon = ({ item, label, size = 40, showRarityBorder = false }: ItemIconProps) => {
    const borderColor = showRarityBorder ? getRarityColor(item?.rarity) : undefined;
    const displayLabel = label || item?.name || '?';
    const imageUrl = item && !item.isDynamicFilledBottle ? getItemImageUrl(item.id) : null;
    const bottleItem = item?.isDynamicFilledBottle ? getItemByIdIncludingDynamic(item.bottleItemId) : undefined;
    const liquidItem = item?.isDynamicFilledBottle ? getItemByIdIncludingDynamic(item.liquidItemId) : undefined;

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
            {item?.isDynamicFilledBottle ? (
                <>
                    {bottleItem ? (
                        <img
                            src={getItemImageUrl(bottleItem.id) || undefined}
                            alt={bottleItem.name}
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
                    {liquidItem && (
                        <img
                            src={getItemImageUrl(liquidItem.id) || undefined}
                            alt={liquidItem.name}
                            style={{
                                position: 'absolute',
                                width: '50%',
                                height: '50%',
                                objectFit: 'contain',
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))',
                            }}
                            onError={(event) => {
                                event.currentTarget.style.display = 'none';
                            }}
                        />
                    )}
                </>
            ) : imageUrl ? (
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
