import { Badge, Box, Button, CloseButton, Dialog, Flex, Input, Text, VStack } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { FACILITIES } from '../config/facilities';
import type { RecipeItemAmount } from '../types';
import { ItemIcon } from './ItemIcon';
import { getAllRecipesIncludingDynamic, getItemByIdIncludingDynamic } from '../utils/dynamicRecipes';

interface RecipeViewerProps {
    isOpen: boolean;
    onClose: () => void;
    facilityId?: string | null;
    selectedRecipeId?: string;
    onSelectRecipe?: (recipeId: string) => void;
}

const facilitiesById = new Map(FACILITIES.map(facility => [facility.id, facility]));
const allRecipes = getAllRecipesIncludingDynamic();

const getEntryText = (entry: RecipeItemAmount) => {
    const item = getItemByIdIncludingDynamic(entry.materialId);
    const name = entry.name || item?.name || entry.materialId || '未知物品';
    return `${entry.amount === 1 ? '' : entry.amount}${name}`;
};

const RecipeItems = ({ entries, emptyText }: { entries: RecipeItemAmount[]; emptyText: string }) => (
    <Flex wrap="wrap" gap="8px">
        {entries.length === 0 ? (
            <Text color="var(--gray)" fontSize="sm">{emptyText}</Text>
        ) : entries.map((entry, index) => {
            const item = getItemByIdIncludingDynamic(entry.materialId);
            return (
                <Flex
                    key={`${entry.materialId || entry.name}-${index}`}
                    align="center"
                    gap="6px"
                    bg="rgba(0,0,0,0.22)"
                    color="var(--gray-light)"
                    p="6px"
                    borderRadius="4px"
                    minWidth="130px"
                >
                    <ItemIcon item={item} label={entry.name} size={34} showRarityBorder />
                    <Box minWidth="0">
                        <Text fontSize="sm" fontWeight="bold" lineHeight="1.2">{getEntryText(entry)}</Text>
                        {entry.materialId && <Text fontSize="xs" color="var(--gray)">{entry.materialId}</Text>}
                    </Box>
                </Flex>
            );
        })}
    </Flex>
);

export const RecipeViewer = ({ isOpen, onClose, facilityId, selectedRecipeId, onSelectRecipe }: RecipeViewerProps) => {
    const [query, setQuery] = useState('');
    const normalizedQuery = query.trim().toLowerCase();
    const baseRecipes = useMemo(
        () => facilityId ? allRecipes.filter(recipe => recipe.machineId === facilityId) : allRecipes,
        [facilityId]
    );

    const filteredRecipes = useMemo(() => {
        if (!normalizedQuery) return baseRecipes;

        return baseRecipes.filter(recipe => {
            const facility = facilitiesById.get(recipe.machineId);
            const searchText = [
                recipe.id,
                recipe.name,
                recipe.machineId,
                facility?.name,
                facility?.nameEn,
                ...recipe.inputs.flatMap(entry => [entry.materialId, entry.name, getItemByIdIncludingDynamic(entry.materialId)?.name]),
                ...recipe.outputs.flatMap(entry => [entry.materialId, entry.name, getItemByIdIncludingDynamic(entry.materialId)?.name]),
            ].filter(Boolean).join(' ').toLowerCase();

            return searchText.includes(normalizedQuery);
        });
    }, [baseRecipes, normalizedQuery]);

    return (
        <Dialog.Root open={isOpen} onOpenChange={(event) => !event.open && onClose()} size="xl">
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content backgroundColor="var(--gray-light)" color="var(--gray-dark)" maxH="86vh">
                    <Dialog.CloseTrigger asChild>
                        <CloseButton size="sm" />
                    </Dialog.CloseTrigger>
                    <Dialog.Header>
                        <Dialog.Title>
                            <Box borderLeft="4px solid var(--gray-dark)" pl="8px">
                                <Text fontSize="xl" fontWeight="bold">{facilityId ? `${facilitiesById.get(facilityId)?.name || facilityId}配方` : '查看配方'}</Text>
                            </Box>
                        </Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body overflowY="auto" pb="6">
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="搜索配方、物品或设施"
                            mb="16px"
                            borderColor="var(--gray-dark)"
                            color="var(--gray-dark)"
                        />

                        {filteredRecipes.length === 0 ? (
                            <Box py="10" textAlign="center">
                                <Text fontWeight="bold">未找到相关配方</Text>
                            </Box>
                        ) : (
                            <VStack align="stretch" gap="12px">
                                {filteredRecipes.map(recipe => {
                                    const facility = facilitiesById.get(recipe.machineId);
                                    const productText = recipe.outputs.length > 0 ? recipe.outputs.map(getEntryText).join('、') : '无产物';

                                    return (
                                        <Box
                                            key={recipe.id}
                                            bg="var(--black-light)"
                                            color="var(--gray-light)"
                                            borderRadius="6px"
                                            p="12px"
                                            borderLeft="4px solid var(--yellow)"
                                        >
                                            <Flex justify="space-between" gap="12px" align="start" mb="10px">
                                                <Box>
                                                    <Text fontWeight="bold" fontSize="md">{productText}</Text>
                                                    <Text fontSize="xs" color="var(--gray)">{recipe.id}</Text>
                                                </Box>
                                                <Flex gap="6px" wrap="wrap" justify="flex-end">
                                                    <Badge>{facility?.name || recipe.machineId}</Badge>
                                                    <Badge colorPalette="yellow">{recipe.durationSeconds}s</Badge>
                                                    {selectedRecipeId === recipe.id && <Badge colorPalette="green">当前</Badge>}
                                                </Flex>
                                            </Flex>

                                            <VStack align="stretch" gap="8px">
                                                <Box>
                                                    <Text fontSize="xs" color="var(--gray)" mb="4px">输入材料</Text>
                                                    <RecipeItems entries={recipe.inputs} emptyText="无输入" />
                                                </Box>
                                                <Box>
                                                    <Text fontSize="xs" color="var(--gray)" mb="4px">输出结果</Text>
                                                    <RecipeItems entries={recipe.outputs} emptyText="无产物" />
                                                </Box>
                                                <Text fontSize="xs" color="var(--gray)">使用设施：{facility?.name || recipe.machineId} / {recipe.machineId}</Text>
                                                {onSelectRecipe && (
                                                    <Button size="xs" variant="outline" className="yellow-btn" alignSelf="flex-start" onClick={() => onSelectRecipe(recipe.id)}>
                                                        选择该配方
                                                    </Button>
                                                )}
                                            </VStack>
                                        </Box>
                                    );
                                })}
                            </VStack>
                        )}
                    </Dialog.Body>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
};
