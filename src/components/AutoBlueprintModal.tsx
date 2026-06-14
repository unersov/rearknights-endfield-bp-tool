import { Badge, Box, Button, CloseButton, Dialog, Flex, Input, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ITEMS } from '../config/items';
import type { Item } from '../types';
import { getFilledBottleItems } from '../utils/dynamicRecipes';
import { useAutoPlannerSettingsStore } from '../store/autoPlannerSettingsStore';
import { useGameStore } from '../store/gameStore';
import { resolveProductionGraph, type AutoPlannerTarget } from '../autoPlanner/recipeResolver';
import { buildAutoLayout, type AutoPlannerReport } from '../autoPlanner/autoLayoutPlanner';
import { ItemIcon } from './ItemIcon';

interface AutoBlueprintModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface TargetDraft {
    itemId: string;
    ratePerMinute: number;
}

const selectableItems = () => {
    const all = [...Object.values(ITEMS), ...getFilledBottleItems()];
    const unique = new Map<string, Item>();
    all.forEach(item => {
        if (!item.id || item.storageCategory === 'unknown') return;
        if (item.storageCategory === 'minerals' || item.itemCategory === 'natural_resource') return;
        unique.set(item.id, item);
    });
    const rarityRank: Record<string, number> = {
        orange: 6,
        gold: 5,
        purple: 4,
        blue: 3,
        green: 2,
        gray: 1,
        unknown: 0,
    };
    return [...unique.values()].sort((a, b) => {
        if (Boolean(a.isFinalProduct) !== Boolean(b.isFinalProduct)) return a.isFinalProduct ? -1 : 1;
        const rarityDiff = (rarityRank[b.rarity || 'unknown'] || 0) - (rarityRank[a.rarity || 'unknown'] || 0);
        if (rarityDiff !== 0) return rarityDiff;
        return (a.nameEn || a.name || a.id).localeCompare(b.nameEn || b.name || b.id);
    });
};

const parseRate = (value: string) => {
    if (value.trim() === '') return 1;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 1;
};

const defaultTargetRate = (item: Item) => item.state === 'liquid' ? 120 : 30;

