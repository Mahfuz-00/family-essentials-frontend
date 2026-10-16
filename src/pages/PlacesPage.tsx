import { useMemo, useState } from 'react';
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
import { api, apiError } from '@/lib/api';
import type { GeofenceEvent, Place, ServiceRequest } from '@/types';

const categories = ['grocery', 'pharmacy', 'home', 'school', 'other'];

const categoryIcon: Record<string, string> = {
  grocery: 'shopping_cart',
  pharmacy: 'medication',
  home: 'home',
  school: 'school',
  other: 'storefront',
};

const categoryTint: Record<string, string> = {
  grocery: 'bg-forest-soft text-secondary',
  pharmacy: 'bg-coral-soft text-error',
  home: 'bg-sage-soft text-primary',
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

export function PlacesPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [radius, setRadius] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [proximity, setProximity] = useState<string | null>(null);

  const places = useQuery({
    queryKey: ['places'],
    queryFn: async () => (await api.get<{ data: Place[] }>('/v1/places')).data.data,
  });

  const events = useQuery({
    queryKey: ['geofence-events'],
    queryFn: async () => (await api.get<{ data: GeofenceEvent[] }>('/v1/geofence-events')).data.data,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['places'] });
    await queryClient.invalidateQueries({ queryKey: ['geofence-events'] });
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

  const updateRadius = useMutation({
    mutationFn: async ({ id, radiusMeters }: { id: number; radiusMeters: number }) =>
      api.patch(`/v1/places/${id}`, { radius_meters: radiusMeters }),
    onSuccess: async () => {
      setError(null);
      setNotice('Geofence radius saved.');
      await refresh();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/places/${id}`),
    onSuccess: async () => {
      setSelected(null);
      setError(null);
      setNotice('Place removed. Linked requests keep their free-text store name.');
      await refresh();
    },
    onError,
  });

  const reportPosition = useMutation({
    mutationFn: async (coords: { latitude: number; longitude: number }) =>
      (
        await api.post<{ transitions: { place_id: number; event: string; distance_meters: number }[] }>(
          '/v1/geofences/evaluate',
          coords,
        )
      ).data,
    onSuccess: async (data) => {
      setError(null);
      setNotice(null);
      setProximity(
        data.transitions.length === 0
          ? 'No boundary changes recorded for that position.'
          : data.transitions
              .map(
                (transition) =>
                  `${transition.event} on zone #${transition.place_id} at ${transition.distance_meters} m`,
              )
              .join(', '),
      );
      await refresh();
    },
    onError,
  });

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('This browser does not expose a location API.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        reportPosition.mutate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () =>
        setError(
          'Location permission was denied or unavailable. Time-based reminders still fire normally.',
        ),
    );
  };

  const list = places.data ?? [];
  const eventList = events.data ?? [];

  const visible = useMemo(() => {
    return list.filter((place) => {
      const matchesFilter = filter === 'all' || (place.category ?? 'other') === filter;
      const matchesSearch =
        search.trim() === '' ||
        `${place.name} ${place.address ?? ''}`.toLowerCase().includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [list, filter, search]);

  const active = list.find((place) => place.id === selected) ?? visible[0] ?? list[0] ?? null;
  const sliderValue = radius ?? active?.radius_meters ?? 300;

  // The store-specific shopping list for the selected zone.
  const needs = useQuery({
    queryKey: ['places', active?.id, 'requests'],
    queryFn: async () =>
      (await api.get<{ data: ServiceRequest[] }>(`/v1/places/${active?.id}/requests`)).data.data,
    enabled: active !== null,
  });

  const kpis = [
    {
      label: 'Saved Places',
      value: String(list.length),
      icon: 'pin_drop',
      tone: 'bg-sage-soft text-primary',
    },
    {
      label: 'Geofenced Zones',
      value: String(list.filter((place) => place.radius_meters > 0).length),
      icon: 'radar',
      tone: 'bg-forest-soft text-secondary',
    },
    {
      label: 'Open Store Requests',
      value: String(list.reduce((total, place) => total + (place.active_requests_count ?? 0), 0)),
      icon: 'shopping_basket',
      tone: 'bg-coral-soft text-error',
    },
    {
      label: 'Boundary Events Logged',
      value: String(eventList.length),
      icon: 'notifications_active',
      tone: 'bg-sage-soft text-secondary',
    },
  ];

  const bounds = useMemo(() => {
    if (list.length === 0) {
      return null;
    }

    const lats = list.map((place) => place.latitude);
    const lngs = list.map((place) => place.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Pad a degenerate bounding box so a single place still lands centred.
    const latSpan = maxLat - minLat || 0.01;
    const lngSpan = maxLng - minLng || 0.01;

    return { minLat, maxLat, minLng, maxLng, latSpan, lngSpan };
  }, [list]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Family Workspace', 'Saved Places & Geofences']}
          title="Saved Places & Geofence Map Console"
          description="Configure domestic proximity radiuses, arrival automation triggers, and grocery store geofence alerts for all paired household devices."
          actions={
            <>
              <Button variant="outline" size="lg" onClick={useMyLocation} disabled={reportPosition.isPending}>
                <Icon name="gps_fixed" className="text-[18px] text-primary" />
                {reportPosition.isPending ? 'Reading position…' : 'Report my position'}
              </Button>
              <Button size="lg" onClick={() => setAddOpen(true)}>
                <Icon name="add_location_alt" className="text-[18px]" />
                Add New Place
              </Button>
            </>
          }
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {proximity && <Alert tone="info">{proximity}</Alert>}

        {/* KPI row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="flex items-center justify-between p-4">
              <span className="flex flex-col">
                <span className="text-display-lg font-bold text-on-surface">{kpi.value}</span>
                <span className="text-body-sm text-muted">{kpi.label}</span>
              </span>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.tone}`}>
                <Icon name={kpi.icon} className="text-[20px]" />
              </span>
            </Card>
          ))}
        </section>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          {/* ---------------------------- place cards ---------------------------- */}
          <div className="flex flex-col gap-3 xl:col-span-5">
            <div className="flex flex-col gap-3 rounded-2xl bg-surface p-2 shadow-e1">
              <div className="relative">
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
                  All Places ({list.length})
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
            </div>

            {places.isLoading && <p className="text-body-md text-muted">Loading places…</p>}

            {visible.map((place) => {
              const isActive = active?.id === place.id;
              const tone = categoryTint[place.category ?? 'other'] ?? categoryTint.other;

              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => {
                    setSelected(place.id);
                    setRadius(null);
                  }}
                  aria-pressed={isActive}
                  className={`flex cursor-pointer flex-col gap-3 rounded-2xl bg-surface p-4 text-left transition-all ${
                    isActive
                      ? 'border-2 border-secondary shadow-[0_4px_16px_rgba(55,104,71,0.08)]'
                      : 'border border-[rgba(43,45,66,0.05)] shadow-e1 hover:shadow-e2'
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                        <Icon name={categoryIcon[place.category ?? 'other']} className="text-[20px]" />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-headline-sm text-on-surface">{place.name}</span>
                        <span className="truncate text-body-sm text-muted">
                          {place.address ?? `${place.latitude.toFixed(3)}, ${place.longitude.toFixed(3)}`}
                        </span>
                      </span>
                    </span>
                    <Badge tone={(place.active_requests_count ?? 0) > 0 ? 'primary' : 'neutral'}>
                      {place.active_requests_count ?? 0} open
                    </Badge>
                  </span>

                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-sage-soft px-2.5 py-0.5 text-label-sm text-secondary capitalize">
                      {place.category ?? 'other'}
                    </span>
                    <span className="rounded-full bg-surface-container-low px-2.5 py-0.5 text-label-sm text-on-surface-variant">
                      {place.radius_meters} m radius
                    </span>
                  </span>
                </button>
              );
            })}

            {places.isSuccess && visible.length === 0 && (
              <EmptyState
                title={list.length === 0 ? 'No saved places yet' : 'No places match'}
                description={
                  list.length === 0
                    ? 'Add the stores and places your family visits so lists surface at the right moment.'
                    : 'Adjust the search or category filter to find a saved place.'
                }
                action={<Button size="lg" onClick={() => setAddOpen(true)}>Add New Place</Button>}
              />
            )}

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-primary/30 py-3.5 text-label-lg font-semibold text-primary transition-all hover:border-primary hover:bg-sage-soft/40"
            >
              + Add Another Destination or School Zone
            </button>
          </div>

          {/* ------------------------------- console ----------------------------- */}
          <div className="flex flex-col gap-5 xl:col-span-7">
            {active && (
              <div className="relative h-[620px] overflow-hidden rounded-3xl bg-[#EAE8DE] shadow-e1">
                {bounds && (
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full"
                    role="img"
                    aria-label={`Schematic plot of ${list.length} saved places and their geofence radii`}
                  >
                    <defs>
                      <pattern id="streets" width="8" height="8" patternUnits="userSpaceOnUse">
                        <path d="M8 0H0v8" fill="none" stroke="rgba(43,45,66,0.07)" strokeWidth="0.3" />
                      </pattern>
                    </defs>
                    <rect width="100" height="100" fill="url(#streets)" />

                    {list.map((place) => {
                      const x = ((place.longitude - bounds.minLng) / bounds.lngSpan) * 80 + 10;
                      const y = ((bounds.maxLat - place.latitude) / bounds.latSpan) * 80 + 10;
                      // Radius in metres scaled to the plot's span for a comparable size.
                      const metresPerUnit =
                        Math.max(bounds.latSpan * 111_000, bounds.lngSpan * 111_000) / 80;
                      const r = Math.max(1.5, Math.min(22, place.radius_meters / metresPerUnit));
                      const isActive = active.id === place.id;

                      return (
                        <g key={place.id}>
                          <circle
                            cx={x}
                            cy={y}
                            r={r}
                            fill={isActive ? 'rgba(55,104,71,0.18)' : 'rgba(55,104,71,0.08)'}
                            stroke={isActive ? '#376847' : 'rgba(55,104,71,0.45)'}
                            strokeWidth={isActive ? 0.6 : 0.3}
                          />
                          <circle cx={x} cy={y} r={isActive ? 1.8 : 1.3} fill="#376847" />
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Map controls */}
                <div className="absolute right-4 top-4 flex flex-col gap-2">
                  <span className="flex items-center gap-2 rounded-xl bg-surface/90 px-3 py-1.5 text-label-sm text-secondary shadow-e1 backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    {list.length} zones plotted
                  </span>
                  <button
                    type="button"
                    onClick={useMyLocation}
                    aria-label="Report my current position"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-surface/90 text-on-surface-variant shadow-e1 backdrop-blur transition-colors hover:text-primary"
                  >
                    <Icon name="my_location" className="text-[18px]" />
                  </button>
                </div>

                {/* Zone inspector */}
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-surface/95 p-4 shadow-e2 backdrop-blur-md">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-label-sm uppercase tracking-wider text-muted">
                        Selected zone inspector
                      </span>
                      <span className="flex items-center gap-2">
                        <h3 className="truncate text-headline-sm text-on-surface">{active.name}</h3>
                        <Badge tone="primary">{active.radius_meters} m</Badge>
                      </span>
                      <span className="truncate text-body-sm text-muted">
                        {active.latitude.toFixed(4)}, {active.longitude.toFixed(4)}
                        {active.address ? ` · ${active.address}` : ''}
                      </span>

                      {/* Real open items bound to this place. */}
                      {needs.data && needs.data.length > 0 && (
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-label-sm font-bold text-on-surface-variant">Needs:</span>
                          {needs.data.slice(0, 6).map((request) => (
                            <span
                              key={request.id}
                              className="rounded-full bg-forest-soft px-2.5 py-0.5 text-label-sm text-secondary"
                            >
                              {request.title}
                              {request.quantity ? ` · ${request.quantity}` : ''}
                            </span>
                          ))}
                          {needs.data.length > 6 && (
                            <span className="text-label-sm text-muted">
                              +{needs.data.length - 6} more
                            </span>
                          )}
                        </span>
                      )}

                      <label className="mt-2 flex flex-col gap-1">
                        <span className="text-label-sm text-on-surface-variant">
                          Geofence radius: {sliderValue} m
                        </span>
                        <input
                          type="range"
                          min={50}
                          max={2000}
                          step={50}
                          value={sliderValue}
                          aria-label={`Geofence radius for ${active.name}`}
                          onChange={(event) => setRadius(Number(event.target.value))}
                          onPointerUp={() =>
                            active.radius_meters !== sliderValue &&
                            updateRadius.mutate({ id: active.id, radiusMeters: sliderValue })
                          }
                          onKeyUp={() =>
                            active.radius_meters !== sliderValue &&
                            updateRadius.mutate({ id: active.id, radiusMeters: sliderValue })
                          }
                          className="h-2 w-full cursor-pointer accent-secondary"
                        />
                      </label>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="soft"
                        disabled={reportPosition.isPending}
                        onClick={() =>
                          reportPosition.mutate({
                            latitude: active.latitude,
                            longitude: active.longitude,
                          })
                        }
                      >
                        <Icon name="sensors" className="text-[18px]" />
                        Test simulated ping
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-error hover:bg-coral-soft"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(active.id)}
                      >
                        Remove place
                      </Button>
                    </div>
                  </div>

                  <p className="mt-2 text-body-sm text-muted">
                    Schematic plot of real stored coordinates, drawn to relative scale. Live map tiles
                    need a tile-provider key.
                  </p>
                </div>
              </div>
            )}

            {!active && places.isSuccess && list.length === 0 && (
              <Card className="flex h-[620px] items-center justify-center">
                <EmptyState
                  title="No zones to plot"
                  description="Add a place and its geofence radius will appear here."
                  action={<Button size="lg" onClick={() => setAddOpen(true)}>Add New Place</Button>}
                />
              </Card>
            )}

            <Card className="p-5">
              <h2 className="text-headline-sm text-on-surface">Recent boundary events</h2>
              <p className="text-body-sm text-muted">
                Enter and exit transitions recorded from reported positions.
              </p>

              <ul className="mt-4 flex flex-col gap-2">
                {eventList.slice(0, 6).map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas px-4 py-3"
                  >
                    <span className="flex items-center gap-3">
                      <Badge tone={event.event === 'enter' ? 'success' : 'neutral'}>{event.event}</Badge>
                      <span className="text-body-md text-on-surface">
                        {event.place?.name ?? 'Unknown place'}
                      </span>
                    </span>
                    <span className="text-body-sm text-muted">
                      {event.user?.name} · {new Date(event.occurred_at).toLocaleString()}
                    </span>
                  </li>
                ))}
                {eventList.length === 0 && (
                  <li className="rounded-xl bg-canvas px-4 py-6 text-center text-body-sm text-muted">
                    No boundary events recorded yet.
                  </li>
                )}
              </ul>
            </Card>
          </div>
        </div>
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
