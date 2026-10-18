import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
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
import { api, apiError } from '@/lib/api';
import type { Place } from '@/types';

const categories = ['grocery', 'pharmacy', 'home', 'office', 'school', 'other'];

const categoryIcon: Record<string, string> = {
  grocery: 'shopping_cart',
  pharmacy: 'medication',
  home: 'home',
  office: 'business',
  school: 'school',
  other: 'storefront',
};

const categoryTint: Record<string, string> = {
  grocery: 'bg-forest-soft text-secondary',
  pharmacy: 'bg-coral-soft text-error',
  home: 'bg-sage-soft text-primary',
  office: 'bg-surface-container text-primary',
  school: 'bg-surface-container text-primary',
  other: 'bg-surface-container-low text-on-surface-variant',
};

const emptyForm = {
  name: '',
  address: '',
  latitude: '23.8103',
  longitude: '90.4125',
  radius_meters: 300,
  category: 'grocery',
};

/**
 * Saved places: the list, the CRUD and the per-place store list.
 *
 * The spatial tooling (plot, zone inspector, boundary log) moved to the geofence
 * console, so neither screen has to do both jobs.
 */
export function PlacesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const places = useQuery({
    queryKey: ['places'],
    queryFn: async () => (await api.get<{ data: Place[] }>('/v1/places')).data.data,
  });

  // The boundary-event count lived only in the KPI strip, so the fetch went with
  // it: the console logs the events, and this page does not.
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['places'] });
  };

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const create = useMutation({
    mutationFn: async () =>
      api.post('/v1/places', {
        name: form.name,
        address: form.address || null,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radius_meters: form.radius_meters,
        category: form.category,
      }),
    onSuccess: async () => {
      setForm(emptyForm);
      setAddOpen(false);
      setError(null);
      setNotice('Place saved. Store-specific lists will now surface near it.');
      await refresh();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/places/${id}`),
    onSuccess: async () => {
      setError(null);
      setNotice('Place removed. Linked requests keep their free-text store name.');
      await refresh();
    },
    onError,
  });

  const list = places.data ?? [];

  const visible = useMemo(
    () =>
      list.filter((place) => {
        const matchesFilter = filter === 'all' || (place.category ?? 'other') === filter;
        const matchesSearch =
          search.trim() === '' ||
          `${place.name} ${place.address ?? ''}`.toLowerCase().includes(search.toLowerCase());

        return matchesFilter && matchesSearch;
      }),
    [list, filter, search],
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Family Workspace', 'Saved Places']}
          title="Saved places"
          description="The stores and places your family visits, each with the radius that arms its geofence."
          titleSize="headline"
          actions={
            <>
              <Link to="/places/console" className="inline-flex">
                <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-sage-soft px-4 text-label-lg font-semibold text-secondary transition-all hover:bg-forest-soft">
                  <Icon name="map" className="text-[18px]" />
                  Geofence console
                </span>
              </Link>
              <Button size="lg" onClick={() => setAddOpen(true)}>
                <Icon name="add_location_alt" className="text-[18px]" />
                Add New Place
              </Button>
            </>
          }
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        <Card className="flex flex-col gap-3 p-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full max-w-sm">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search saved places…"
              aria-label="Search saved places"
              className="h-10 pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter places">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              All places ({list.length})
            </FilterChip>
            {categories
              .filter((category) => list.some((place) => (place.category ?? 'other') === category))
              .map((category) => (
                <FilterChip
                  key={category}
                  active={filter === category}
                  onClick={() => setFilter(category)}
                >
                  {category}
                </FilterChip>
              ))}
          </div>
        </Card>

        {places.isLoading && <p className="text-body-md text-muted">Loading places…</p>}

        {places.isSuccess && visible.length === 0 && (
          <EmptyState
            title={list.length === 0 ? 'No saved places yet' : 'No places match'}
            description={
              list.length === 0
                ? 'Add the stores and places your family visits so lists surface at the right moment.'
                : 'Adjust the search or category filter to find a saved place.'
            }
            action={
              <Button size="lg" onClick={() => setAddOpen(true)}>
                Add New Place
              </Button>
            }
          />
        )}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {visible.map((place) => {
            const tone = categoryTint[place.category ?? 'other'] ?? categoryTint.other;

            return (
              <Card key={place.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}
                    >
                      <Icon name={categoryIcon[place.category ?? 'other']} className="text-[20px]" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <h2 className="truncate text-headline-sm text-on-surface">{place.name}</h2>
                      <span className="truncate text-body-sm text-muted">
                        {place.address ??
                          `${place.latitude.toFixed(3)}, ${place.longitude.toFixed(3)}`}
                      </span>
                    </span>
                  </span>
                  <Badge tone={(place.active_requests_count ?? 0) > 0 ? 'primary' : 'neutral'}>
                    {place.active_requests_count ?? 0} open
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-sage-soft px-2.5 py-0.5 text-label-sm capitalize text-secondary">
                    {place.kind_label ?? place.category ?? 'other'}
                  </span>
                  <span className="rounded-full bg-surface-container-low px-2.5 py-0.5 text-label-sm text-on-surface-variant">
                    {place.radius_meters} m radius
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-canvas pt-3">
                  <Link
                    to="/places/console"
                    className="text-body-md font-semibold text-secondary hover:underline"
                  >
                    Open in console →
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-error hover:bg-coral-soft"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(place.id)}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-primary/30 py-3.5 text-label-lg font-semibold text-primary transition-all hover:border-primary hover:bg-sage-soft/40"
        >
          + Add another destination or school zone
        </button>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a saved place"
        description="Requests bound to this place appear as a store list when someone is nearby."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              disabled={create.isPending || form.name.trim() === ''}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Saving…' : 'Save place'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="place-name">Name</Label>
            <Input
              id="place-name"
              autoFocus
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Whole Foods Market"
            />
          </div>

          <div>
            <Label htmlFor="place-address">Address (optional)</Label>
            <Input
              id="place-address"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              placeholder="12 Main Street"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="place-lat">Latitude</Label>
              <Input
                id="place-lat"
                inputMode="decimal"
                value={form.latitude}
                onChange={(event) => setForm({ ...form, latitude: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="place-lng">Longitude</Label>
              <Input
                id="place-lng"
                inputMode="decimal"
                value={form.longitude}
                onChange={(event) => setForm({ ...form, longitude: event.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="place-category">Category</Label>
            <Select
              id="place-category"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="place-radius">Geofence radius: {form.radius_meters} m</Label>
            <input
              id="place-radius"
              type="range"
              min={50}
              max={2000}
              step={50}
              value={form.radius_meters}
              onChange={(event) => setForm({ ...form, radius_meters: Number(event.target.value) })}
              className="h-2 w-full cursor-pointer accent-secondary"
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-full px-3 py-1.5 text-label-md capitalize transition-all ${
        active
          ? 'bg-secondary font-semibold text-on-secondary'
          : 'bg-canvas text-on-surface-variant hover:bg-sage-soft'
      }`}
    >
      {children}
    </button>
  );
}
