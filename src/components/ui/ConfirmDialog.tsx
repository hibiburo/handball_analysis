import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  isDanger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>キャンセル</Button>
          <Button variant={isDanger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-foreground">{message}</div>
    </Modal>
  );
}
