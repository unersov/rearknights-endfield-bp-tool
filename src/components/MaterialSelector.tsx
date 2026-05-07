import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getFacilityConfig } from '../config/facilities';
import { Dialog, Grid, VStack, Box, Text, CloseButton, Flex } from '@chakra-ui/react';
import { ItemIcon } from './ItemIcon';

export const MaterialSelector: React.FC = () => {
    const { materialSelectorMachineId, machines, closeMaterialSelector, setMachineMaterial } = useGameStore();

    const machine = materialSelectorMachineId ? machines.find(m => m.id === materialSelectorMachineId) : null;
    const config = machine ? getFacilityConfig(machine.machineId) : null;

    const isOpen = !!machine;

    const handleSelect = (materialId: string) => {
        if (machine) {
            setMachineMaterial(machine.id, materialId);
        }
    };

    if (!config) return null;

    const items = config.allowedItems || config.allowedMaterials || [];

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
                                        请选择物品
                                    </Text>
                                </Flex>
                            </Box>
                        </Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body pb={6} pt={2}>
                        {items.length === 0 ? (
                            <Box py={8} textAlign="center" color="var(--gray-dark)" opacity={0.6}>
                                <Text>此设施暂无可选物品</Text>
                            </Box>
                        ) : (
                            <Grid templateColumns="repeat(auto-fill, minmax(80px, 1fr))" gap={4}>
                                {items.map((material) => {
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
                                                <ItemIcon item={material} size={48} />
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
