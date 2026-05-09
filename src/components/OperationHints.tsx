import { Icon } from '@iconify/react';
import { useGameStore } from '../store/gameStore';
import { GameMode } from '../types';
import './OperationHints.scss';

export const OperationHints = () => {
    const { mode, selectedMachineId, selectedMachineIds, selectedConnectionIds } = useGameStore();
    const hasSelection = selectedMachineIds.length > 0 || selectedConnectionIds.length > 0;

    return (
        <div className="operation-hints">
            {mode === GameMode.BUILD && !selectedMachineId && !hasSelection && (
                <>
                    <div className="hint-item"><div className="key-icon">E</div><span>传送带连接</span></div>
                    <div className="hint-item"><div className="key-icon">Q</div><span>管道连接</span></div>
                    <div className="hint-item"><div className="key-icon">X</div><span>框选模式</span></div>
                    <div className="hint-item"><div className="key-icon">F1</div><span>插入蓝图</span></div>
                </>
            )}

            {hasSelection && mode !== GameMode.MOVE_SELECTION && (
                <>
                    <div className="hint-item"><div className="key-icon">M</div><span>批量移动</span></div>
                    <div className="hint-item"><div className="key-icon">F</div><span>批量删除</span></div>
                    <div className="hint-item"><div className="key-icon">Ctrl</div><span>+</span><div className="key-icon">C</div><span>复制</span></div>
                    <div className="hint-item"><div className="key-icon">Ctrl</div><span>+</span><div className="key-icon">S</div><span>另存蓝图</span></div>
                </>
            )}

            {selectedMachineId && (
                <>
                    <div className="hint-item"><div className="key-icon">R</div><span>旋转设施</span></div>
                    <div className="hint-item"><div className="key-icon"><Icon icon="ph:mouse-left-click-fill" width="24" height="24" /></div><span>确认放置</span></div>
                    <div className="hint-item"><div className="key-icon"><Icon icon="ph:mouse-right-click-fill" width="24" height="24" /></div><span>取消放置</span></div>
                </>
            )}

            {(mode === GameMode.WIRE || mode === GameMode.PIPE) && (
                <>
                    <div className="hint-item"><div className="key-icon"><Icon icon="ph:mouse-left-click-fill" width="24" height="24" /></div><span>确认节点</span></div>
                    <div className="hint-item"><div className="key-icon"><Icon icon="ph:mouse-right-click-fill" width="24" height="24" /></div><span>取消连接</span></div>
                </>
            )}

            {mode === GameMode.BOX_SELECT && (
                <div className="hint-item"><div className="key-icon"><Icon icon="ph:mouse-left-click-fill" width="24" height="24" /></div><span>拖拽选择</span></div>
            )}

            {mode === GameMode.MOVE_SELECTION && (
                <>
                    <div className="hint-item"><div className="key-icon"><Icon icon="ph:mouse-left-click-fill" width="24" height="24" /></div><span>确认移动</span></div>
                    <div className="hint-item"><div className="key-icon"><Icon icon="ph:mouse-right-click-fill" width="24" height="24" /></div><span>取消移动</span></div>
                </>
            )}

            <div className="hint-item"><div className="key-icon"><Icon icon="ph:mouse-left-click-fill" width="24" height="24" /></div><span>移动画面</span></div>
            <div className="hint-item"><div className="key-icon">WASD</div><span>移动画面</span></div>
            <div className="hint-item"><div className="key-icon"><Icon icon="ph:mouse-scroll" width="24" height="24" /></div><span>缩放画面</span></div>
            <div className="hint-item"><div className="key-icon">Ctrl</div><span>+</span><div className="key-icon">Z</div><span>撤销</span></div>
            <div className="hint-item"><div className="key-icon">Ctrl</div><span>+</span><div className="key-icon">Shift</div><span>+</span><div className="key-icon">Z</div><span>恢复</span></div>
        </div>
    );
};