export const AutoBlueprintModal = ({ isOpen, onClose }: AutoBlueprintModalProps) => {
    const [targets, setTargets] = useState<TargetDraft[]>([]);
    const [search, setSearch] = useState('');
    const [isPicking, setIsPicking] = useState(false);
    const [report, setReport] = useState<AutoPlannerReport | null>(null);
    const [error, setError] = useState('');
    const getEffectiveSettings = useAutoPlannerSettingsStore(state => state.getEffectiveSettings);
    const plannerProgress = useAutoPlannerSettingsStore(state => state.plannerProgress);
    const setPlannerProgress = useAutoPlannerSettingsStore(state => state.setPlannerProgress);
    const { machines, connections, gridWidth, gridHeight, applyAutoPlan } = useGameStore();
    const items = useMemo(selectableItems, []);
    const filteredItems = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return items.slice(0, 80);
        return items
            .filter(item =>
                item.name.toLowerCase().includes(keyword) ||
                item.id.toLowerCase().includes(keyword) ||
                item.nameEn?.toLowerCase().includes(keyword)
            )
            .slice(0, 100);
    }, [items, search]);

    const addTarget = (item: Item) => {
        setTargets(prev => prev.some(target => target.itemId === item.id)
            ? prev
            : [...prev, { itemId: item.id, ratePerMinute: defaultTargetRate(item) }]
        );
        setIsPicking(false);
        setSearch('');
    };

    const updateProgress = (stage: string, percent: number) => {
        setPlannerProgress({ stage, percent, status: 'running' });
    };

    const yieldToUi = () => new Promise<void>(resolve => setTimeout(resolve, 0));

    const loadRegressionTargets = () => {
        setTargets([
            { itemId: 'sc_wulin_battery', ratePerMinute: 0.01 },
            { itemId: 'cuprium_component', ratePerMinute: 0.01 },
        ]);
        setReport(null);
        setError('');
        setPlannerProgress(null);
    };

    const runPlanner = async () => {
        setError('');
        setReport(null);
        updateProgress('分析目标产物', 5);
        await yieldToUi();

        const plannerTargets: AutoPlannerTarget[] = targets
            .filter(target => target.ratePerMinute > 0)
            .map(target => ({ itemId: target.itemId, ratePerMinute: target.ratePerMinute }));
        if (plannerTargets.length === 0) {
            const message = '请先添加至少一个目标物品，并设置大于 0 的目标产量。';
            setError(message);
            setPlannerProgress({ stage: '失败', percent: 100, status: 'failed', error: message });
            return;
        }

        try {
            const settings = getEffectiveSettings();
            updateProgress('展开配方链', 16);
            await yieldToUi();
            const graphResult = resolveProductionGraph(plannerTargets, settings, machines, connections);
            if (!graphResult.ok) {
                setError(graphResult.error);
                setPlannerProgress({ stage: '失败', percent: 100, status: 'failed', error: graphResult.error });
                return;
            }

            updateProgress('计算产率', 28);
            await yieldToUi();
            updateProgress('分配设施数量', 38);
            await yieldToUi();
            let layoutResult = await buildAutoLayout(graphResult.graph, settings, machines, connections, gridWidth, gridHeight, updateProgress);
            if (!layoutResult.ok) {
                updateProgress('连接物流线路', 40);
                await yieldToUi();
                layoutResult = await buildAutoLayout(graphResult.graph, settings, machines, connections, gridWidth, gridHeight, updateProgress);
            }
            for (let retry = 2; !layoutResult.ok && retry <= 4; retry += 1) {
                updateProgress(`Retrying layout ${retry}/4`, 40 + retry * 8);
                await yieldToUi();
                layoutResult = await buildAutoLayout(graphResult.graph, settings, machines, connections, gridWidth, gridHeight, updateProgress);
            }
            if (!layoutResult.ok) {
                setError(layoutResult.error);
                setPlannerProgress({ stage: '失败', percent: 100, status: 'failed', error: layoutResult.error });
                return;
            }

            updateProgress('校验蓝图', 96);
            await yieldToUi();
            applyAutoPlan(layoutResult.result.machines, layoutResult.result.connections, Math.max(200, gridWidth), Math.max(200, gridHeight));
            setReport(layoutResult.result.report);
            setPlannerProgress({ stage: '完成', percent: 100, status: 'success' });
        } catch (event) {
            const message = event instanceof Error ? event.message : '自动规划失败：未知错误。';
            setError(message);
            setPlannerProgress({ stage: '失败', percent: 100, status: 'failed', error: message });
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(event) => !event.open && onClose()} size="xl">
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content backgroundColor="var(--gray-light)" color="var(--gray-dark)" maxW="1040px">
                    <Dialog.CloseTrigger asChild>
                        <CloseButton size="sm" />
                    </Dialog.CloseTrigger>
                    <Dialog.Header borderBottom="1px solid rgba(0,0,0,0.12)">
                        <Box>
                            <Dialog.Title>自动蓝图规划</Dialog.Title>
                            <Text fontSize="sm" opacity={0.75}>选择目标物品后，会按产率、协议数量、供电和物流校验生成产线。</Text>
                        </Box>
                    </Dialog.Header>
                    <Dialog.Body maxH="72vh" overflowY="auto">
                        <Flex justify="space-between" align="center" mb="12px">
                            <Text fontSize="lg" fontWeight="bold">目标物品</Text>
                            <Button size="sm" variant="outline" className="gray-btn" onClick={loadRegressionTargets}>
                                中容武陵电池 + 赤铜装备原件
                            </Button>
                            <Button size="sm" variant="outline" className="yellow-btn" onClick={() => setIsPicking(true)}>
                                <Plus size={16} /> 添加物品
                            </Button>
                        </Flex>

                        {targets.length === 0 ? (
                            <Box bg="white" borderRadius="8px" p="18px" border="1px solid rgba(0,0,0,0.1)">
                                <Text opacity={0.75}>尚未添加目标物品。</Text>
                            </Box>
                        ) : (
                            <VStack align="stretch" gap="10px">
                                {targets.map((target, index) => {
                                    const item = items.find(candidate => candidate.id === target.itemId);
                                    return (
                                        <Flex key={target.itemId} bg="white" borderRadius="8px" p="10px" border="1px solid rgba(0,0,0,0.1)" align="center" gap="12px">
                                            <ItemIcon item={item} size={38} />
                                            <Box flex="1" minW="0">
                                                <Text fontWeight="bold">{item?.name || target.itemId}</Text>
                                                <Text fontSize="xs" opacity={0.68}>{item?.nameEn || target.itemId}</Text>
                                            </Box>
                                            <Input
                                                type="number"
                                                min={0}
                                                width="130px"
                                                value={target.ratePerMinute}
                                                onChange={(event) => setTargets(prev => prev.map((candidate, candidateIndex) =>
                                                    candidateIndex === index ? { ...candidate, ratePerMinute: parseRate(event.target.value) } : candidate
                                                ))}
                                            />
                                            <Text fontSize="sm" opacity={0.75}>/分钟</Text>
                                            <Button size="sm" variant="outline" className="gray-btn" onClick={() => setTargets(prev => prev.filter(candidate => candidate.itemId !== target.itemId))}>
                                                <Trash2 size={16} />
                                            </Button>
                                        </Flex>
                                    );
                                })}
                            </VStack>
                        )}

                        {isPicking && (
                            <Box mt="16px" bg="rgba(255,255,255,0.76)" borderRadius="8px" p="14px" border="1px solid rgba(0,0,0,0.12)">
                                <Flex align="center" gap="10px" mb="12px">
                                    <Input placeholder="搜索物品名称 / 英文名 / ID" value={search} onChange={(event) => setSearch(event.target.value)} />
                                    <Button variant="outline" className="gray-btn" onClick={() => setIsPicking(false)}>取消</Button>
                                </Flex>
                                <SimpleGrid columns={{ base: 1, md: 3 }} gap="8px">
                                    {filteredItems.map(item => (
                                        <Button
                                            key={item.id}
                                            variant="outline"
                                            justifyContent="flex-start"
                                            h="54px"
                                            bg="white"
                                            onClick={() => addTarget(item)}
                                        >
                                            <ItemIcon item={item} size={28} />
                                            <Box textAlign="left" minW="0">
                                                <Text fontSize="sm" fontWeight="bold">{item.name}</Text>
                                                <Text fontSize="xs" opacity={0.65}>{item.nameEn || item.id}</Text>
                                            </Box>
                                        </Button>
                                    ))}
                                </SimpleGrid>
                            </Box>
                        )}

                        {plannerProgress && (
                            <Box mt="16px" bg="white" borderRadius="8px" p="14px" border="1px solid rgba(0,0,0,0.1)">
                                <Flex justify="space-between" align="center" mb="8px">
                                    <Text fontWeight="bold">{plannerProgress.stage}</Text>
                                    <Text fontSize="sm" opacity={0.75}>{Math.round(plannerProgress.percent)}%</Text>
                                </Flex>
                                <Box h="10px" bg="rgba(0,0,0,0.12)" borderRadius="999px" overflow="hidden">
                                    <Box
                                        h="100%"
                                        width={`${Math.max(0, Math.min(100, plannerProgress.percent))}%`}
                                        bg={plannerProgress.status === 'failed' ? '#d64532' : 'var(--green)'}
                                        transition="width 160ms ease"
                                    />
                                </Box>
                                {plannerProgress.error && <Text mt="8px" fontSize="sm" color="#8a1f11">{plannerProgress.error}</Text>}
                            </Box>
                        )}

                        {error && (
                            <Box mt="16px" bg="#fff1f0" color="#8a1f11" border="1px solid #ffb3a7" borderRadius="8px" p="12px">
                                <Text fontWeight="bold">{error}</Text>
                            </Box>
                        )}

                        {report && <ReportView report={report} />}
                    </Dialog.Body>
                    <Dialog.Footer>
                        <Button variant="outline" className="gray-btn" onClick={onClose}>关闭</Button>
                        <Button variant="outline" className="yellow-btn" onClick={runPlanner} disabled={plannerProgress?.status === 'running'}>开始规划并摆放</Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
};

