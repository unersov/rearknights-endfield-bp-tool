import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getFacilityConfig } from '../config/facilities';
import { Dialog, Grid, VStack, Box, Text, CloseButton, Flex, Input } from '@chakra-ui/react';
import { ItemIcon } from './ItemIcon';
import { canFacilityRunMultipleRecipes, canFacilityManuallySelectOutput, findSatisfiedRecipesByInputs, getManualSelectableItemsForFacility } from '../utils/dynamicRecipes';
import { getRecipeItemsByKind } from '../utils/recipePorts';
import { getConnectionCarriedItem } from '../utils/connectionContent';

export const MaterialSelector: React.FC = () => {
    const { materialSelectorMachineId, materialSelectorOutputIndex, machines, connections, closeMaterialSelector, setMachineMaterial } = useGameStore();
    const [query, setQuery] = React.useState('');

    const machine = materialSelectorMachineId ? machines.find(m => m.id === materialSelectorMachineId) : null;
    const config = machine ? getFacilityConfig(machine.machineId) : null;

    const isOpen = !!machine;

    const handleSelect = (materialId: string) => {
        if (machine) {
            setMachineMaterial(machine.id, materialId, materialSelectorOutputIndex);
        }
    };

    if (!config) return null;

    const getInstanceSelectableItems = () => {
        if (!canFacilityManuallySelectOutput(config.id) || !machine) return [];
        if (!canFacilityRunMultipleRecipes(config.id)) return getManualSelectableItemsForFacility(config.id);

        const inputItems = connections
            .filter(connection => connection.toOriginal?.machineId === machine.id)
            .map(connection => getConnectionCarriedItem(connection, machines, new Map(), connections))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
        const inputIds = inputItems.map(item => item.id);
        const unique = new Map<string, NonNullable<typeof inputItems[number]>>();

        inputItems.filter(item => item.state === 'liquid').forEach(item => unique.set(item.id, item));
        findSatisfiedRecipesByInputs(config.id, inputIds).forEach(recipe => {
            getRecipeItemsByKind(recipe, 'outputs', 'pipe').forEach(item => unique.set(item.id, item));
        });

        return [...unique.values()];
    };

    const items = getInstanceSelectableItems();
    const normalizedQuery = query.trim().toLowerCase();
    const filteredItems = normalizedQuery
        ? items.filter(item => [
            item.id,
            item.name,
            item.nameEn,
            item.bottleItemId,
            item.liquidItemId,
        ].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery))
        : items;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && closeMaterialSelector()}>
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content backgroundColor="var(--gray-light)" color="var(--gray-dark)" maxW="md">
                    <Dialog.CloseTrigger asChild>
                        <CloseButton size="sm" />
                    </Dialog.CloseTrigger>
                    <Dialog.Header>
                        <Dialog.Title>
                            <Box borderLeft={"4px solid var(--gray-dark)"} pl={"8px"}>
                                <Flex alignItems={"baseline"}>
                                    <Text color={"var(--gray-dark)"} fontSize={"xl"} fontWeight={"bold"}>
                                        {config.name}
                                    </Text>
                                    <Text color={"var(--gray-dark)"} fontSize={"sm"} fontWeight={"bold"} ml={2}>
                                        {materialSelectorOutputIndex !== null ? `选择出口 ${materialSelectorOutputIndex + 1}` : '请选择物品'}
                                    </Text>
                                </Flex>
                            </Box>
                        </Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body pb={6} pt={2}>
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="搜索当前设施产物"
                            mb="16px"
                            borderColor="var(--gray-dark)"
                            color="var(--gray-dark)"
                        />
                        {items.length === 0 ? (
                            <Box py={8} textAlign="center" color="var(--gray-dark)" opacity={0.6}>
                                <Text>此设施暂无可选产物</Text>
                            </Box>
                        ) : filteredItems.length === 0 ? (
                            <Box py={8} textAlign="center" color="var(--gray-dark)" opacity={0.6}>
                                <Text>未找到相关产物</Text>
                            </Box>
                        ) : (
                            <Grid templateColumns="repeat(auto-fill, minmax(80px, 1fr))" gap={4}>
                                {filteredItems.map((material) => {
                                    return (
                                        <VStack
                                            key={material.id}
                                            as="button"
                                            onClick={() => handleSelect(material.id)}
                                            p={2}
                                            borderRadius="md"
                                            cursor="pointer"
                                            bg="linear-gradient(to bottom, var(--black-light) 60%, var(--green) 150%)"
                                            _hover={{
                                                transform: "translateY(-2px)",
                                                boxShadow: "md"
                                            }}
                                            transition="all 0.2s"
                                            gap={2}
                                            color={"var(--gray-light)"}
                                            borderBottom={"4px solid var(--green)"}
                                        >
                                            <Box w="48px" h="48px" display="flex" alignItems="center" justifyContent="center">
                                                <ItemIcon item={material} size={48} showRarityBorder />
                                            </Box>
                                            <Text fontSize="xs" textAlign="center" fontWeight="medium" wordBreak="break-word" lineHeight="1.2">
                                                {material.name}
                                            </Text>
                                        </VStack>
                                    );
                                })}
                            </Grid>
                        )}
                    </Dialog.Body>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
};
