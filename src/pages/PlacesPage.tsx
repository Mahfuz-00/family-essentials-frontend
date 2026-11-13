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
import { QueryError } from '@/components/ui/query-error';
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

/**
 * An empty coordinate pair, not a guess.
 *
 * The form used to prefill Dhaka's coordinates, so a place saved without
 * touching those two fields got a geofence in the wrong country. Coordinates
 * are validated when the form is submitted instead.
 */
const emptyForm = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  radius_meters: 300,
  category: 'grocery',
};

/** Latitude is ±90, longitude ±180; anything else is not a position. */
function coordinate(raw: string, limit: number): number | null {
  const trimmed = raw.trim();

  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return null;
  }

  const value = Number(trimmed);

  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

const COORDINATE_ERROR =
  'Enter the latitude (−90 to 90) and longitude (−180 to 180) of this place before saving.';

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
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [mapRadius, setMapRadius] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
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

  const updateRadius = useMutation({
    mutationFn: async ({ id, radiusMeters }: { id: number; radiusMeters: number }) =>
      api.patch(`/v1/places/${id}`, { radius_meters: radiusMeters }),
    onSuccess: async () => {
      setError(null);
      setNotice('Geofence radius successfully adjusted and saved.');
      await refresh();
    },
    onError,
  });

  const create = useMutation({
    mutationFn: async (position: { latitude: number; longitude: number }) =>
      api.post('/v1/places', {
        name: form.name,
        address: form.address || null,
        latitude: position.latitude,
        longitude: position.longitude,
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

  /** Checked here rather than by the API: a missing position is a form problem. */
  const submitPlace = () => {
    const latitude = coordinate(form.latitude, 90);
    const longitude = coordinate(form.longitude, 180);

    if (latitude === null || longitude === null) {
      setError(COORDINATE_ERROR);
      setNotice(null);

      return;
    }

    create.mutate({ latitude, longitude });
  };

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
  const activePlace = list.find((p) => p.id === selectedPlaceId) ?? list[0] ?? null;
  const activeRadius = mapRadius ?? activePlace?.radius_meters ?? 300;

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
          title="Saved places"
          description="The stores and places your family visits, each with the radius that arms its geofence."
          titleSize="headline"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setShowMap(!showMap)}
              >
                <Icon name={showMap ? 'map' : 'layers'} className="text-[18px]" />
                {showMap ? 'Hide Map' : 'Show Map'}
              </Button>
              <Button size="lg" onClick={() => setAddOpen(true)}>
                <Icon name="add_location_alt" className="text-[18px]" />
                Add New Place
              </Button>
            </div>
          }
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {/* OpenStreetMap Interactive Saved Places View (Point 20) */}
        {list.length > 0 && showMap && (
          <Card className="overflow-hidden p-0 border border-outline-variant/30">
            <div className="flex flex-col xl:flex-row items-stretch">
              <div className="relative h-[340px] xl:h-[380px] w-full xl:w-2/3 bg-[#EAE8DE] overflow-hidden">
                {activePlace ? (
                  <iframe
                    title={`OpenStreetMap view of ${activePlace.name}`}
                    className="absolute inset-0 h-full w-full border-0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${activePlace.longitude - 0.008}%2C${activePlace.latitude - 0.005}%2C${activePlace.longitude + 0.008}%2C${activePlace.latitude + 0.005}&layer=mapnik&marker=${activePlace.latitude}%2C${activePlace.longitude}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted">
                    Select a place to view on OpenStreetMap
                  </div>
                )}
                <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-xl bg-surface/90 px-3 py-1.5 text-label-sm font-bold text-on-surface shadow-e1 backdrop-blur-md z-10 border border-outline-variant/30">
                  <Icon name="map" className="text-[16px] text-secondary" />
                  <span>OpenStreetMap Live View</span>
                </span>
                {activePlace && (
                  <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-xl bg-surface/90 px-3 py-1.5 text-label-sm font-semibold text-secondary shadow-e1 backdrop-blur-md z-10 border border-outline-variant/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                    </span>
                    <span>Zone: {activePlace.name} ({activeRadius}m)</span>
                  </span>
                )}
              </div>

              {/* Adjust from Map panel */}
              {activePlace && (
                <div className="flex flex-col justify-between p-5 xl:w-1/3 bg-surface border-t xl:border-t-0 xl:border-l border-outline-variant/20">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-label-sm font-semibold uppercase tracking-wider text-muted">Adjust from Map</span>
                      <Badge tone="primary">{activePlace.category ?? 'grocery'}</Badge>
                    </div>
                    <div>
                      <h3 className="text-headline-sm font-bold text-on-surface">{activePlace.name}</h3>
                      <p className="text-body-sm text-muted truncate">{activePlace.address ?? `${activePlace.latitude.toFixed(4)}, ${activePlace.longitude.toFixed(4)}`}</p>
                    </div>

                    <div className="rounded-xl bg-sage-soft/40 p-3 flex flex-col gap-2 border border-secondary/15">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="map-radius" className="text-label-md font-semibold text-secondary">
                          Geofence Radius
                        </Label>
                        <span className="text-label-md font-bold text-secondary">{activeRadius} m</span>
                      </div>
                      <input
                        id="map-radius"
                        type="range"
                        min={50}
                        max={2000}
                        step={50}
                        value={activeRadius}
                        onChange={(e) => setMapRadius(Number(e.target.value))}
                        className="h-2 w-full cursor-pointer accent-secondary"
                      />
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMapRadius(Math.max(50, activeRadius - 50))}
                        >
                          -50m
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMapRadius(Math.min(2000, activeRadius + 50))}
                        >
                          +50m
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-outline-variant/20">
                    <Button
                      size="md"
                      className="flex-1"
                      disabled={updateRadius.isPending || activeRadius === activePlace.radius_meters}
                      onClick={() => updateRadius.mutate({ id: activePlace.id, radiusMeters: activeRadius })}
                    >
                      {updateRadius.isPending ? 'Saving...' : 'Save Radius'}
                    </Button>
                    <Link to="/places/console">
                      <Button variant="ghost" size="md">Console →</Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

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
        {places.isError && (
          <QueryError error={places.error} what="saved places" onRetry={() => void places.refetch()} />
        )}

        {places.isSuccess && visible.length === 0 && (
          <EmptyState
            title={list.length === 0 ? 'No saved places yet' : 'No places match'}
            description={
              list.length === 0
                ? 'Add the stores and places your family visits so lists surface at the right moment.'
                : 'Adjust the search or category filter to find a saved place.'
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
                      <h2 className="truncate text-base font-semibold text-on-surface">{place.name}</h2>
                      <span className="truncate text-xs text-muted">
                        {place.address ??
                          `${place.latitude.toFixed(3)}, ${place.longitude.toFixed(3)}`}
                      </span>
                    </span>
                  </span>
                  <Badge
                    tone={(place.active_requests_count ?? 0) > 0 ? 'primary' : 'neutral'}
                    className="shrink-0 text-[11px] font-medium px-2 py-0.5"
                  >
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-secondary hover:bg-sage-soft font-semibold"
                      onClick={() => {
                        setSelectedPlaceId(place.id);
                        setMapRadius(place.radius_meters);
                        setShowMap(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <Icon name="location_searching" className="text-[16px] mr-1" />
                      Adjust on Map
                    </Button>
                    <Link
                      to="/places/console"
                      className="text-body-sm font-semibold text-muted hover:text-secondary hover:underline"
                    >
                      Console →
                    </Link>
                  </div>
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
              onClick={submitPlace}
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
                placeholder="e.g. 51.5074"
              />
            </div>
            <div>
              <Label htmlFor="place-lng">Longitude</Label>
              <Input
                id="place-lng"
                inputMode="decimal"
                value={form.longitude}
                onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                placeholder="e.g. -0.1278"
              />
            </div>
          </div>

          <p className="text-body-sm text-muted">
            The geofence arms from these two numbers, so they are required: a place saved without them
            would have a radius in the wrong place.
          </p>

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
