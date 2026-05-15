import { Box, Button, CloseButton, createListCollection, Dialog, Flex, Input, Select, Text } from '@chakra-ui/react';
import { ChevronDown } from 'lucide-react';
import './Header.scss';

import { IconButton } from './IconButton';

import { GRID_PRESETS } from '../config/constants';
import { useGameStore } from '../store/gameStore';

interface HeaderProps {
    onSave: () => void;
    onOpen: () => void;
}

import { ShareModal } from './ShareModal';
import { RecipeViewer } from './RecipeViewer';
import { AutoBlueprintModal } from './AutoBlueprintModal';
import { AutoBlueprintSettingsPanel } from './AutoBlueprintSettingsPanel';
import { useState } from 'react';

export const Header = ({ onSave, onOpen }: HeaderProps) => {
    const { gridWidth, gridHeight, setGridSize, setUiView } = useGameStore();
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isRecipeOpen, setIsRecipeOpen] = useState(false);
    const [isAutoPlannerOpen, setIsAutoPlannerOpen] = useState(false);
    const [isAutoSettingsOpen, setIsAutoSettingsOpen] = useState(false);
    const [isCustomSizeOpen, setIsCustomSizeOpen] = useState(false);
    const [customWidth, setCustomWidth] = useState(String(gridWidth));
    const [customHeight, setCustomHeight] = useState(String(gridHeight));
    const [customSizeError, setCustomSizeError] = useState('');

    const gridPresetsCollection = createListCollection({
        items: GRID_PRESETS.map(p => ({ label: p.label, value: p.width === 0 ? 'custom' : `${p.width}x${p.height}` })),
    });

    const handleValueChange = (e: { value: string[] }) => {
        const val = e.value[0];
        if (!val) return;
        if (val === 'custom') {
            setCustomWidth(String(gridWidth));
            setCustomHeight(String(gridHeight));
            setCustomSizeError('');
            setIsCustomSizeOpen(true);
            return;
        }
        const [w, h] = val.split('x').map(Number);
        setGridSize(w, h);
    };

    const handleApplyCustomSize = () => {
        const width = Number(customWidth);
        const height = Number(customHeight);
        if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
            setCustomSizeError('宽度和高度必须是正整数');
            return;
        }
        setGridSize(width, height);
        setIsCustomSizeOpen(false);
    };

    return (
        <>
            <div className="header">
                <div className="logo">
                    <span className="brand-title">终末地蓝图规划</span>
                </div>

                <div className="center-actions">
                    <Select.Root
                        collection={gridPresetsCollection}
                        value={[`${gridWidth}x${gridHeight}`]}
                        onValueChange={handleValueChange}
                        width="240px"
                    >
                        <Select.Trigger>
                            <Select.ValueText placeholder="选择蓝图尺寸" />
                            <Select.Indicator>
                                <ChevronDown size={16} color="white" />
                            </Select.Indicator>
                        </Select.Trigger>
                        <Select.Positioner>
                            <Select.Content>
                                {gridPresetsCollection.items.map((item) => (
                                    <Select.Item item={item} key={item.value}>
                                        {item.label}
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Positioner>
                    </Select.Root>
                </div>
                <div className="actions">
                    <Button className="recipe-button" onClick={() => setIsAutoSettingsOpen(true)}>自动蓝图设置</Button>
                    <Button className="recipe-button" onClick={() => setIsAutoPlannerOpen(true)}>自动蓝图规划</Button>
                    <Button className="recipe-button" onClick={() => setIsRecipeOpen(true)}>查看配方</Button>
                    <IconButton icon="material-symbols:save" tooltip="保存" onClick={onSave} />
                    <IconButton icon="typcn:home" tooltip="蓝图列表" onClick={onOpen} />
                    <IconButton icon="material-symbols:share" tooltip="分享" onClick={() => setIsShareOpen(true)} />
                    <IconButton icon="material-symbols:settings" tooltip="设置" onClick={() => setUiView('settings')} />
                    <IconButton icon="material-symbols:info-i-rounded" tooltip="关于" onClick={() => setUiView('about')} />
                </div>
            </div>
            <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
            <RecipeViewer isOpen={isRecipeOpen} onClose={() => setIsRecipeOpen(false)} />
            <AutoBlueprintSettingsPanel isOpen={isAutoSettingsOpen} onClose={() => setIsAutoSettingsOpen(false)} />
            <AutoBlueprintModal isOpen={isAutoPlannerOpen} onClose={() => setIsAutoPlannerOpen(false)} />
            <Dialog.Root open={isCustomSizeOpen} onOpenChange={(event) => !event.open && setIsCustomSizeOpen(false)}>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content backgroundColor="var(--gray-light)" color="var(--gray-dark)">
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="sm" />
                        </Dialog.CloseTrigger>
                        <Dialog.Header>
                            <Dialog.Title>自定义蓝图尺寸</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            <Flex gap="12px">
                                <Box>
                                    <Text fontSize="sm" mb="4px">宽度</Text>
                                    <Input value={customWidth} onChange={(event) => setCustomWidth(event.target.value)} />
                                </Box>
                                <Box>
                                    <Text fontSize="sm" mb="4px">高度</Text>
                                    <Input value={customHeight} onChange={(event) => setCustomHeight(event.target.value)} />
                                </Box>
                            </Flex>
                            {customSizeError && <Text color="red.500" fontSize="sm" mt="10px">{customSizeError}</Text>}
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="outline" className="gray-btn" onClick={() => setIsCustomSizeOpen(false)}>取消</Button>
                            <Button variant="outline" className="yellow-btn" onClick={handleApplyCustomSize}>应用</Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>
        </>
    );
};
