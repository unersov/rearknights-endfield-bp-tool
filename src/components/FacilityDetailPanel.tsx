import { Badge, Box, Button, CloseButton, Dialog, Flex, Grid, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { ITEMS } from '../config/items';
import { getFacilityConfig } from '../config/facilities';
import { useGameStore } from '../store/gameStore';
import type { Connection, Item, PlacedMachine, Recipe } from '../types';
import { canFacilityManuallySelectOutput, canFacilityManuallySelectRecipe, canFacilityRunMultipleRecipes, findMatchingRecipeByInputs, findSatisfiedRecipesByInputs, getItemByIdIncludingDynamic, getPreferredRecipeOutput, getRecipesForFacility } from '../utils/dynamicRecipes';
import { getRotatedPorts } from '../utils/machineUtils';
import { getRecipeItemsByKind, getRecipePortSlotsForFacility } from '../utils/recipePorts';
import { getConnectionInputs } from '../utils/facilityLogistics';
import { getConnectionCarriedItem } from '../utils/connectionContent';
import { analyzeReactorCrucible, getReactorRecipeLimit, getReactorSlotCount, REACTOR_CRUCIBLE_IDS } from '../utils/reactorCrucible';
import { ItemIcon } from './ItemIcon';
import { RecipeViewer } from './RecipeViewer';

const getPortKindLabel = (kind?: string) => kind === 'pipe' ? '液体' : '物品';

const getPortTone = (kind?: string) => kind === 'pipe' ? 'pipe' : 'item';

const getMachineInputItems = (machine: PlacedMachine, machines: PlacedMachine[], connections: Connection[]) =>
    connections
        .filter(connection => connection.toOriginal?.machineId === machine.id)
        .sort((a, b) => (a.toOriginal?.portIndex ?? 0) - (b.toOriginal?.portIndex ?? 0))
        .map(connection => getConnectionCarriedItem(connection, machines, new Map(), connections))
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
        setReactorSlotItem,
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
    const canSelectRecipe = canFacilityManuallySelectRecipe(config.id);
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

    if (REACTOR_CRUCIBLE_IDS.has(config.id)) {
        const slotCount = getReactorSlotCount(config.id);
        const recipeLimit = getReactorRecipeLimit(config.id);
        const slots = machine.reactorSlotItemIds || [];
        const analysis = analyzeReactorCrucible(config.id, slots);
        const allItems = Object.values(ITEMS).sort((a, b) => a.name.localeCompare(b.name));
        const rotatedOutputs = getRotatedPorts(config.outputs, config.width, config.height, machine.rotation);
        const liquidOutputIndices = rotatedOutputs
            .map((port, index) => ({ port, index }))
            .filter(candidate => candidate.port.kind === 'pipe')
            .slice(0, 2)
            .map(candidate => candidate.index);
        const solidOutputIndex = rotatedOutputs.findIndex(port => port.kind !== 'pipe');

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
                                <Flex align="center" justify="space-between" w="100%" gap="16px">
                                    <Box borderLeft="4px solid var(--gray-dark)" pl="8px">
                                        <Flex align="center" gap="10px" wrap="wrap">
                                            <Text fontSize="2xl" fontWeight="bold">{config.name}</Text>
                                            <Badge borderRadius="full" px="10px">{powerText}</Badge>
                                        </Flex>
                                    </Box>
                                    <Text fontWeight="bold" opacity={0.75}>最多同时进行 {recipeLimit} 个配方</Text>
                                </Flex>
                            </Dialog.Header>
                            <Dialog.Body py="20px">
                                <Grid templateColumns="1fr 320px" gap="20px" alignItems="start">
                                    <Box>
                                        <Text fontSize="sm" opacity={0.75} mb="10px">反应槽位</Text>
                                        <SimpleGrid columns={{ base: 2, md: 3 }} gap="12px">
                                            {Array.from({ length: slotCount }).map((_, index) => {
                                                const item = getItemByIdIncludingDynamic(slots[index]);
                                                return (
                                                    <Box key={index} bg="white" borderRadius="8px" p="12px" border="1px solid rgba(0,0,0,0.12)">
                                                        <Flex align="center" gap="10px" mb="8px">
                                                            <ItemIcon item={item} label="未选择" size={38} />
                                                            <Box minW="0">
                                                                <Text fontSize="sm" fontWeight="bold">槽位 {index + 1}</Text>
                                                                <Text fontSize="xs" opacity={0.65}>{item?.name || '未选择'}</Text>
                                                            </Box>
                                                        </Flex>
                                                        <select
                                                            value={slots[index] || ''}
                                                            onChange={(event) => setReactorSlotItem(machine.id, index, event.target.value)}
                                                            style={{ width: '100%', padding: '6px', border: '1px solid rgba(0,0,0,0.18)', borderRadius: 6 }}
                                                        >
                                                            <option value="">未选择</option>
                                                            {allItems.map(candidate => (
                                                                <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                                                            ))}
                                                        </select>
                                                    </Box>
                                                );
                                            })}
                                        </SimpleGrid>

                                        <Box mt="18px" bg="white" borderRadius="8px" p="14px" border="1px solid rgba(0,0,0,0.12)">
                                            <Flex align="center" gap="8px" mb="10px">
                                                <Text fontWeight="bold">可进行配方</Text>
                                                <Badge>{analysis.runnableRecipes.length}/{recipeLimit}</Badge>
                                            </Flex>
                                            {analysis.runnableRecipes.length === 0 ? (
                                                <Text fontSize="sm" opacity={0.65}>当前槽位组合暂时无法触发配方。</Text>
                                            ) : (
                                                <VStack align="stretch" gap="8px">
                                                    {analysis.runnableRecipes.map(recipe => (
                                                        <Box key={recipe.id} bg="rgba(0,0,0,0.04)" borderRadius="6px" p="10px">
                                                            <Text fontWeight="bold" fontSize="sm">{recipe.name}</Text>
                                                            <Text fontSize="xs" opacity={0.72}>
                                                                {recipe.inputs.map(input => getItemByIdIncludingDynamic(input.materialId)?.name || input.name || input.materialId).join(' + ')}
                                                                {' -> '}
                                                                {recipe.outputs.map(output => getItemByIdIncludingDynamic(output.materialId)?.name || output.name || output.materialId).join(' + ')}
                                                            </Text>
                                                        </Box>
                                                    ))}
                                                </VStack>
                                            )}
                                        </Box>
                                    </Box>

                                    <VStack align="stretch" gap="12px">
                                        <Text fontSize="sm" opacity={0.75}>输出选择</Text>
                                        {liquidOutputIndices.map((outputIndex, localIndex) => (
                                            <ReactorOutputCard
                                                key={outputIndex}
                                                title={`液体输出 ${localIndex + 1}`}
                                                item={getItemByIdIncludingDynamic(machine.selectedOutputItemIds?.[outputIndex])}
                                                options={analysis.liquidOutputs}
                                                onSelect={() => openMaterialSelector(machine.id, outputIndex)}
                                            />
                                        ))}
                                        {solidOutputIndex >= 0 && (
                                            <ReactorOutputCard
                                                title="固体输出 1"
                                                item={getItemByIdIncludingDynamic(machine.selectedOutputItemIds?.[solidOutputIndex])}
                                                options={analysis.solidOutputs}
                                                onSelect={() => openMaterialSelector(machine.id, solidOutputIndex)}
                                            />
                                        )}
                                        <Box bg="white" borderRadius="8px" p="12px" border="1px solid rgba(0,0,0,0.12)">
                                            <Text fontSize="sm" fontWeight="bold" mb="6px">可输出物</Text>
                                            <Text fontSize="xs" opacity={0.72}>液体：{analysis.liquidOutputs.map(item => item.name).join('、') || '无'}</Text>
                                            <Text fontSize="xs" opacity={0.72}>固体：{analysis.solidOutputs.map(item => item.name).join('、') || '无'}</Text>
                                        </Box>
                                    </VStack>
                                </Grid>
                            </Dialog.Body>
                            <Dialog.Footer justifyContent="center" gap="14px" pb="20px">
                                <Button variant="outline" className="gray-btn" onClick={handleStore}>收纳设备</Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Dialog.Root>
            </>
        );
    }

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
        return getConnectionCarriedItem(connection, machines, new Map(), connections);
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
                            {!skipsRecipes && <Button variant="outline" className="yellow-btn" onClick={() => setIsRecipeOpen(true)}>{canSelectRecipe ? '选择采种配方' : '查看配方'}</Button>}
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>
            <RecipeViewer
                isOpen={isRecipeOpen}
                onClose={() => setIsRecipeOpen(false)}
                facilityId={config.id}
                selectedRecipeId={machine.selectedRecipeId}
                onSelectRecipe={canSelectRecipe
                    ? (recipeId) => {
                        setMachineRecipe(machine.id, recipeId);
                        setIsRecipeOpen(false);
                    }
                    : undefined}
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

const ReactorOutputCard = ({
    title,
    item,
    options,
    onSelect,
}: {
    title: string;
    item?: Item;
    options: Item[];
    onSelect: () => void;
}) => (
    <Box bg="white" borderRadius="8px" p="12px" border="1px solid rgba(0,0,0,0.12)">
        <Flex align="center" gap="12px">
            <ItemIcon item={item} label="未选择" size={48} />
            <Box flex="1" minW="0">
                <Text fontWeight="bold">{title}</Text>
                <Text fontSize="sm" opacity={0.72}>{item?.name || '未选择'}</Text>
                <Text fontSize="xs" opacity={0.58}>可选 {options.length} 种</Text>
            </Box>
            <Button size="xs" variant="outline" className="yellow-btn" onClick={onSelect}>更换</Button>
        </Flex>
    </Box>
);
