import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { OptionButtonGroup } from '@/components/ui/OptionButtonGroup';
import { useToast } from '@/components/ui/Toast';
import { handednessLabels, handednesses, toOptions, type Handedness } from '@/domain/enums';
import { toFieldErrors } from '@/domain/formErrors';
import { goalkeeperInputSchema } from '@/domain/schemas';
import type { Goalkeeper } from '@/domain/types';
import { goalkeeperActions } from '@/hooks/useGoalkeepers';

type GoalkeeperFormProps = {
  isOpen: boolean;
  /** 編集する GK。未指定なら新規登録 */
  goalkeeper?: Goalkeeper | undefined;
  /** チーム名の入力候補（登録済みのチーム名） */
  teamNameSuggestions?: string[];
  onClose: () => void;
  onSaved?: (goalkeeper: Goalkeeper) => void;
};

/** M1 GK登録・編集（functional-design.md 3.1） */
export function GoalkeeperForm(props: GoalkeeperFormProps) {
  // 開くたびに入力欄を初期化するため、開いている間だけ中身を描画する
  if (!props.isOpen) return null;
  return <GoalkeeperFormContent {...props} />;
}

function GoalkeeperFormContent({ goalkeeper, teamNameSuggestions = [], onClose, onSaved }: GoalkeeperFormProps) {
  const { showToast } = useToast();
  const formId = useId();
  const listId = useId();
  const [name, setName] = useState(goalkeeper?.name ?? '');
  const [teamName, setTeamName] = useState(goalkeeper?.teamName ?? '');
  const [number, setNumber] = useState(goalkeeper?.number?.toString() ?? '');
  const [handedness, setHandedness] = useState<Handedness>(goalkeeper?.handedness ?? 'unknown');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = goalkeeperInputSchema.safeParse({
      ...(goalkeeper && { id: goalkeeper.id }),
      name,
      teamName,
      ...(number.trim() !== '' && { number: Number(number) }),
      handedness,
    });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    setIsSaving(true);
    try {
      const saved = await goalkeeperActions.save(parsed.data);
      showToast(goalkeeper ? 'GKを更新しました' : 'GKを登録しました', { tone: 'success' });
      onSaved?.(saved);
      onClose();
    } catch {
      showToast('保存できませんでした。もう一度お試しください。', { tone: 'error' });
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      title={goalkeeper ? 'GKを編集' : 'GKを追加'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button variant="primary" type="submit" form={formId} disabled={isSaving}>
            {goalkeeper ? '更新する' : '登録する'}
          </Button>
        </>
      }
    >
      <form id={formId} className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          label="チーム名"
          isRequired
          value={teamName}
          list={listId}
          maxLength={50}
          autoComplete="off"
          error={errors['teamName']}
          onChange={(event) => setTeamName(event.target.value)}
        />
        <datalist id={listId}>
          {teamNameSuggestions.map((team) => (
            <option key={team} value={team} />
          ))}
        </datalist>
        <div className="grid grid-cols-[1fr_8rem] gap-3">
          <TextField
            label="GK名"
            isRequired
            value={name}
            maxLength={50}
            autoComplete="off"
            error={errors['name']}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label="背番号"
            inputMode="numeric"
            value={number}
            error={errors['number']}
            onChange={(event) => setNumber(event.target.value.replace(/[^0-9]/g, ''))}
          />
        </div>
        <OptionButtonGroup
          label="利き手"
          options={toOptions(handednesses, handednessLabels)}
          value={handedness}
          onChange={(value) => value && setHandedness(value)}
        />
      </form>
    </Modal>
  );
}