const ReportView = ({ report }: { report: AutoPlannerReport }) => (
    <Box mt="16px" bg="white" borderRadius="8px" p="14px" border="1px solid rgba(0,0,0,0.1)">
        <Flex align="center" gap="8px" mb="10px">
            <Text fontWeight="bold">规划完成</Text>
            <Badge>自动生成</Badge>
        </Flex>
        <ReportList title="目标物品" items={report.targets} />
        <ReportList title="使用配方" items={report.recipes} />
        <ReportList title="放置设施" items={Object.entries(report.facilities).map(([name, count]) => `${name} x ${count}`)} />
        <ReportList title="受限设施使用" items={Object.entries(report.limitedFacilities).map(([name, count]) => `${name} x ${count}`)} />
        <ReportList title="仓库取出" items={report.warehouseSources} />
        <ReportList title="产线生产" items={report.producedItems} />
        {report.warnings.length > 0 && <ReportList title="提示" items={report.warnings} />}
    </Box>
);

const ReportList = ({ title, items }: { title: string; items: string[] }) => (
    <Box mb="10px">
        <Text fontSize="sm" fontWeight="bold" mb="4px">{title}</Text>
        {items.length === 0 ? <Text fontSize="sm" opacity={0.65}>无</Text> : (
            <VStack align="stretch" gap="3px">
                {items.map((item, index) => <Text key={`${title}-${index}`} fontSize="sm" opacity={0.82}>{item}</Text>)}
            </VStack>
        )}
    </Box>
);
