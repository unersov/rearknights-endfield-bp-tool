import { Badge, Box, Button, CloseButton, Dialog, Flex, Input, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { getLimitedFacilityName, getPlannerResourceItems, LIMITED_FACILITY_IDS, useAutoPlannerSettingsStore } from '../store/autoPlannerSettingsStore';
import { ItemIcon } from './ItemIcon';

interface AutoBlueprintSettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const numberValue = (value: string) => {
    if (value.trim() === '') return '';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const integerValue = (value: string) => {
    if (value.trim() === '') return '';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

export const AutoBlueprintSettingsPanel = ({ isOpen, onClose }: AutoBlueprintSettingsPanelProps) => {
    const {
        facilityLimits,
        protocolLimit,
        setResourceRate,
        setFacilityLimit,
        setProtocolLimit,
        resetResourceRates,
        resetFacilityLimits,
        getEffectiveSettings,
    } = useAutoPlannerSettingsStore();
    const { minerals, naturalLiquids } = getPlannerResourceItems();
    const settings = getEffectiveSettings();

    return (
        <Dialog.Root open={isOpen} onOpenChange={(event) => !event.open && onClose()} size="xl">
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content backgroundColor="var(--gray-light)" color="var(--gray-dark)" maxW="980px">
                    <Dialog.CloseTrigger asChild>
                        <CloseButton size="sm" />
                    </Dialog.CloseTrigger>
                    <Dialog.Header borderBottom="1px solid rgba(0,0,0,0.12)">
                        <Box>
                            <Dialog.Title>自动蓝图设置</Dialog.Title>
                            <Text fontSize="sm" opacity={0.75}>资源产量单位为数量/分钟；9999 按无限处理。</Text>
                        </Box>
                    </Dialog.Header>
                    <Dialog.Body maxH="70vh" overflowY="auto">
                        <Flex justify="space-between" align="center" mb="12px">
                            <Text fontSize="lg" fontWeight="bold">资源生产速度</Text>
                            <Button size="sm" variant="outline" className="gray-btn" onClick={resetResourceRates}>重置资源默认值</Button>
                        </Flex>
                        <ResourceGroup title="矿物" items={minerals} rates={settings.resourceRates} onChange={setResourceRate} />
                        <ResourceGroup title="自然资源液体" items={naturalLiquids} rates={settings.resourceRates} onChange={setResourceRate} />

                        <Flex justify="space-between" align="center" mt="22px" mb="12px">
                            <Box>
                                <Text fontSize="lg" fontWeight="bold">设施数量限制</Text>
                                <Text fontSize="sm" opacity={0.75}>协议核心固定为 1 个，不在这里显示。</Text>
                            </Box>
                            <Button size="sm" variant="outline" className="gray-btn" onClick={resetFacilityLimits}>重置设施默认值</Button>
                        </Flex>
                        <Box bg="white" borderRadius="8px" p="12px" border="1px solid rgba(0,0,0,0.1)" mb="12px">
                            <Text fontWeight="bold" mb="8px">协议数量</Text>
                            <Input
                                type="number"
                                min={0}
                                step={1}
                                value={protocolLimit ?? 9999}
                                onChange={(event) => setProtocolLimit(integerValue(event.target.value))}
                            />
                            <Text fontSize="xs" opacity={0.7} mt="6px">传送带和管道不消耗协议数量，其他可摆放设备都会计入。</Text>
                        </Box>
                        <SimpleGrid columns={{ base: 1, md: 3 }} gap="12px">
                            {LIMITED_FACILITY_IDS.map(facilityId => (
                                <Box key={facilityId} bg="white" borderRadius="8px" p="12px" border="1px solid rgba(0,0,0,0.1)">
                                    <Text fontWeight="bold" mb="8px">{getLimitedFacilityName(facilityId)}</Text>
                                    <Input
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={facilityLimits[facilityId] ?? 99}
                                        onChange={(event) => setFacilityLimit(facilityId, integerValue(event.target.value))}
                                    />
                                    <Text fontSize="xs" opacity={0.7} mt="6px">0 表示不能使用；空值恢复 99。</Text>
                                </Box>
                            ))}
                        </SimpleGrid>
                    </Dialog.Body>
                    <Dialog.Footer>
                        <Button variant="outline" className="yellow-btn" onClick={onClose}>完成</Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
};

const ResourceGroup = ({
    title,
    items,
    rates,
    onChange,
}: {
    title: string;
    items: ReturnType<typeof getPlannerResourceItems>['minerals'];
    rates: Record<string, number>;
    onChange: (itemId: string, rate: number | '') => void;
}) => (
    <Box mb="18px">
        <Flex align="center" gap="8px" mb="10px">
            <Text fontWeight="bold">{title}</Text>
            <Badge>{items.length}</Badge>
        </Flex>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="10px">
            {items.map(item => (
                <Flex key={item.id} bg="white" borderRadius="8px" p="10px" border="1px solid rgba(0,0,0,0.1)" gap="10px" align="center">
                    <ItemIcon item={item} size={34} />
                    <VStack align="start" gap="0" flex="1" minW="0">
                        <Text fontWeight="bold" fontSize="sm">{item.name}</Text>
                        <Text fontSize="xs" opacity={0.68}>{item.nameEn || item.id}</Text>
                    </VStack>
                    <Input
                        type="number"
                        min={0}
                        width="110px"
                        value={rates[item.id] ?? 9999}
                        onChange={(event) => onChange(item.id, numberValue(event.target.value))}
                    />
                </Flex>
            ))}
        </SimpleGrid>
    </Box>
);
