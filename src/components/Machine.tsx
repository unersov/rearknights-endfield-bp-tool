import React from 'react';
import { Icon } from '@iconify/react';
import classNames from 'classnames';
import { GameMode } from '../types';
import type { ConnectionKind, Item, PlacedMachine, PortConfig } from '../types';
import { getFacilityConfig } from '../config/facilities';
import { useGameStore } from '../store/gameStore';
import './Machine.scss';
import { getRotatedDimensions, getRotatedPorts, isMachinePowered } from '../utils/machineUtils';
import { ItemIcon } from './ItemIcon';
import { getItemByIdIncludingDynamic } from '../utils/dynamicRecipes';

interface MachineProps {
    data: PlacedMachine;
    isSelected?: boolean;
}

export const Machine: React.FC<MachineProps> = ({ data, isSelected }) => {
    const config = getFacilityConfig(data.machineId);
    const { mode, startWiring, wiringSource, commitWiring, isWiring, zoom, pickupMachine, machines, openMaterialSelector } = useGameStore();
    const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    if (!config) return null;

    const { width, height } = getRotatedDimensions(config.width, config.height, data.rotation);
    const inputs = getRotatedPorts(config.inputs, config.width, config.height, data.rotation);
    const outputs = getRotatedPorts(config.outputs, config.width, config.height, data.rotation);

    // 检查设施是否为“窄型” (至少一个维度为 1)
    const isNarrowMachine = config.width === 1 || config.height === 1;

    const style = {
        '--x': data.x,
        '--y': data.y,
        '--w': width,
        '--h': height,
    } as React.CSSProperties;

    // 处理材料选择的点击事件
    const handleClick = (e: React.MouseEvent) => {
        if (mode === GameMode.BUILD) {
            e.stopPropagation();
            openMaterialSelector(data.id);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // 仅允许在建造模式下拾取...
        if (e.button !== 0) return; // 仅左键点击

        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const localX = ((e.clientX - rect.left) / rect.width) * width;
        const localY = ((e.clientY - rect.top) / rect.height) * height;
        const grabOffset = {
            x: Math.min(width - 0.5, Math.max(0.5, Math.floor(localX) + 0.5)),
            y: Math.min(height - 0.5, Math.max(0.5, Math.floor(localY) + 0.5)),
        };

        pressTimer.current = setTimeout(() => {
            pickupMachine(data.id, grabOffset);
        }, 500);
    };

    const handleMouseUp = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };

    const handleMouseLeave = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };

    // ... getPortStyle ...

    const getConnectionKind = (port: PortConfig): ConnectionKind => port.kind === 'pipe' ? 'pipe' : 'belt';
    const modeForKind = (kind: ConnectionKind) => kind === 'pipe' ? GameMode.PIPE : GameMode.WIRE;

    const handleInputClick = (e: React.MouseEvent, port: PortConfig) => {
        e.stopPropagation();
        if (isWiring && mode === modeForKind(getConnectionKind(port))) {
            commitWiring();
        }
    };

    const getPortStyle = (p: PortConfig) => {
        const style: React.CSSProperties = {};

        const CELL_SIZE = 40;
        const GAP = 3; // 需与 CSS padding 保持一致
        // 用于紧凑型端口计算位置...

        // Compact Dimensions:
        // Port along-edge size (width for Top/Bottom, height for Left/Right) = 16px
        // Port depth (height for Top/Bottom, width for Left/Right) = 10px

        // 相对于设施主体 (内部 padding) 的中心位置
        const centerOffset = (CELL_SIZE / 2) - GAP;

        // 恢復使用者要求的手動偏移量 -4px
        const axisOffset = -4;

        // We want the center of the port to align with centerOffset.
        // position = centerOffset;
        // But we are setting 'top'/'left', usually indicating start position?
        // Original css has transform: translate(-50%, 0) or (0, -50%), so we are setting the CENTER coordinate.

        switch (p.side) {
            case 'left':
                style.left = `-1px`; // 重叠边框
                style.top = `${p.y * CELL_SIZE + centerOffset + axisOffset}px`;
                style.transform = 'translate(0, -50%)';
                break;
            case 'right':
                style.right = `-0.5px`;
                style.top = `${p.y * CELL_SIZE + centerOffset + axisOffset}px`;
                style.transform = 'translate(0, -50%)';
                break;
            case 'top':
                style.top = `-1px`;
                style.left = `${p.x * CELL_SIZE + centerOffset + axisOffset}px`;
                style.transform = 'translate(-50%, 0)';
                break;
            case 'bottom':
                style.bottom = `-0.5px`;
                style.left = `${p.x * CELL_SIZE + centerOffset + axisOffset}px`;
                style.transform = 'translate(-50%, 0)';
                break;
        }

        return style;
    };

    // 碰撞检测辅助函数
    const getPortClasses = (currentPort: PortConfig) => {
        const classes: string[] = ['port', currentPort.side, currentPort.kind === 'pipe' ? 'pipe-port' : 'item-port'];

        // 仅对窄型/小型设施应用智能调整大小
        if (!isNarrowMachine) return classNames(classes);

        // 寻找同一个格子内的其他端口
        const allPorts = [...inputs, ...outputs];
        const peers = allPorts.filter(p => p.x === currentPort.x && p.y === currentPort.y && p.side !== currentPort.side);

        if (peers.length === 0) {
            return classNames(classes); // 无碰撞，使用标准尺寸
        }

        let shrinkDepth = false; // 对面存在端口
        let shrinkLength = false; // 相邻存在端口

        const opposites: Record<string, string> = { 'left': 'right', 'right': 'left', 'top': 'bottom', 'bottom': 'top' };

        peers.forEach(peer => {
            if (peer.side === opposites[currentPort.side]) {
                shrinkDepth = true;
            } else {
                // 如果不是对面 (且边不同)，则必定是相邻
                shrinkLength = true;
            }
        });

        if (shrinkDepth) classes.push('shrink-depth');
        if (shrinkLength) classes.push('shrink-length');

        return classNames(classes);
    };

    const handleOutputClick = (e: React.MouseEvent, portIndex: number, portRel: PortConfig) => {
        e.stopPropagation();
        const kind = getConnectionKind(portRel);
        if (mode === modeForKind(kind)) {
            // 计算端口的绝对网格坐标
            const absX = data.x + portRel.x;
            const absY = data.y + portRel.y;
            startWiring(data.id, portIndex, { x: absX, y: absY }, kind);
        }
    };

    // 寻找选中的材料图标
    let selectedMaterial: Item | null = null;
    if (data.selectedMaterialId) {
        const mat = getItemByIdIncludingDynamic(data.selectedMaterialId);
        if (mat) {
            selectedMaterial = mat;
        }
    }

    return (
        <div
            className={classNames('machine-container', {
                selected: isSelected,
            })}
            style={style}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            <div className="machine-body">
                <img
                    className="facility-image"
                    src={new URL(`../assets/facilities/${config.id}.webp`, import.meta.url).href}
                    alt={config.name}
                />

                <div
                    className="machine-label"
                    style={{
                        transform: `scale(${1 / zoom})`,
                        transformOrigin: 'top left' // 因为我们将其定位在设施的右下角，标签的锚点为“左上”
                    }}
                >
                    <div>{config.name}</div>
                    <div>[点按] 查看详情/选择物品</div>
                    <div>[长按] 移动</div>
                </div>

                {(!isMachinePowered(data, machines, getFacilityConfig)) && (
                    <div
                        className="power-alert-icon"
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="缺电"
                    >
                        <Icon
                            icon="uil:battery-bolt"
                            color="var(--orange)"
                            width="36"
                            height="36"
                            style={{ filter: 'drop-shadow(0px 0px 1px var(--orange-dark))' }}
                        />
                    </div>
                )}

                {/* 选中的材料图标 */}
                {selectedMaterial !== null && (
                    <div
                        className="selected-material-icon"
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 5,
                            pointerEvents: 'none',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <ItemIcon item={selectedMaterial} size={40} showRarityBorder={false} />
                    </div>
                )}


                {/* 输入 */}
                {inputs.map((p, i) => {
                    const isConnectable = isWiring && mode === modeForKind(getConnectionKind(p));

                    return (
                        <div
                            key={`in-${i}`}
                            className={classNames(getPortClasses(p), 'input', {
                                clickable: isConnectable
                            })}
                            style={getPortStyle(p)}
                            onClick={(e) => handleInputClick(e, p)}
                            title={isConnectable ? "点击连接" : ""}
                        >
                            <div className="port-inner">
                                <Icon icon="octicon:chevron-right-12" width="24" height="24" strokeWidth="3" />
                            </div>
                        </div>
                    );
                })}

                {/* 输出 */}
                {outputs.map((p, i) => {
                    const isConnectable = mode === modeForKind(getConnectionKind(p));

                    return (
                        <div
                            key={`out-${i}`}
                            className={classNames(getPortClasses(p), 'output', {
                                clickable: isConnectable,
                                active: wiringSource?.machineId === data.id && wiringSource.portIndex === i
                            })}
                            style={getPortStyle(p)}
                            onClick={(e) => handleOutputClick(e, i, p)}
                            title={isConnectable ? "点击开始连接" : ""}
                        >
                            <div className="port-inner">
                                <Icon icon="octicon:chevron-right-12" width="24" height="24" strokeWidth="3" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
