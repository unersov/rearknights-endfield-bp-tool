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

const GRID_SIZE = 40; // 需與 CSS 中的 --grid-size 保持一致

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

    // 快捷鍵 E 和 R
    const setMode = useGameStore(s => s.setMode);
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
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
            addMachine(selectedMachineId, pos.x, pos.y, previewRotation);
            // 如果未按住 Ctrl，取消选择设施
            if (!e.ctrlKey) {
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
    };

    // 预览设施计算
    const ghostConfig = (mode === GameMode.BUILD && selectedMachineId) ? FACILITIES.find(m => m.id === selectedMachineId) : null;
    let isGhostInvalid = false;
    let ghostWidth = 0;
    let ghostHeight = 0;
    let ghostPorts: (PortConfig & { isInput: boolean })[] = [];
    let ghostPos: Point | null = null;

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

        const isOutOfBounds = candidate.x < 0 || candidate.y < 0 ||
            candidate.x + candidate.width > gridWidth ||
            candidate.y + candidate.height > gridHeight;

        isGhostInvalid = isOutOfBounds || checkCollision(candidate, machines);

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
                        width: gridWidth * GRID_SIZE,
                        height: gridHeight * GRID_SIZE
                    }}
                />

                {/* 連線 SVG 圖層 */}
                <svg
                    className="connections-layer"
                    style={{
                        width: gridWidth * GRID_SIZE,
                        height: gridHeight * GRID_SIZE,
                        pointerEvents: 'none', // Ensure clicks pass through to grid
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
                        <div
                            className={classNames('machine-ghost', { 'invalid-placement': isGhostInvalid })}
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
                                    className={classNames('ghost-arrow', isInput ? 'input-arrow' : 'output-arrow')}
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
