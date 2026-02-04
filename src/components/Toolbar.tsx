import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { MACHINES } from '../config/machines';
import { GameMode } from '../types';
import classNames from 'classnames';
import { MousePointer2, Zap, BoxSelect } from 'lucide-react';
import { Tabs } from '@chakra-ui/react';
import './Toolbar.scss';

const TABS = [
    { id: 'core', label: '核心' },
    { id: 'logistics', label: '物流' },
    { id: 'storage', label: '倉儲存取' },
    { id: 'production', label: '基礎生產' },
    { id: 'processing', label: '合成製造' },
    { id: 'power', label: '電力' },
];

export const Toolbar = () => {
    const { selectedMachineId, selectMachine, mode, setMode } = useGameStore();
    const [activeTab, setActiveTab] = useState('production');

    const filteredMachines = MACHINES.filter(m => m.category === activeTab);

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
                        title="Select / Move"
                    >
                        <MousePointer2 size={24} />
                    </button>
                    <button
                        className={classNames('tool-btn', { active: mode === GameMode.WIRE })}
                        onClick={() => setMode(mode === GameMode.WIRE ? GameMode.BUILD : GameMode.WIRE)}
                        title="Wiring Mode (E)"
                    >
                        <Zap size={24} />
                    </button>
                    <button
                        className={classNames('tool-btn', { active: mode === GameMode.BOX_SELECT })}
                        onClick={() => setMode(mode === GameMode.BOX_SELECT ? GameMode.BUILD : GameMode.BOX_SELECT)}
                        title="Box Selection Mode (X)"
                    >
                        <BoxSelect size={24} />
                    </button>
                </div>

                <div className="divider"></div>

                <div className="section machines">
                    {filteredMachines.map(m => (
                        <div className="btn-wrap" onClick={() => selectMachine(m.id)}>
                            <button
                                key={m.id}
                                className={classNames('machine-btn', { active: selectedMachineId === m.id })}
                                title={m.name}
                                style={{ '--machine-color': m.color } as React.CSSProperties}
                            >
                                <img
                                    className="icon"
                                    src={new URL(`../assets/machines/${m.id}.webp`, import.meta.url).href}
                                    alt={m.name}
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
