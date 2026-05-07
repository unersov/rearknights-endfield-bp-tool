import { Button, Dialog, Input, VStack } from '@chakra-ui/react';
import { useState } from 'react';

interface SaveDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
}

export const SaveDialog = ({ isOpen, onClose, onSave }: SaveDialogProps) => {
    const [name, setName] = useState('');

    const handleSave = () => {
        if (!name.trim()) return;
        onSave(name);
        setName('');
        onClose();
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content backgroundColor="var(--gray-light)">
                    <Dialog.Header>
                        <Dialog.Title color="var(--gray-dark)">保存蓝图</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body>
                        <VStack gap={4}>
                            <Input
                                placeholder="请输入蓝图名称..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                autoFocus
                                color="var(--gray-dark)"
                                borderColor="var(--gray-dark)"
                                _placeholder={{ color: "var(--gray-dark)" }}
                            />
                        </VStack>
                    </Dialog.Body>
                    <Dialog.Footer>
                        <Dialog.ActionTrigger asChild>
                            <Button variant="outline" onClick={onClose} className="gray-btn">取消</Button>
                        </Dialog.ActionTrigger>
                        <Button onClick={handleSave} variant="outline" className="yellow-btn">保存</Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
};
