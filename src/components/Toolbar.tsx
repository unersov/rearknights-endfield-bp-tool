import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAutoPlannerSettingsStore } from '../store/autoPlannerSettingsStore';
import { FACILITIES } from '../config/facilities';
import { GameMode } from '../types';
import classNames from 'classnames';
import { BoxSelect, Droplets, MousePointer2, WandSparkles, Zap } from 'lucide-react';
import { Tabs } from '@chakra-ui/react';
import './Toolbar.scss';
import { getRarityColor } from '../utils/rarity';
import { getFacilityImageId } from '../utils/facilityLogistics';
import { getFacilityImageUrl } from '../utils/assetUrls';
import { toaster } from '../utils/toaster';

const TABS = [
    { id: 'core', label: '核心' },
    { id: 'resourcing', label: '资源开采' },
    { id: 'logistics', label: '物流设备' },
    { id: 'storage', label: '仓库存取' },
    { id: 'production', label: '基础生产' },
    { id: 'processing', label: '合成制造' },
    { id: 'power', label: '电力供应' },
];

export const Toolbar = () => {
    const {
        selectedMachineId,
        selectMachine,
        mode,
        setMode,
        selectedMachineIds,
        selectedConnectionIds,
        optimizeSelection,
    } = useGameStore();
    const getEffectiveSettings = useAutoPlannerSettingsStore(state => state.getEffectiveSettings);
    const [activeTab, setActiveTab] = useState('production');
    const [isOptimizing, setIsOptimizing] = useState(false);

    const filteredFacilities = FACILITIES.filter(facility => facility.category === activeTab);
    const hasSelection = selectedMachineIds.length > 0 || selectedConnectionIds.length > 0;

    const handleOptimizeSelection = async () => {
        if (!hasSelection || isOptimizing) {
            toaster.create({
                title: '请先选择要优化的蓝图对象',
                type: 'warning',
                duration: 2400,
            });
            return;
        }

        setIsOptimizing(true);
        await new Promise(resolve => setTimeout(resolve, 0));
        const result = optimizeSelection(getEffectiveSettings());
        setIsOptimizing(false);

        if (!result.ok) {
            toaster.create({
                title: '优化失败，已保留原布局',
                description: result.error,
                type: 'error',
                duration: 5200,
            });
            return;
        }

        const stats = result.stats;
        toaster.create({
            title: '优化成功',
            description: `原占地 ${stats.oldWidth} x ${stats.oldHeight} / ${stats.oldArea}，新占地 ${stats.newWidth} x ${stats.newHeight} / ${stats.newArea}；线路 ${stats.oldLineLength} -> ${stats.newLineLength}，桥 ${stats.oldBridgeCount} -> ${stats.newBridgeCount}`,
            type: 'success',
            duration: 5200,
        });
    };

    return (
        <div className="toolbar-container">
            <Tabs.Root
                value={activeTab}
                onValueChange={(e) => setActiveTab(e.value)}
                variant="plain"
                size="sm"
            >
                <Tabs.List
                    bg="var(--black)"
                    p="1"
                    borderRadius="md"
                    pointerEvents="auto"
                    style={{ boxShadow: '0 0 4px var(--black)' }}
                >
                    {TABS.map(tab => (
                        <Tabs.Trigger
                            key={tab.id}
                            value={tab.id}
                            px="3"
                            py="0"
                            borderRadius="sm"
                            cursor="pointer"
                            fontWeight="bold"
                            color="var(--gray-light)"
                            _selected={{ color: "var(--black-light)" }}
                        >
                            {tab.label}
                        </Tabs.Trigger>
                    ))}
                    <Tabs.Indicator rounded="12" />
                </Tabs.List>
            </Tabs.Root>

            <div className="toolbar">
                <div className="section">
                    <button
                        className={classNames('tool-btn', { active: mode === GameMode.BUILD && !selectedMachineId })}
                        onClick={() => selectMachine(null)}
                        title="选择/移动"
                    >
                        <MousePointer2 size={24} />
                    </button>
                    <button
                        className={classNames('tool-btn', { active: mode === GameMode.WIRE })}
                        onClick={() => setMode(mode === GameMode.WIRE ? GameMode.BUILD : GameMode.WIRE)}
                        title="传送带连接模式 (E)"
                    >
                        <Zap size={24} />
                    </button>
                    <button
                        className={classNames('tool-btn', { active: mode === GameMode.PIPE })}
                        onClick={() => setMode(mode === GameMode.PIPE ? GameMode.BUILD : GameMode.PIPE)}
                        title="管道连接模式 (Q)"
                    >
                        <Droplets size={24} />
                    </button>
                    <button
                        className={classNames('tool-btn', { active: mode === GameMode.BOX_SELECT })}
                        onClick={() => setMode(mode === GameMode.BOX_SELECT ? GameMode.BUILD : GameMode.BOX_SELECT)}
                        title="框选模式 (X)"
                    >
                        <BoxSelect size={24} />
                    </button>
                    <button
                        className="tool-btn"
                        onClick={handleOptimizeSelection}
                        disabled={!hasSelection || isOptimizing}
                        title={hasSelection ? '优化选中蓝图' : '请先选择要优化的蓝图对象'}
                    >
                        <WandSparkles size={24} />
                    </button>
                </div>

                <div className="divider"></div>

                <div className="section machines">
                    {filteredFacilities.map(m => {
                        const imageUrl = getFacilityImageUrl(getFacilityImageId(m.id));
                        return (
                            <div key={m.id} className="btn-wrap" onClick={() => selectMachine(m.id)}>
                                <button
                                    className={classNames('machine-btn', { active: selectedMachineId === m.id })}
                                    title={m.name}
                                    style={{ '--machine-color': m.color } as React.CSSProperties}
                                >
                                    {imageUrl ? (
                                        <img
                                            className="icon"
                                            src={imageUrl}
                                            alt={m.name}
                                            style={{ borderBottomColor: getRarityColor(m.rarity) }}
                                        />
                                    ) : (
                                        <span className="icon" style={{ borderBottomColor: getRarityColor(m.rarity) }}>{m.name.slice(0, 2)}</span>
                                    )}
                                    <span>{m.name}</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
