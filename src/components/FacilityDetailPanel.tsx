import { Badge, Box, Button, CloseButton, Dialog, Flex, Grid, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { getFacilityConfig } from '../config/facilities';
import { useGameStore } from '../store/gameStore';
import type { Connection, Item, PlacedMachine, Recipe } from '../types';
import { canFacilityManuallySelectOutput, canFacilityRunMultipleRecipes, findMatchingRecipeByInputs, findSatisfiedRecipesByInputs, getItemByIdIncludingDynamic, getPreferredRecipeOutput, getRecipesForFacility } from '../utils/dynamicRecipes';
import { getRotatedPorts } from '../utils/machineUtils';
import { getRecipeItemsByKind, getRecipePortSlotsForFacility } from '../utils/recipePorts';
import { getConnectionInputs } from '../utils/facilityLogistics';
import { getConnectionCarriedItem } from '../utils/connectionContent';
import { ItemIcon } from './ItemIcon';
import { RecipeViewer } from './RecipeViewer';

const getPortKindLabel = (kind?: string) => kind === 'pipe' ? '液体' : '物品';

const getPortTone = (kind?: string) => kind === 'pipe' ? 'pipe' : 'item';

const getMachineInputItems = (machine: PlacedMachine, machines: PlacedMachine[], connections: Connection[]) =>
    connections
        .filter(connection => connection.toOriginal?.machineId === machine.id)
        .sort((a, b) => (a.toOriginal?.portIndex ?? 0) - (b.toOriginal?.portIndex ?? 0))
        .map(connection => getConnectionCarriedItem(connection, machines))
        .filter((item): item is Item => Boolean(item));

const findCurrentRecipe = (machine: PlacedMachine, inputItems: Item[]): Recipe | undefined => {
    const selectedRecipe = machine.selectedRecipeId
        ? getRecipesForFacility(machine.machineId).find(recipe => recipe.id === machine.selectedRecipeId)
        : undefined;
    if (selectedRecipe) return selectedRecipe;
    const inputRecipe = findMatchingRecipeByInputs(machine.machineId, inputItems.map(item => item.id));
    if (inputRecipe) return inputRecipe;
    return getRecipesForFacility(machine.machineId).find(recipe =>
        recipe.outputs.some(output => output.materialId === machine.selectedMaterialId)
    );
};

export const FacilityDetailPanel = () => {
    const {
        facilityDetailMachineId,
        closeFacilityDetail,
        machines,
        connections,
        openMaterialSelector,
        setMachineRecipe,
        removeMachine,
    } = useGameStore();
    const [isRecipeOpen, setIsRecipeOpen] = useState(false);

    const machine = facilityDetailMachineId ? machines.find(m => m.id === facilityDetailMachineId) : null;
    const config = machine ? getFacilityConfig(machine.machineId) : null;

    if (!machine || !config) return null;

    const inputItems = getMachineInputItems(machine, machines, connections);
    const currentRecipe = findCurrentRecipe(machine, inputItems);
    const currentRecipes = canFacilityRunMultipleRecipes(config.id)
        ? findSatisfiedRecipesByInputs(config.id, inputItems.map(item => item.id))
        : currentRecipe ? [currentRecipe] : [];
    const inputPorts = config.id === 'automation-core' || canFacilityRunMultipleRecipes(config.id)
        ? getRotatedPorts(config.inputs, config.width, config.height, machine.rotation)
        : getRecipePortSlotsForFacility(config.id, 'inputs', currentRecipe);
    const outputPorts = config.id === 'automation-core' || canFacilityRunMultipleRecipes(config.id)
        ? getRotatedPorts(config.outputs, config.width, config.height, machine.rotation)
        : getRecipePortSlotsForFacility(config.id, 'outputs', currentRecipe);
    const canSelect = canFacilityManuallySelectOutput(config.id);
    const skipsRecipes = config.id === 'depot-unloader' || config.id === 'fluid-tank' || config.id === 'fluid-pump' || config.id === 'acid-resistant-pump-mk-ii';
    const selectedOutput = machine.selectedMaterialId ? getItemByIdIncludingDynamic(machine.selectedMaterialId) : undefined;
    const recipeOutput = currentRecipes.length > 0 ? getPreferredRecipeOutput(currentRecipes[0]) : undefined;
    const summaryItem = recipeOutput || selectedOutput;
    const displayRecipe = currentRecipe || currentRecipes[0];
    const powerText = config.power > 0 ? `功耗 ${config.power} MW` : config.power < 0 ? `供电 ${Math.abs(config.power)} MW` : '不耗电';

    const handleStore = () => {
        removeMachine(machine.id);
        closeFacilityDetail();
    };

    const getInputItemForPort = (portIndex: number) => {
        const port = inputPorts[portIndex];
        if (!port) return undefined;
        if (!('x' in port)) return inputItems[portIndex];
        const connection = connections.find(candidate => {
            if (candidate.toOriginal?.machineId !== machine.id) return false;
            const kind = candidate.kind || 'belt';
            const typedPort = getConnectionInputs(config, machine, kind)[candidate.toOriginal.portIndex];
            if (!typedPort) return false;
            return typedPort.x === port.x &&
                typedPort.y === port.y &&
                typedPort.side === port.side &&
                (typedPort.kind || 'item') === (port.kind || 'item');
        });
        if (!connection) return undefined;
        return getConnectionCarriedItem(connection, machines);
    };

    return (
        <>
            <Dialog.Root open={Boolean(machine)} onOpenChange={(event) => !event.open && closeFacilityDetail()} size="xl">
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content backgroundColor="var(--gray-light)" color="var(--gray-dark)" maxW="1120px">
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="sm" />
                        </Dialog.CloseTrigger>
                        <Dialog.Header borderBottom="1px solid rgba(0,0,0,0.12)">
                            <Box w="100%">
                                <Flex align="center" justify="space-between" gap="16px">
                                    <Box borderLeft="4px solid var(--gray-dark)" pl="8px">
                                        <Flex align="center" gap="10px" wrap="wrap">
                                            <Text fontSize="2xl" fontWeight="bold">{config.name}</Text>
                                            <Badge borderRadius="full" px="10px">{powerText}</Badge>
                                        </Flex>
                                    </Box>
                                    <Text color="var(--gray-dark)" opacity={0.75} fontWeight="bold">
                                        {summaryItem ? summaryItem.name : displayRecipe?.name || '暂无当前配方'}
                                    </Text>
                                </Flex>
                            </Box>
                        </Dialog.Header>
                        <Dialog.Body py="20px">
                            <Grid templateColumns="1fr 170px 1fr" gap="20px" alignItems="center">
                                <VStack align="stretch" gap="12px">
                                    <Text fontSize="sm" color="var(--gray-dark)" opacity={0.75}>输入</Text>
                                    {inputPorts.length === 0 ? <PortEmpty text="无输入口" /> : inputPorts.map((port, index) => {
                                        const item = getInputItemForPort(index);
                                        return (
                                            <PortCard
                                                key={`input-${index}`}
                                                title={`${getPortKindLabel(port.kind)}输入`}
                                                tone={getPortTone(port.kind)}
                                                item={item}
                                                fallback="等待输入"
                                                rate={item ? '0/分钟' : ''}
                                            />
                                        );
                                    })}
                                </VStack>

                                <VStack gap="10px" textAlign="center">
                                    <Text fontSize="sm" color="var(--gray-dark)" opacity={0.7}>完成周期</Text>
                                    <Box bg="var(--black-light)" color="var(--gray-light)" borderRadius="999px" px="26px" py="12px" fontWeight="bold" fontSize="xl">
                                        {displayRecipe ? `${displayRecipe.durationSeconds} 秒/次` : '-'}
                                    </Box>
                                    <Text fontSize="xs" color="var(--gray-dark)" opacity={0.75}>当前配方每轮完成一次的时间。</Text>
                                </VStack>

                                <VStack align="stretch" gap="12px">
                                    <Text fontSize="sm" color="var(--gray-dark)" opacity={0.75}>输出</Text>
                                    {outputPorts.length === 0 ? <PortEmpty text="无输出口" /> : outputPorts.map((port, index) => {
                                        const perPortItem = machine.selectedOutputItemIds?.[index]
                                            ? getItemByIdIncludingDynamic(machine.selectedOutputItemIds[index])
                                            : undefined;
                                        const recipePortItem = 'item' in port ? port.item : undefined;
                                        const portKind = port.kind === 'pipe' ? 'pipe' : 'item';
                                        const sameKindIndex = outputPorts.slice(0, index + 1).filter(candidate => (candidate.kind === 'pipe' ? 'pipe' : 'item') === portKind).length - 1;
                                        const multiRecipeItem = currentRecipes.flatMap(recipe => getRecipeItemsByKind(recipe, 'outputs', portKind))[sameKindIndex];
                                        const item = perPortItem || multiRecipeItem || (config.id === 'automation-core' ? undefined : recipePortItem);
                                        const isSelectablePort = canSelect && (config.id !== 'automation-core' || port.kind !== 'pipe') && (config.id !== 'reactor-crucible' && config.id !== 'expanded-crucible' || port.kind === 'pipe');
                                        return (
                                            <PortCard
                                                key={`output-${index}`}
                                                title={`${getPortKindLabel(port.kind)}输出`}
                                                subtitle={`出口 ${index + 1}`}
                                                tone={getPortTone(port.kind)}
                                                item={item}
                                                fallback={isSelectablePort ? '未选择输出物品' : '无当前产物'}
                                                rate={item ? '0/分钟' : ''}
                                                onSelect={isSelectablePort ? () => openMaterialSelector(machine.id, config.id === 'automation-core' || config.id === 'reactor-crucible' || config.id === 'expanded-crucible' ? index : undefined) : undefined}
                                            />
                                        );
                                    })}
                                </VStack>
                            </Grid>
                        </Dialog.Body>
                        <Dialog.Footer justifyContent="center" gap="14px" pb="20px">
                            <Button variant="outline" className="gray-btn" onClick={handleStore}>收纳设备</Button>
                            {!skipsRecipes && <Button variant="outline" className="yellow-btn" onClick={() => setIsRecipeOpen(true)}>查看配方</Button>}
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>
            <RecipeViewer
                isOpen={isRecipeOpen}
                onClose={() => setIsRecipeOpen(false)}
                facilityId={config.id}
                selectedRecipeId={machine.selectedRecipeId}
                onSelectRecipe={(recipeId) => {
                    setMachineRecipe(machine.id, recipeId);
                    setIsRecipeOpen(false);
                }}
            />
        </>
    );
};

const PortEmpty = ({ text }: { text: string }) => (
    <Box bg="var(--black-light)" color="var(--gray-light)" borderRadius="8px" p="18px" opacity={0.78}>
        <Text fontSize="sm">{text}</Text>
    </Box>
);

const PortCard = ({
    title,
    subtitle,
    tone,
    item,
    fallback,
    rate,
    onSelect,
}: {
    title: string;
    subtitle?: string;
    tone?: 'item' | 'pipe';
    item?: Item;
    fallback: string;
    rate?: string;
    onSelect?: () => void;
}) => (
    <Box
        bg={tone === 'pipe' ? 'linear-gradient(180deg, #1d5f78 0%, #0d1b24 100%)' : 'linear-gradient(180deg, #4f5458 0%, #111 100%)'}
        color="var(--gray-light)"
        borderRadius="8px"
        p="14px"
        boxShadow="0 12px 22px rgba(0,0,0,0.18)"
        border={tone === 'pipe' ? '1px solid rgba(117,210,255,0.65)' : '1px solid rgba(196,193,193,0.45)'}
    >
        <Flex gap="12px" align="center">
            <Box border={tone === 'pipe' ? '3px solid rgba(117,210,255,0.8)' : '3px solid rgba(196,193,193,0.75)'} borderRadius="18px" p="8px">
                <ItemIcon item={item} label={fallback} size={54} />
            </Box>
            <Box flex="1" minW="0">
                <Flex align="center" justify="space-between" gap="8px" mb="8px">
                    <Box>
                        <Text fontWeight="bold">{title}</Text>
                        {subtitle && <Text fontSize="xs" color="var(--gray)">{subtitle}</Text>}
                    </Box>
                    {rate && <Text fontSize="sm" color="var(--gray)">{rate}</Text>}
                </Flex>
                <Flex align="center" gap="8px" bg="rgba(255,255,255,0.08)" borderRadius="8px" p="8px">
                    <ItemIcon item={item} label={fallback} size={30} />
                    <Text fontSize="sm" fontWeight="bold">{item?.name || fallback}</Text>
                </Flex>
                {onSelect && (
                    <Button mt="10px" size="xs" variant="outline" className="yellow-btn" onClick={onSelect}>
                        选择物品
                    </Button>
                )}
            </Box>
        </Flex>
    </Box>
);
