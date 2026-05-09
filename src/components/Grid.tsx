import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Machine } from './Machine';
import { GameMode } from '../types';
import type { Connection, ConnectionKind, Point, PortConfig } from '../types';
import { FACILITIES } from '../config/facilities';
import classNames from 'classnames';
import './Grid.scss';
import { checkCollision } from '../utils/gridUtils';
import { getRotatedDimensions, getRotatedPorts } from '../utils/machineUtils';
import { OUTER_BUILD_MARGIN, checkPlacementRule } from '../utils/placementRules';
import { isLineFacilityForKind } from '../utils/facilityLogistics';

const GRID_SIZE = 40; // 需與 CSS 中的 --grid-size 保持一致

const getFacilityTransportKind = (facility: typeof FACILITIES[number]): ConnectionKind | null => {
    if (facility.id === 'pipe' || facility.id.startsWith('pipe-')) return 'pipe';
    if (facility.id === 'belt' || facility.id.startsWith('belt-')) return 'belt';
    const ports = [...facility.inputs, ...facility.outputs];
    if (ports.some(port => port.kind === 'pipe')) return 'pipe';
    if (ports.some(port => (port.kind || 'item') === 'item')) return 'belt';
    return null;
};

export const Grid = () => {
    const {
        machines,
        connections,
        mode,
        selectedMachineId,
        addMachine,
        isWiring,
        wiringKind,
        updateWiringPreview,
        wiringPreviewPath,
        isWiringValid,
        previewRotation,
        rotatePreview,
        zoom,
        gridWidth,
        gridHeight,

        setZoom,
        pan,
        setPan,

        // 框選 / 批量移動
        setBoxSelection,
        commitBoxSelection,
        selectionStart,
        selectionEnd,
        selectedMachineIds,
        selectedConnectionIds,
        selectConnection,

        startBatchMove,
        startCopySelection,
        commitBatchMove,
        deleteSelected,

        moveAnchor,
        movingMachineGrabOffset,
        movingMachinesSnapshot,
        movingConnectionsSnapshot,
        cancelOperation
    } = useGameStore();

    const containerRef = useRef<HTMLDivElement>(null);
    const [isPanning, setIsPanning] = React.useState(false);
    const lastMousePos = useRef<Point>({ x: 0, y: 0 });
    const didPanRef = useRef(false);
    const pressedPanKeysRef = useRef<Set<string>>(new Set());
    const panAnimationRef = useRef<number | null>(null);
    const lastPanFrameTimeRef = useRef<number | null>(null);

    // 快捷鍵 E 和 R
    const setMode = useGameStore(s => s.setMode);
    useEffect(() => {
        const stopSmoothPan = () => {
            if (panAnimationRef.current !== null) {
                cancelAnimationFrame(panAnimationRef.current);
                panAnimationRef.current = null;
            }
            lastPanFrameTimeRef.current = null;
        };

        const runSmoothPan = (timestamp: number) => {
            const keys = pressedPanKeysRef.current;
            if (keys.size === 0) {
                stopSmoothPan();
                return;
            }

            const lastTimestamp = lastPanFrameTimeRef.current ?? timestamp;
            const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
            lastPanFrameTimeRef.current = timestamp;

            let dx = 0;
            let dy = 0;
            if (keys.has('a')) dx += 1;
            if (keys.has('d')) dx -= 1;
            if (keys.has('w')) dy += 1;
            if (keys.has('s')) dy -= 1;

            if (dx !== 0 || dy !== 0) {
                const speed = 520;
                const length = Math.hypot(dx, dy) || 1;
                const currentPan = useGameStore.getState().pan;
                useGameStore.getState().setPan({
                    x: currentPan.x + (dx / length) * speed * deltaSeconds,
                    y: currentPan.y + (dy / length) * speed * deltaSeconds,
                });
            }

            panAnimationRef.current = requestAnimationFrame(runSmoothPan);
        };

        const startSmoothPan = () => {
            if (panAnimationRef.current === null) {
                lastPanFrameTimeRef.current = null;
                panAnimationRef.current = requestAnimationFrame(runSmoothPan);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
            if (!isTyping && !e.ctrlKey && !e.metaKey) {
                const panKey = e.key.toLowerCase();
                if (['w', 'a', 's', 'd'].includes(panKey)) {
                    e.preventDefault();
                    pressedPanKeysRef.current.add(panKey);
                    startSmoothPan();
                    return;
                }
            }

            const isPlacing = !!useGameStore.getState().selectedMachineId;

            if (e.key.toLowerCase() === 'e') {
                if (isPlacing) return;
                setMode(mode === GameMode.WIRE ? GameMode.BUILD : GameMode.WIRE);
            } else if (e.key.toLowerCase() === 'q') {
                if (isPlacing) return;
                setMode(mode === GameMode.PIPE ? GameMode.BUILD : GameMode.PIPE);
            } else if (e.key.toLowerCase() === 'r') {
                rotatePreview();
            } else if (e.key.toLowerCase() === 'x') {
                if (isPlacing) return;
                setMode(mode === GameMode.BOX_SELECT ? GameMode.BUILD : GameMode.BOX_SELECT);
            } else if (e.key.toLowerCase() === 'f') {
                deleteSelected();
                // 用户需求：按 F1 打开蓝图列表
                // 注意：F1 通常會開啟說明，我們可能需要阻止預設行為
            } else if (e.key === 'F1') {
                e.preventDefault();
                useGameStore.getState().setBlueprintListMode('insert');
                useGameStore.getState().setUiView('list');
            } else if (e.key.toLowerCase() === 'm') {
                // 我們需要 hoverPos 作為錨點。由於無法在此監聽器中輕鬆存取 react state...
                // 实际上，如果我们使用 ref 来储存 hoverPos，是可以运作的。
                if (hoverPosRef.current) {
                    startBatchMove(hoverPosRef.current);
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                if (hoverPosRef.current) {
                    startCopySelection(hoverPosRef.current);
                }
            } else if (e.key === 'Escape') {
                cancelOperation();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            const panKey = e.key.toLowerCase();
            if (['w', 'a', 's', 'd'].includes(panKey)) {
                pressedPanKeysRef.current.delete(panKey);
                if (pressedPanKeysRef.current.size === 0) {
                    stopSmoothPan();
                }
            }
        };
        const handleWindowBlur = () => {
            pressedPanKeysRef.current.clear();
            stopSmoothPan();
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleWindowBlur);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleWindowBlur);
            stopSmoothPan();
        };
    }, [mode, setMode, rotatePreview, deleteSelected, startBatchMove, cancelOperation]);

    const getGridPos = (e: React.MouseEvent): Point => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        // 調整縮放和平移
        // 視覺變換順序：scale(zoom) translate(pan)
        // 螢幕座標 = (世界座標 * zoom) + pan
        // 世界座標 = (螢幕座標 - pan) / zoom

        const x = Math.floor(((e.clientX - rect.left) - pan.x) / (GRID_SIZE * zoom));
        const y = Math.floor(((e.clientY - rect.top) - pan.y) / (GRID_SIZE * zoom));
        return { x, y };
    };

    const hoverPosRef = useRef<Point | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        // 滑鼠中鍵 (1)
        if (e.button === 1) {
            e.preventDefault();
            setIsPanning(true);
            didPanRef.current = false;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            return;
        }

        const pos = getGridPos(e);
        const target = e.target as HTMLElement;
        const isBlankArea = !target.closest('.machine-container') && !target.closest('button') && !target.closest('[role="button"]');

        if (e.button === 0 && mode === GameMode.BUILD && !selectedMachineId && isBlankArea) {
            setIsPanning(true);
            didPanRef.current = false;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            return;
        }

        if (mode === GameMode.BOX_SELECT && e.button === 0) {
            setBoxSelection(pos, pos);
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        setIsPanning(false);
        if (mode === GameMode.BOX_SELECT && selectionStart) {
            commitBoxSelection(e.shiftKey);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        // 僅在我們想要阻止頁面滾動時阻止預設行為 (通常適用於可縮放畫布)
        if (e.ctrlKey || e.metaKey) {
            // 瀏覽器縮放交互，也許讓它發生？
            // 標準地圖行為：僅滾輪縮放
        }

        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 1. 在縮放前計算滑鼠下的世界座標
        const worldX = (mouseX - pan.x) / zoom;
        const worldY = (mouseY - pan.y) / zoom;

        const delta = -Math.sign(e.deltaY) * 0.1;
        const newZoom = Math.min(Math.max(zoom + delta, 0.18), 3.0);

        // 2. 計算新的平移量以保持世界座標在滑鼠下方
        // mouseX = worldX * newZoom + newPanX
        // newPanX = mouseX - worldX * newZoom
        const newPanX = mouseX - worldX * newZoom;
        const newPanY = mouseY - worldY * newZoom;

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
    };

    const [hoverPos, setHoverPos] = React.useState<Point | null>(null);

    const getSingleMovePlacementPos = (pos: Point): Point => {
        if (!movingMachineGrabOffset) return pos;
        return {
            x: Math.round(pos.x - movingMachineGrabOffset.x),
            y: Math.round(pos.y - movingMachineGrabOffset.y),
        };
    };

    const getConnectionKind = (conn: Connection): ConnectionKind => conn.kind || 'belt';

    const getArrowRotation = (from: Point, to: Point) => {
        if (to.x > from.x) return 0;
        if (to.x < from.x) return 180;
        if (to.y > from.y) return 90;
        return 270;
    };

    const getConnectionArrows = (path: Point[]) => path.flatMap((point, index) => {
        const next = path[index + 1];
        const prev = path[index - 1];
        const target = next || prev;
        if (!target) return [];
        const rotation = next ? getArrowRotation(point, target) : getArrowRotation(target, point);
        return [{ point, rotation }];
    });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            const deltaX = e.clientX - lastMousePos.current.x;
            const deltaY = e.clientY - lastMousePos.current.y;
            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                didPanRef.current = true;
            }

            setPan({
                x: pan.x + deltaX,
                y: pan.y + deltaY
            });

            lastMousePos.current = { x: e.clientX, y: e.clientY };
            return;
        }

        const pos = getGridPos(e);
        setHoverPos(pos);
        hoverPosRef.current = pos;

        if (isWiring) {
            updateWiringPreview(pos);
        }

        if (mode === GameMode.BOX_SELECT && selectionStart && e.buttons === 1) {
            setBoxSelection(selectionStart, pos);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isPanning || didPanRef.current) {
            didPanRef.current = false;
            return;
        }
        // 檢查是否實際拖曳過？目前做簡單檢查。

        const pos = getGridPos(e);

        if (mode === GameMode.BUILD && selectedMachineId) {
            const placed = addMachine(selectedMachineId, pos.x, pos.y, previewRotation);
            // 如果未按住 Ctrl，取消选择设施
            if (placed && !e.ctrlKey) {
                useGameStore.getState().selectMachine(null);
            }
        } else if ((mode === GameMode.WIRE || mode === GameMode.PIPE) && isWiring) {
            // 检查是否点击了设施输入/输出，这由 Port onClick 处理。
            // 如果执行到这里，表示我们点击了网格背景 (或没有点击到端口的设施本体)。
            useGameStore.getState().addWiringAnchor(pos);
        } else if (mode === GameMode.MOVE_SELECTION) {
            commitBatchMove(pos);
        } else if (mode === GameMode.BOX_SELECT) {
            // 點擊是否清除選取？
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        useGameStore.getState().cancelOperation();
        if (mode === GameMode.WIRE || mode === GameMode.PIPE) {
            useGameStore.getState().setMode(GameMode.BUILD);
        }
    };

    // 预览设施计算
    const ghostConfig = (mode === GameMode.BUILD && selectedMachineId) ? FACILITIES.find(m => m.id === selectedMachineId) : null;
    let isGhostInvalid = false;
    let ghostWidth = 0;
    let ghostHeight = 0;
    let ghostPorts: (PortConfig & { isInput: boolean })[] = [];
    let ghostPos: Point | null = null;
    let coveredPowerSources: { machineId: string; x: number; y: number; rotation: number; range: number }[] = [];
    let invalidPlacementReason = '';

    if (ghostConfig && hoverPos) {
        ghostPos = getSingleMovePlacementPos(hoverPos);
        const dims = getRotatedDimensions(ghostConfig.width, ghostConfig.height, previewRotation);
        ghostWidth = dims.width;
        ghostHeight = dims.height;

        const candidate = {
            x: ghostPos.x,
            y: ghostPos.y,
            width: ghostWidth,
            height: ghostHeight
        };

        const placementKind = getFacilityTransportKind(ghostConfig);
        const replaceableMachineIds = new Set(machines
            .filter(machine =>
                placementKind &&
                isLineFacilityForKind(machine.machineId, placementKind) &&
                machine.x >= candidate.x &&
                machine.x < candidate.x + candidate.width &&
                machine.y >= candidate.y &&
                machine.y < candidate.y + candidate.height
            )
            .map(machine => machine.id));
        const machinesForPlacement = machines.filter(machine => !replaceableMachineIds.has(machine.id));
        const placement = checkPlacementRule(ghostConfig, candidate, machinesForPlacement, gridWidth, gridHeight, previewRotation);
        const hasCollision = checkCollision(candidate, machinesForPlacement);
        isGhostInvalid = !placement.valid || hasCollision;
        invalidPlacementReason = placement.reason || (hasCollision ? '该位置已被占用' : '');

        if (!ghostConfig.supplyRange && ghostConfig.power > 0) {
            coveredPowerSources = machines.flatMap(machine => {
                const powerConfig = FACILITIES.find(facility => facility.id === machine.machineId);
                if (!powerConfig?.supplyRange) return [];
                const sourceDims = getRotatedDimensions(powerConfig.width, powerConfig.height, machine.rotation);
                const cx = machine.x + sourceDims.width / 2;
                const cy = machine.y + sourceDims.height / 2;
                const radius = powerConfig.supplyRange / 2;
                const px1 = cx - radius;
                const py1 = cy - radius;
                const px2 = cx + radius;
                const py2 = cy + radius;
                const overlaps = !(candidate.x + candidate.width <= px1 || candidate.x >= px2 || candidate.y + candidate.height <= py1 || candidate.y >= py2);
                return overlaps ? [{ machineId: machine.machineId, x: machine.x, y: machine.y, rotation: machine.rotation, range: powerConfig.supplyRange }] : [];
            });
        }

        ghostPorts = getRotatedPorts(
            [...ghostConfig.inputs, ...ghostConfig.outputs],
            ghostConfig.width,
            ghostConfig.height,
            previewRotation
        ).map((p, i) => ({
            ...p,
            isInput: i < ghostConfig.inputs.length // 保留輸入端口資訊
        }));
    }

    return (
        <div
            className={classNames('grid-container', { 'wiring-mode': mode === GameMode.WIRE || mode === GameMode.PIPE, 'pipe-mode': mode === GameMode.PIPE, 'panning': isPanning })}
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setHoverPos(null); setIsPanning(false); }}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onWheel={handleWheel}
        >
            <div
                className="zoom-content"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    width: '100%',
                    height: '100%'
                }}
            >
                <div
                    className="grid-background"
                    style={{
                        left: -OUTER_BUILD_MARGIN * GRID_SIZE,
                        top: -OUTER_BUILD_MARGIN * GRID_SIZE,
                        width: (gridWidth + OUTER_BUILD_MARGIN * 2) * GRID_SIZE,
                        height: (gridHeight + OUTER_BUILD_MARGIN * 2) * GRID_SIZE
                    }}
                >
                    <div
                        className="core-boundary"
                        style={{
                            left: OUTER_BUILD_MARGIN * GRID_SIZE,
                            top: OUTER_BUILD_MARGIN * GRID_SIZE,
                            width: gridWidth * GRID_SIZE,
                            height: gridHeight * GRID_SIZE
                        }}
                    />
                </div>

                {/* 連線 SVG 圖層 */}
                <svg
                    className="connections-layer"
                    style={{
                        width: gridWidth * GRID_SIZE,
                        height: gridHeight * GRID_SIZE,
                        overflow: 'visible',
                        pointerEvents: 'none',
                    }}
                >
                    {/* 已确认连接 - 外框 */}
                    {(['belt', 'pipe'] as ConnectionKind[]).map(kind => (
                        <g key={`connections-${kind}`} className={`${kind}-connections`}>
                            {connections.filter(conn => getConnectionKind(conn) === kind).map(conn => {
                                const points = conn.path.map(p => `${p.x * GRID_SIZE + GRID_SIZE / 2},${p.y * GRID_SIZE + GRID_SIZE / 2}`).join(' ');

                                return (
                                    <React.Fragment key={conn.id}>
                                        <polyline
                                            points={points}
                                            className={classNames('conveyor-line-outline', kind, { selected: selectedConnectionIds.includes(conn.id) })}
                                        />
                                        <polyline
                                            points={points}
                                            className={classNames('conveyor-line-fill', kind, { selected: selectedConnectionIds.includes(conn.id) })}
                                        />
                                        <polyline
                                            points={points}
                                            className="connection-hitbox"
                                            onClick={(event) => {
                                                if (mode === GameMode.BUILD && selectedMachineId) return;
                                                event.stopPropagation();
                                                selectConnection(conn.id);
                                            }}
                                            onMouseDown={(event) => {
                                                if (mode === GameMode.BUILD && selectedMachineId) return;
                                                event.stopPropagation();
                                            }}
                                        />
                                        {getConnectionArrows(conn.path).map(({ point, rotation }, index) => (
                                            <g
                                                key={`${conn.id}-arrow-${index}`}
                                                className={classNames('connection-arrow', kind)}
                                                transform={`translate(${point.x * GRID_SIZE + GRID_SIZE / 2} ${point.y * GRID_SIZE + GRID_SIZE / 2}) rotate(${rotation})`}
                                            >
                                                <path d="M -5 -6 L 5 0 L -5 6" />
                                            </g>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </g>
                    ))}
                    {/* 已确认连接 - 内填 */}

                    {/* 連線預覽 - 外框 */}
                    {isWiring && wiringPreviewPath.length > 0 && (
                        <polyline
                            points={wiringPreviewPath.map(p => `${p.x * GRID_SIZE + GRID_SIZE / 2},${p.y * GRID_SIZE + GRID_SIZE / 2}`).join(' ')}
                            className={classNames('conveyor-preview-outline', wiringKind, { 'invalid': !isWiringValid })}
                        />
                    )}
                    {/* 連線預覽 - 內填 */}
                    {isWiring && wiringPreviewPath.length > 0 && (
                        <polyline
                            points={wiringPreviewPath.map(p => `${p.x * GRID_SIZE + GRID_SIZE / 2},${p.y * GRID_SIZE + GRID_SIZE / 2}`).join(' ')}
                            className={classNames('conveyor-preview-fill', wiringKind, { 'invalid': !isWiringValid })}
                        />
                    )}

                    {/* 預覽終點標記 */}
                    {isWiring && wiringPreviewPath.length > 0 && getConnectionArrows(wiringPreviewPath).map(({ point, rotation }, index) => (
                        <g
                            key={`preview-arrow-${index}`}
                            className={classNames('connection-arrow', 'preview', wiringKind, { invalid: !isWiringValid })}
                            transform={`translate(${point.x * GRID_SIZE + GRID_SIZE / 2} ${point.y * GRID_SIZE + GRID_SIZE / 2}) rotate(${rotation})`}
                        >
                            <path d="M -5 -6 L 5 0 L -5 6" />
                        </g>
                    ))}

                    {isWiring && wiringPreviewPath.length > 0 && (
                        <circle
                            cx={wiringPreviewPath[wiringPreviewPath.length - 1].x * GRID_SIZE + GRID_SIZE / 2}
                            cy={wiringPreviewPath[wiringPreviewPath.length - 1].y * GRID_SIZE + GRID_SIZE / 2}
                            r="4"
                            fill={!isWiringValid ? '#ff4444' : wiringKind === 'pipe' ? 'rgba(117, 210, 255, 0.85)' : 'white'}
                        />
                    )}
                </svg>

                {/* 设施图层 */}
                {machines.map(m => (
                    <Machine
                        key={m.id}
                        data={m}
                        isSelected={selectedMachineIds.includes(m.id)}
                    />
                ))}

                {/* 選取框 */}
                {selectionStart && selectionEnd && mode === GameMode.BOX_SELECT && (() => {
                    const x1 = Math.min(selectionStart.x, selectionEnd.x);
                    const y1 = Math.min(selectionStart.y, selectionEnd.y);
                    const x2 = Math.max(selectionStart.x, selectionEnd.x);
                    const y2 = Math.max(selectionStart.y, selectionEnd.y);
                    const width = (x2 - x1) + 1;
                    const height = (y2 - y1) + 1;

                    return (
                        <div
                            className="selection-box"
                            style={{
                                left: x1 * GRID_SIZE,
                                top: y1 * GRID_SIZE,
                                width: width * GRID_SIZE,
                                height: height * GRID_SIZE
                            }}
                        />
                    );
                })()}

                {/* 批量移動預覽 - 連線 */}
                {mode === GameMode.MOVE_SELECTION && moveAnchor && hoverPos && (() => {
                    const offsetX = hoverPos.x - moveAnchor.x;
                    const offsetY = hoverPos.y - moveAnchor.y;

                    return (
                        <svg
                            className="connections-layer"
                            style={{
                                width: gridWidth * GRID_SIZE,
                                height: gridHeight * GRID_SIZE,
                                pointerEvents: 'none',
                                zIndex: 12
                            }}
                        >
                            {(['belt', 'pipe'] as ConnectionKind[]).map(kind => (
                                <g key={`ghost-connections-${kind}`}>
                                    {movingConnectionsSnapshot.filter(conn => getConnectionKind(conn) === kind).map(conn => {
                                        const newPath = conn.path.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));
                                        const pointsStr = newPath.map(p => (`${p.x * GRID_SIZE + GRID_SIZE / 2},${p.y * GRID_SIZE + GRID_SIZE / 2}`)).join(' ');
                                        return (
                                            <React.Fragment key={`ghost-conn-${conn.id}`}>
                                                <polyline
                                                    points={pointsStr}
                                                    className={classNames('conveyor-line-outline', kind)}
                                                    style={{ opacity: 0.5 }}
                                                />
                                                <polyline
                                                    points={pointsStr}
                                                    className={classNames('conveyor-line-fill', kind)}
                                                    style={{ opacity: 0.5 }}
                                                />
                                                {getConnectionArrows(newPath).map(({ point, rotation }, index) => (
                                                    <g
                                                        key={`ghost-conn-${conn.id}-arrow-${index}`}
                                                        className={classNames('connection-arrow', kind)}
                                                        opacity="0.5"
                                                        transform={`translate(${point.x * GRID_SIZE + GRID_SIZE / 2} ${point.y * GRID_SIZE + GRID_SIZE / 2}) rotate(${rotation})`}
                                                    >
                                                        <path d="M -5 -6 L 5 0 L -5 6" />
                                                    </g>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </g>
                            ))}
                        </svg>
                    )
                })()}

                {/* 批量移动预览 - 设施 */}
                {mode === GameMode.MOVE_SELECTION && moveAnchor && hoverPos && movingMachinesSnapshot.map(m => {
                    const offsetX = hoverPos.x - moveAnchor.x;
                    const offsetY = hoverPos.y - moveAnchor.y;
                    const ghostX = m.x + offsetX;
                    const ghostY = m.y + offsetY;

                    return (
                        <div key={`ghost-${m.id}`} style={{ opacity: 0.6, pointerEvents: 'none', zIndex: 20 }}>
                            <Machine
                                data={{ ...m, x: ghostX, y: ghostY }}
                                isSelected={true} // 高亮显示
                            />
                        </div>
                    );
                })}

                {/* 设施预览 (单个) */}
                {ghostConfig && ghostPos && (
                    <>
                        {ghostConfig.supplyRange && (
                            <div
                                className="power-range-preview"
                                style={{
                                    left: (ghostPos.x + (ghostWidth / 2) - (ghostConfig.supplyRange / 2)) * GRID_SIZE,
                                    top: (ghostPos.y + (ghostHeight / 2) - (ghostConfig.supplyRange / 2)) * GRID_SIZE,
                                    width: ghostConfig.supplyRange * GRID_SIZE,
                                    height: ghostConfig.supplyRange * GRID_SIZE
                                }}
                            />
                        )}
                        {!ghostConfig.supplyRange && ghostConfig.power > 0 && coveredPowerSources.map((source, index) => {
                            const sourceConfig = FACILITIES.find(facility => facility.id === source.machineId);
                            if (!sourceConfig) return null;
                            const dims = getRotatedDimensions(sourceConfig.width, sourceConfig.height, source.rotation as 0 | 1 | 2 | 3);
                            return (
                                <div
                                    key={`covered-power-${index}`}
                                    className="power-range-preview"
                                    style={{
                                        left: (source.x + (dims.width / 2) - (source.range / 2)) * GRID_SIZE,
                                        top: (source.y + (dims.height / 2) - (source.range / 2)) * GRID_SIZE,
                                        width: source.range * GRID_SIZE,
                                        height: source.range * GRID_SIZE
                                    }}
                                />
                            );
                        })}
                        <div
                            className={classNames('machine-ghost', { 'invalid-placement': isGhostInvalid })}
                            title={invalidPlacementReason}
                            style={{
                                left: ghostPos.x * GRID_SIZE,
                                top: ghostPos.y * GRID_SIZE,
                                width: ghostWidth * GRID_SIZE,
                                height: ghostHeight * GRID_SIZE,
                            } as React.CSSProperties}
                        />
                        {/* 預覽箭頭 */}
                        {ghostPorts.map((p, i) => {
                            let arrowX = ghostPos.x + p.x;
                            let arrowY = ghostPos.y + p.y;
                            let rotation = 0;
                            const isInput = p.isInput;

                            // 根據方向向外延伸 1 格
                            switch (p.side) {
                                case 'left':
                                    arrowX -= 1;
                                    rotation = isInput ? 0 : 180; // 输入：指向设施，输出：背向设施
                                    break;
                                case 'right':
                                    arrowX += 1; // 因為 p.x 是內部座標
                                    rotation = isInput ? 180 : 0;
                                    break;
                                case 'top':
                                    arrowY -= 1;
                                    rotation = isInput ? 90 : 270;
                                    break;
                                case 'bottom':
                                    arrowY += 1;
                                    rotation = isInput ? 270 : 90;
                                    break;
                            }

                            return (
                                <div
                                    key={`ghost-arrow-${i}`}
                                    className={classNames('ghost-arrow', isInput ? 'input-arrow' : 'output-arrow', { 'pipe-arrow': p.kind === 'pipe' })}
                                    style={{
                                        left: arrowX * GRID_SIZE,
                                        top: arrowY * GRID_SIZE,
                                        transform: `rotate(${rotation}deg)`
                                    } as React.CSSProperties}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 6 15 12 9 18"></polyline>
                                    </svg>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

        </div>
    );
};
