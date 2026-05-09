import { Badge, Box, CloseButton, Dialog, Flex, Text, VStack } from '@chakra-ui/react';
import { useGameStore } from '../store/gameStore';
import { getConnectionCarriedItem, getConnectionRateText } from '../utils/connectionContent';
import { ItemIcon } from './ItemIcon';

export const ConnectionDetailPanel = () => {
    const { connectionDetailId, connections, machines, clearSelection } = useGameStore();
    const connection = connectionDetailId ? connections.find(candidate => candidate.id === connectionDetailId) : null;
    if (!connection) return null;

    const kind = connection.kind || 'belt';
    const item = getConnectionCarriedItem(connection, machines);
    const typeText = kind === 'pipe' ? '管道' : '传送带';
    const contentText = kind === 'pipe' ? '液体' : '物品';
    const emptyText = kind === 'pipe' ? '暂无液体' : '暂无物品';

    return (
        <Dialog.Root open={Boolean(connection)} onOpenChange={(event) => !event.open && clearSelection()} size="sm">
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content backgroundColor="var(--gray-light)" color="var(--gray-dark)">
                    <Dialog.CloseTrigger asChild>
                        <CloseButton size="sm" />
                    </Dialog.CloseTrigger>
                    <Dialog.Header borderBottom="1px solid rgba(0,0,0,0.12)">
                        <Flex align="center" gap="10px">
                            <Text fontSize="xl" fontWeight="bold">{typeText}详情</Text>
                            <Badge>{contentText}</Badge>
                        </Flex>
                    </Dialog.Header>
                    <Dialog.Body py="18px">
                        <VStack align="stretch" gap="14px">
                            <Box bg="var(--black-light)" color="var(--gray-light)" borderRadius="8px" p="14px">
                                <Text fontSize="sm" color="var(--gray)" mb="8px">当前传送</Text>
                                <Flex align="center" gap="12px">
                                    <Box w="52px" h="52px" display="flex" alignItems="center" justifyContent="center">
                                        <ItemIcon item={item} label={emptyText} size={48} showRarityBorder={Boolean(item)} />
                                    </Box>
                                    <Box>
                                        <Text fontWeight="bold">{item?.name || emptyText}</Text>
                                        <Text fontSize="xs" color="var(--gray)">{item?.id || 'empty'}</Text>
                                    </Box>
                                </Flex>
                            </Box>
                            <Box bg="white" border="1px solid rgba(0,0,0,0.12)" borderRadius="8px" p="14px">
                                <Text fontSize="sm" color="var(--gray-dark)" opacity={0.7}>传送速率</Text>
                                <Text fontSize="lg" fontWeight="bold">{getConnectionRateText(kind)}</Text>
                            </Box>
                        </VStack>
                    </Dialog.Body>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
};
