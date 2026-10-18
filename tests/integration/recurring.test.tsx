import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes, jsonResponse } from '../support/api';
import { place, recurringRule, sessionRoutes, tenantAdmin } from '../support/fixtures';
import { renderApp } from '../support/render';
import { resetStores, signIn } from '../support/session';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: apiMock,
  apiError: (error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong. Please try again.',
}));

/** Three rules, one per cadence, one of them paused. */
function rules() {
  return {
    data: [
      recurringRule({ id: 1, title: 'Bins out', cadence: 'weekly', weekday: 4 }),
      recurringRule({
        id: 2,
        title: 'Pay the mortgage',
        cadence: 'monthly',
        weekday: null,
        day_of_month: 31,
        active: false,
        next_run_on: null,
        last_run_on: null,
        assignee: { id: 2, name: 'Sarah Rahman' },
        place: null,
        location_trigger: { place_id: 3, place_name: 'Downtown Office', direction: 'exit' },
      }),
      recurringRule({
        id: 3,
        title: 'Water the plants',
        cadence: 'daily',
        weekday: null,
        assignee: null,
        place: null,
      }),
    ],
  };
}

describe('recurring rules', () => {
  beforeEach(() => {
    resetStores();
    signIn(tenantAdmin, 'dashboard-token');
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/recurring-rules': rules(),
      '/v1/places': { data: [place({ id: 1, name: 'Home', category: 'home' })] },
    });
  });

  /** The facts row (assignee, place, next run) of the card titled `title`. */
  function facts(title: string): string {
    const card = screen.getByRole('heading', { name: title }).closest('div')?.parentElement;

    return card?.querySelector('dl')?.textContent ?? '';
  }

  it('lists each rule with its cadence in words, owner, place and state', async () => {
    renderApp('/recurring');

    expect(await screen.findByRole('heading', { name: 'Recurring' })).toBeInTheDocument();

    // The cadence, spelled out, not the raw enum.
    expect(await screen.findByText('Every Thursday')).toBeInTheDocument();
    expect(screen.getByText('Every month on the 31st')).toBeInTheDocument();
    expect(screen.getByText('Every day')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Bins out' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pay the mortgage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Water the plants' })).toBeInTheDocument();

    // Assignee and place, read off the facts row of the right card.
    expect(facts('Bins out')).toContain('Tanvir Rahman');
    expect(facts('Bins out')).toContain('Home');
    expect(facts('Pay the mortgage')).toContain('Sarah Rahman');
    expect(facts('Water the plants')).toContain('Anyone');

    // Running and paused are words, not colours: two running, one paused.
    expect(screen.getAllByText('Running')).toHaveLength(2);
    expect(screen.getAllByText('Paused')).toHaveLength(1);
    expect(screen.getByText('No runs while paused')).toBeInTheDocument();

    // The reminder cue is phrased like the request form's.
    expect(screen.getByText(/on leaving Downtown Office/)).toBeInTheDocument();
  });

  it('pauses and resumes a rule through the API', async () => {
    apiMock.patch.mockImplementation(() => jsonResponse({ data: {} }));

    renderApp('/recurring');

    await userEvent.click(await screen.findByRole('button', { name: 'Pause Bins out' }));

    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith('/v1/recurring-rules/1', { active: false }),
    );

    // Wait for the mutation to settle, so the next control is not mid-flight.
    expect(await screen.findByText('Rule paused. It will not run while paused.')).toBeInTheDocument();

    // The paused one offers the way back.
    await userEvent.click(screen.getByRole('button', { name: 'Resume Pay the mortgage' }));

    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith('/v1/recurring-rules/2', { active: true }),
    );
  });

  it('deletes a rule', async () => {
    apiMock.delete.mockImplementation(() => jsonResponse({}));

    renderApp('/recurring');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Water the plants' }));

    await waitFor(() => expect(apiMock.delete).toHaveBeenCalledWith('/v1/recurring-rules/3'));
  });

  it('asks for a weekday only when the cadence is weekly', async () => {
    renderApp('/recurring');

    await userEvent.click(await screen.findByRole('button', { name: 'Add a rule' }));

    expect(await screen.findByRole('dialog', { name: 'Add a rule' })).toBeInTheDocument();
    expect(screen.getByLabelText('Which day')).toBeInTheDocument();
    expect(screen.queryByLabelText('Which day of the month')).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Cadence'), 'monthly');

    expect(screen.getByLabelText('Which day of the month')).toBeInTheDocument();
    expect(screen.queryByLabelText('Which day')).not.toBeInTheDocument();
  });

  it('creates a rule with the full contract shape', async () => {
    apiMock.post.mockImplementation(() => jsonResponse({ data: recurringRule() }));

    renderApp('/recurring');

    await userEvent.click(await screen.findByRole('button', { name: 'Add a rule' }));

    await userEvent.type(await screen.findByLabelText('What repeats?'), 'Take the recycling out');
    await userEvent.selectOptions(screen.getByLabelText('Which day'), '2');
    await userEvent.selectOptions(screen.getByLabelText('Assign to'), '2');
    await userEvent.selectOptions(screen.getByLabelText('Remind me at'), '1');
    await userEvent.selectOptions(screen.getByLabelText('When'), 'exit');
    await userEvent.type(screen.getByLabelText('Amount (optional)'), '4.20');

    const dialog = screen.getByRole('dialog', { name: 'Add a rule' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save rule' }));

    await waitFor(() => expect(apiMock.post).toHaveBeenCalled());

    const [url, body] = apiMock.post.mock.calls[0];

    expect(url).toBe('/v1/recurring-rules');
    expect(body).toEqual({
      title: 'Take the recycling out',
      cadence: 'weekly',
      weekday: 2,
      day_of_month: null,
      active: true,
      assignee_id: 2,
      place_id: null,
      location_trigger_place_id: 1,
      location_trigger_direction: 'exit',
      // Major units in the field, integer minor units on the wire.
      amount_minor: 420,
    });
  });

  it('refuses an amount with more than two decimals before it calls the API', async () => {
    renderApp('/recurring');

    await userEvent.click(await screen.findByRole('button', { name: 'Add a rule' }));
    await userEvent.type(await screen.findByLabelText('What repeats?'), 'Pocket money');
    await userEvent.type(screen.getByLabelText('Amount (optional)'), '4.205');
    await userEvent.click(screen.getByRole('button', { name: 'Save rule' }));

    expect(await screen.findByText(/at most two decimals/i)).toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();
  });
});
