import { Box, Button, Dialog, HStack, Image, Input, Spinner, Text, VStack, IconButton } from '@chakra-ui/react';
import { Icon } from '@iconify/react';
import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { captureBlueprintScreenshot, generateShareUrl } from '../utils/shareUtils';
import { toaster } from '../utils/toaster';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShareModal = ({ isOpen, onClose }: ShareModalProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [shareLink, setShareLink] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const { machines, connections, gridWidth, gridHeight } = useGameStore();

    const handleGenerate = useCallback(async () => {
        setIsGenerating(true);
        try {
            setShareLink(generateShareUrl({ machines, connections, gridWidth, gridHeight }));
            setTimeout(async () => {
                const img = await captureBlueprintScreenshot();
                setImageUrl(img);
                setIsGenerating(false);
            }, 100);
        } catch (e) {
            console.error(e);
            toaster.create({ title: '生成分享信息失败', type: 'error' });
            setIsGenerating(false);
        }
    }, [connections, gridHeight, gridWidth, machines]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (isOpen) handleGenerate();
            else {
                setImageUrl(null);
                setShareLink('');
            }
        }, 0);

        return () => window.clearTimeout(timer);
    }, [handleGenerate, isOpen]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareLink);
        toaster.create({ title: '复制成功', type: 'success' });
    };

    const handleDownloadImage = () => {
        if (!imageUrl) return;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'blueprint.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content backgroundColor="var(--gray-light)">
                    <Dialog.Header>
                        <Dialog.Title>
                            <Box borderLeft="4px solid var(--gray-dark)" pl="8px">
                                <Text color="var(--gray-dark)" fontSize="xl" fontWeight="bold">分享蓝图</Text>
                            </Box>
                        </Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body>
                        <VStack gap={6} align="stretch">
                            <Box display="flex" alignItems="center" justifyContent="center" overflow="hidden" p="8px">
                                {isGenerating ? (
                                    <VStack>
                                        <Spinner size="lg" color="blue.500" />
                                        <Text color="gray.400" fontSize="sm">正在生成预览图...</Text>
                                    </VStack>
                                ) : imageUrl ? (
                                    <Image boxShadow="md" src={imageUrl} alt="蓝图预览" maxH="300px" objectFit="contain" />
                                ) : (
                                    <Text color="red.400">生成预览图失败</Text>
                                )}
                            </Box>

                            <VStack align="stretch" gap={2}>
                                <Box borderLeft="4px solid var(--gray-dark)" pl="8px">
                                    <Text color="var(--gray-dark)" fontSize="md" fontWeight="bold">分享链接</Text>
                                </Box>
                                <HStack>
                                    <Input value={shareLink} readOnly variant="subtle" backgroundColor="var(--gray-light)" border="3px solid var(--gray)" color="var(--gray-dark)" />
                                    <IconButton aria-label="复制分享链接" onClick={handleCopyLink}>
                                        <Icon icon="iconamoon:copy" color="var(--gray-light)" />
                                    </IconButton>
                                </HStack>
                            </VStack>
                        </VStack>
                    </Dialog.Body>
                    <Dialog.Footer>
                        <Button variant="outline" className="gray-btn" onClick={onClose}>关闭</Button>
                        <Button variant="outline" className="yellow-btn" onClick={handleDownloadImage} disabled={!imageUrl || isGenerating}>下载图片</Button>
                    </Dialog.Footer>
                    <Dialog.CloseTrigger />
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
};
