import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACILITIES } from '../config/facilities';
import { GameMode } from '../types';
import classNames from 'classnames';
import { BoxSelect, Droplets, MousePointer2, Zap } from 'lucide-react';
import { Tabs } from '@chakra-ui/react';
import './Toolbar.scss';
import { getRarityColor } from '../utils/rarity';

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
    const { selectedMachineId, selectMachine, mode, setMode } = useGameStore();
    const [activeTab, setActiveTab] = useState('production');

    const filteredFacilities = FACILITIES.filter(facility => facility.category === activeTab);

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
                </div>

                <div className="divider"></div>

                <div className="section machines">
                    {filteredFacilities.map(m => (
                        <div key={m.id} className="btn-wrap" onClick={() => selectMachine(m.id)}>
                            <button
                                className={classNames('machine-btn', { active: selectedMachineId === m.id })}
                                title={m.name}
                                style={{ '--machine-color': m.color } as React.CSSProperties}
                            >
                                <img
                                    className="icon"
                                    src={new URL(`../assets/facilities/${m.id}.webp`, import.meta.url).href}
                                    alt={m.name}
                                    style={{ borderBottomColor: getRarityColor(m.rarity) }}
                                />
                                <span>{m.name}</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
