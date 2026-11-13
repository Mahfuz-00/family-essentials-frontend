import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { api, apiError } from '@/lib/api';
import { formatMoney, parseMoneyToMinor } from '@/lib/money';
import type { FinancialGoal } from '@/types';

const GOAL_CATEGORIES = [
  'emergency',
  'vacation',
  'home_renovation',
  'education',
  'car',
  'wedding',
  'retirement',
  'other',
];

export function GoalsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    category: 'emergency',
    target_amount: '',
    current_amount: '',
    target_date: '',
    status: 'active' as 'active' | 'achieved' | 'paused',
    notes: '',
  });

  const goals = useQuery({
    queryKey: ['finances', 'goals'],
    queryFn: async () => (await api.get<{ data: FinancialGoal[] }>('/v1/finances/goals')).data.data,
  });

  const createGoal = useMutation({
    mutationFn: async () => {
      const targetMinor = parseMoneyToMinor(form.target_amount);
      const currentMinor = form.current_amount ? parseMoneyToMinor(form.current_amount) : 0;
      return api.post('/v1/finances/goals', {
        name: form.name,
        category: form.category,
        target_amount_minor: targetMinor,
        current_amount_minor: currentMinor,
        target_date: form.target_date || null,
        status: form.status,
        notes: form.notes || null,
      });
    },
    onSuccess: async () => {
      setModalOpen(false);
      setNotice('Financial goal created successfully.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const updateContribution = useMutation({
    mutationFn: async () => {
      if (!selectedGoal) return;
      const addMinor = parseMoneyToMinor(contributeAmount);
      if (addMinor === null) return;
      const newTotal = selectedGoal.current_amount_minor + addMinor;
      return api.patch(`/v1/finances/goals/${selectedGoal.id}`, {
        current_amount_minor: newTotal,
        status: newTotal >= selectedGoal.target_amount_minor ? 'achieved' : selectedGoal.status,
      });
    },
    onSuccess: async () => {
      setContributeOpen(false);
      setContributeAmount('');
      setSelectedGoal(null);
      setNotice('Goal progress updated!');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/finances/goals/${id}`),
    onSuccess: async () => {
      setNotice('Goal removed.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const openCreateModal = () => {
    setForm({
      name: '',
      category: 'emergency',
      target_amount: '',
      current_amount: '',
      target_date: '',
      status: 'active',
      notes: '',
    });
    setModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Household Financial Goals"
          description="Set and track progress towards family savings targets, emergency funds, and major milestones."
          titleSize="headline"
          actions={
            <Button onClick={openCreateModal}>
              <Icon name="add" className="text-[18px] mr-1.5" />
              New Goal
            </Button>
          }
        />

        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert>{error}</Alert>}

        {goals.isError && (
          <QueryError error={goals.error} what="financial goals" onRetry={() => void goals.refetch()} />
        )}

        {goals.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {goals.data && goals.data.length === 0 && (
          <EmptyState
            title="No financial goals set yet"
            description="Create your first goal like an Emergency Fund, Family Vacation, or College Savings."
            action={<Button onClick={openCreateModal}>Set First Goal</Button>}
          />
        )}

        {goals.data && goals.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {goals.data.map((goal) => {
              const isAchieved = goal.status === 'achieved' || goal.progress_percent >= 100;
              return (
                <Card key={goal.id} className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <Badge tone={isAchieved ? 'success' : 'neutral'} className="capitalize mb-1.5">
                          {goal.category?.replace('_', ' ') || 'Goal'}
                        </Badge>
                        <h3 className="text-title-md font-bold text-on-surface">{goal.name}</h3>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isAchieved
                            ? 'bg-secondary/15 text-secondary'
                            : goal.status === 'paused'
                            ? 'bg-muted/15 text-muted'
                            : 'bg-primary/15 text-primary'
                        }`}
                      >
                        {goal.status}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mt-4 mb-2">
                      <span className="text-title-lg font-black text-on-surface">
                        {formatMoney(goal.current_amount_minor, goal.currency)}
                      </span>
                      <span className="text-body-sm text-muted">
                        of {formatMoney(goal.target_amount_minor, goal.currency)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-outline-variant/40 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all rounded-full ${
                          isAchieved ? 'bg-secondary' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, goal.progress_percent))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted mt-1.5">
                      <span>{goal.progress_percent.toFixed(1)}% complete</span>
                      {goal.target_date && <span>Target: {goal.target_date}</span>}
                    </div>

                    {goal.notes && (
                      <p className="mt-3 text-body-xs text-muted italic border-t border-outline-variant/40 pt-2">
                        {goal.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-5 pt-3 border-t border-outline-variant/40">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setContributeAmount('');
                        setContributeOpen(true);
                      }}
                    >
                      <Icon name="add" className="text-[16px] mr-1" />
                      Add Savings
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-error hover:bg-error/10"
                      onClick={() => {
                        if (confirm(`Delete goal "${goal.name}"?`)) {
                          deleteGoal.mutate(goal.id);
                        }
                      }}
                    >
                      <Icon name="delete" className="text-[18px]" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Goal Modal */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Create Financial Goal"
          description="Track a new milestone for your household with target amounts and timelines."
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button disabled={createGoal.isPending} onClick={() => createGoal.mutate()}>
                {createGoal.isPending ? 'Saving…' : 'Create Goal'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="goal-name">Goal Name</Label>
              <Input
                id="goal-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Emergency Fund (6 Months)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="goal-category">Category</Label>
                <Select
                  id="goal-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {GOAL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace('_', ' ')}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="goal-status">Status</Label>
                <Select
                  id="goal-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="achieved">Achieved</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="goal-target">Target Amount</Label>
                <Input
                  id="goal-target"
                  type="number"
                  step="any"
                  value={form.target_amount}
                  onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                  placeholder="e.g. 10000"
                />
              </div>

              <div>
                <Label htmlFor="goal-current">Currently Saved</Label>
                <Input
                  id="goal-current"
                  type="number"
                  step="any"
                  value={form.current_amount}
                  onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
                  placeholder="e.g. 2500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="goal-date">Target Completion Date (optional)</Label>
              <Input
                id="goal-date"
                type="date"
                value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="goal-notes">Notes (optional)</Label>
              <Input
                id="goal-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. High-yield savings allocation"
              />
            </div>
          </div>
        </Modal>

        {/* Add Contribution Modal */}
        <Modal
          open={contributeOpen}
          onClose={() => setContributeOpen(false)}
          title={`Add Funds to "${selectedGoal?.name}"`}
          description="Log additional savings contributed towards this household goal."
          footer={
            <>
              <Button variant="ghost" onClick={() => setContributeOpen(false)}>
                Cancel
              </Button>
              <Button disabled={updateContribution.isPending} onClick={() => updateContribution.mutate()}>
                {updateContribution.isPending ? 'Updating…' : 'Add Contribution'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="contrib-amount">Contribution Amount</Label>
              <Input
                id="contrib-amount"
                type="number"
                step="any"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                placeholder="e.g. 500.00"
                autoFocus
              />
            </div>
            {selectedGoal && (
              <p className="text-body-sm text-muted">
                Currently: {formatMoney(selectedGoal.current_amount_minor, selectedGoal.currency)} of{' '}
                {formatMoney(selectedGoal.target_amount_minor, selectedGoal.currency)} (
                {selectedGoal.progress_percent.toFixed(1)}%)
              </p>
            )}
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
