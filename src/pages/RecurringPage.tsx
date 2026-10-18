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
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { api, apiError } from '@/lib/api';
import { AMOUNT_INPUT_ERROR, parseMoneyToMinor } from '@/lib/money';
import { CADENCES, WEEKDAYS, formatDateOnly, ruleCadence } from '@/lib/recurring';
import type {
  LocationTriggerDirection,
  Place,
  RecurringCadence,
  RecurringRule,
  TenantMember,
} from '@/types';

const emptyForm = {
  title: '',
  cadence: 'weekly' as RecurringCadence,
  weekday: '4',
  day_of_month: '1',
  assignee_id: '',
  place_id: '',
  trigger_place_id: '',
  trigger_direction: '' as '' | LocationTriggerDirection,
  amount: '',
};


/**
 * Recurring rules: the standing chores and errands a household repeats, and the
 * one place they are created, paused or dropped.
 *
 * The reminder cue mirrors the request form on purpose — "where to buy it" and
 * "where to remind me" are different facts, and both screens ask for them the
 * same way.
 */
export function RecurringPage() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rules = useQuery({
    queryKey: ['recurring-rules'],
    queryFn: async () =>
      (await api.get<{ data: RecurringRule[] }>('/v1/recurring-rules')).data.data,
  });

  const members = useQuery({
    queryKey: ['tenant', 'members'],
    queryFn: async () => (await api.get<{ data: TenantMember[] }>('/v1/tenant/members')).data.data,
  });

  const places = useQuery({
    queryKey: ['places'],
    queryFn: async () => (await api.get<{ data: Place[] }>('/v1/places')).data.data,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['recurring-rules'] });
  };

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  /**
   * The amount is parsed before the mutation starts: `apiError` deliberately
   * maps anything that is not an API error to a generic sentence, so a local
   * validation failure has to be surfaced here rather than thrown.
   */
  const submit = () => {
    const typed = form.amount.trim();

    if (typed === '') {
      create.mutate(null);

      return;
    }

    const amount = parseMoneyToMinor(typed);

    if (amount === null) {
      setError(AMOUNT_INPUT_ERROR);
      setNotice(null);

      return;
    }

    create.mutate(amount);
  };

  const create = useMutation({
    mutationFn: async (amount: number | null) => {
      return api.post('/v1/recurring-rules', {
        title: form.title,
        cadence: form.cadence,
        // Only the selector the cadence uses is sent; the other is null.
        weekday: form.cadence === 'weekly' ? Number(form.weekday) : null,
        day_of_month: form.cadence === 'monthly' ? Number(form.day_of_month) : null,
        active: true,
        assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
        place_id: form.place_id ? Number(form.place_id) : null,
        location_trigger_place_id: form.trigger_place_id ? Number(form.trigger_place_id) : null,
        location_trigger_direction: form.trigger_direction || null,
        amount_minor: amount,
      });
    },
    onSuccess: async () => {
      setForm(emptyForm);
      setAddOpen(false);
      setError(null);
      setNotice('Rule saved. It will appear on the day it is due.');
      await refresh();
    },
    onError,
  });

  const setActive = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) =>
      api.patch(`/v1/recurring-rules/${id}`, { active }),
    onSuccess: async (_response, variables) => {
      setError(null);
      setNotice(variables.active ? 'Rule resumed.' : 'Rule paused. It will not run while paused.');
      await refresh();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/recurring-rules/${id}`),
    onSuccess: async () => {
      setError(null);
      setNotice('Rule deleted.');
      await refresh();
    },
    onError,
  });

  const list = rules.data ?? [];
  const memberList = members.data ?? [];
  const placeList = places.data ?? [];
  const busy = setActive.isPending || remove.isPending;

  const activeCount = list.filter((rule) => rule.active).length;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Family Workspace', 'Recurring']}
          title="Recurring"
          description="The chores and errands that come round again, each with the day it next falls due."
          titleSize="headline"
          actions={
            <Button size="lg" onClick={() => setAddOpen(true)}>
              <Icon name="add" className="text-[18px]" />
              Add a rule
            </Button>
          }
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {rules.isError && <Alert>{apiError(rules.error)}</Alert>}

        {rules.isLoading && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {[0, 1].map((key) => (
              <SkeletonCard key={key} />
            ))}
          </div>
        )}

        {rules.isSuccess && list.length === 0 && (
          <EmptyState
            title="No recurring rules yet"
            description="Weekly bins, the monthly bill run, the school run every weekday — add one and it stops being something to remember."
            action={
              <Button size="lg" onClick={() => setAddOpen(true)}>
                Add a rule
              </Button>
            }
          />
        )}

        {list.length > 0 && (
          <p className="text-body-sm text-muted">
            {list.length} {list.length === 1 ? 'rule' : 'rules'} · {activeCount} running ·{' '}
            {list.length - activeCount} paused
          </p>
        )}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {list.map((rule) => (
            <Card key={rule.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-1">
                  <h2 className="truncate text-headline-sm text-on-surface">{rule.title}</h2>
                  <span className="flex flex-wrap items-center gap-2 text-body-sm text-on-surface-variant">
                    <Icon name="event_repeat" className="text-[16px] text-primary" />
                    {ruleCadence(rule)}
                  </span>
                </span>
                {/* A word, not only a colour: paused reads as paused. */}
                <Badge tone={rule.active ? 'success' : 'neutral'}>
                  {rule.active ? 'Running' : 'Paused'}
                </Badge>
              </div>

              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Fact icon="person" label="Assignee" value={rule.assignee?.name ?? 'Anyone'} />
                <Fact icon="storefront" label="Place" value={rule.place?.name ?? 'Anywhere'} />
                <Fact
                  icon="schedule"
                  label="Next run"
                  value={
                    rule.active ? (formatDateOnly(rule.next_run_on) ?? 'Not scheduled') : 'No runs while paused'
                  }
                />
              </dl>

              {rule.location_trigger && (
                <p className="flex items-center gap-1.5 rounded-xl bg-sage-soft px-3 py-2 text-body-sm text-primary">
                  <Icon name="pin_drop" className="text-[16px]" />
                  Reminds me {rule.location_trigger.direction === 'exit' ? 'on leaving' : 'on arriving at'}{' '}
                  {rule.location_trigger.place_name}
                </p>
              )}

              <div className="flex items-center justify-between border-t border-canvas pt-3">
                <span className="text-label-sm text-muted">
                  {rule.last_run_on
                    ? `Last run ${formatDateOnly(rule.last_run_on)}`
                    : 'Has not run yet'}
                </span>
                <span className="flex items-center gap-2">
                  <Button
                    variant="soft"
                    size="sm"
                    disabled={busy}
                    onClick={() => setActive.mutate({ id: rule.id, active: !rule.active })}
                  >
                    {rule.active ? 'Pause' : 'Resume'}
                    <span className="sr-only"> {rule.title}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-error hover:bg-coral-soft"
                    disabled={busy}
                    onClick={() => remove.mutate(rule.id)}
                  >
                    Delete
                    <span className="sr-only"> {rule.title}</span>
                  </Button>
                </span>
              </div>
            </Card>
          ))}
        </section>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a rule"
        description="A chore that comes round again. The assignee is told on the day it is due."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" disabled={create.isPending || form.title.trim() === ''} onClick={submit}>
              {create.isPending ? 'Saving…' : 'Save rule'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="rule-title">What repeats?</Label>
            <Input
              id="rule-title"
              autoFocus
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Bins out"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="rule-cadence">Cadence</Label>
              <Select
                id="rule-cadence"
                value={form.cadence}
                onChange={(event) =>
                  setForm({ ...form, cadence: event.target.value as RecurringCadence })
                }
              >
                {CADENCES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            {form.cadence === 'weekly' && (
              <div>
                <Label htmlFor="rule-weekday">Which day</Label>
                <Select
                  id="rule-weekday"
                  value={form.weekday}
                  onChange={(event) => setForm({ ...form, weekday: event.target.value })}
                >
                  {WEEKDAYS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {form.cadence === 'monthly' && (
              <div>
                <Label htmlFor="rule-day">Which day of the month</Label>
                <Select
                  id="rule-day"
                  value={form.day_of_month}
                  onChange={(event) => setForm({ ...form, day_of_month: event.target.value })}
                >
                  {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="rule-assignee">Assign to</Label>
              <Select
                id="rule-assignee"
                value={form.assignee_id}
                onChange={(event) => setForm({ ...form, assignee_id: event.target.value })}
              >
                <option value="">Anyone in the household</option>
                {memberList.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="rule-place">Saved place</Label>
              <Select
                id="rule-place"
                value={form.place_id}
                onChange={(event) => setForm({ ...form, place_id: event.target.value })}
              >
                <option value="">No saved place</option>
                {placeList.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="rule-trigger-place">Remind me at</Label>
              <Select
                id="rule-trigger-place"
                value={form.trigger_place_id}
                onChange={(event) =>
                  setForm({
                    ...form,
                    trigger_place_id: event.target.value,
                    trigger_direction: event.target.value
                      ? form.trigger_direction || 'enter'
                      : '',
                  })
                }
              >
                <option value="">Time only</option>
                {placeList.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </Select>
            </div>

            {form.trigger_place_id !== '' && (
              <div>
                <Label htmlFor="rule-trigger-direction">When</Label>
                <Select
                  id="rule-trigger-direction"
                  value={form.trigger_direction || 'enter'}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      trigger_direction: event.target.value as LocationTriggerDirection,
                    })
                  }
                >
                  <option value="enter">On arriving</option>
                  <option value="exit">On leaving</option>
                </Select>
              </div>
            )}

            <div className="sm:col-span-2">
              <Label htmlFor="rule-amount">Amount (optional)</Label>
              <Input
                id="rule-amount"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder="12.50"
                aria-describedby="rule-amount-hint"
              />
              <p id="rule-amount-hint" className="mt-1.5 text-body-sm text-muted">
                Second decimals only — sent to the ledger as minor units.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2">
      <Icon name={icon} className="text-[18px] text-primary" />
      <span className="flex min-w-0 flex-col">
        <dt className="text-label-sm uppercase tracking-wider text-muted">{label}</dt>
        <dd className="truncate text-body-sm text-on-surface">{value}</dd>
      </span>
    </div>
  );
}
