import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { api, apiError } from '@/lib/api';
import type { GeofenceEvent, Place, ServiceRequest } from '@/types';

/**
 * The geofence console: the map view, the zone inspector and the boundary log.
 * Split out of the places page, which was carrying place CRUD *and* the spatial
 * tooling in one screen.
 */
export function GeofenceConsolePage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [radius, setRadius] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const places = useQuery({
    queryKey: ['places'],
    queryFn: async () => (await api.get<{ data: Place[] }>('/v1/places')).data.data,
  });

  const events = useQuery({
    queryKey: ['geofence-events'],
    queryFn: async () => (await api.get<{ data: GeofenceEvent[] }>('/v1/geofence-events')).data.data,
  });

  const list = places.data ?? [];
  const active = list.find((place) => place.id === selected) ?? list[0] ?? null;
  const sliderValue = radius ?? active?.radius_meters ?? 300;

  const needs = useQuery({
    queryKey: ['places', active?.id, 'requests'],
    queryFn: async () =>
      (await api.get<{ data: ServiceRequest[] }>(`/v1/places/${active?.id}/requests`)).data.data,
    enabled: active !== null,
  });

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const updateRadius = useMutation({
    mutationFn: async ({ id, radiusMeters }: { id: number; radiusMeters: number }) =>
      api.patch(`/v1/places/${id}`, { radius_meters: radiusMeters }),
    onSuccess: async () => {
      setError(null);
      setNotice('Geofence radius saved.');
      await queryClient.invalidateQueries({ queryKey: ['places'] });
    },
    onError,
  });

  const report = useMutation({
    mutationFn: async (coords: { latitude: number; longitude: number }) =>
      (
        await api.post<{ transitions: { place_id: number; event: string; distance_meters: number }[] }>(
          '/v1/geofences/evaluate',
          coords,
        )
      ).data,
    onSuccess: async (data) => {
      setError(null);
      setNotice(
        data.transitions.length === 0
          ? 'No boundary changes — that position is not near a saved place.'
          : data.transitions
              .map(
                (transition) =>
                  `${transition.event} on zone #${transition.place_id} at ${transition.distance_meters} m`,
              )
              .join(', '),
      );
      await queryClient.invalidateQueries({ queryKey: ['geofence-events'] });
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
        report.mutate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () =>
        setError(
          'Location permission was denied or unavailable. Time-based reminders still fire normally.',
        ),
    );
  };

  // Normalise the stored coordinates into a 10..90 plot window.
  const bounds = (() => {
    if (list.length === 0) {
      return null;
    }

    const lats = list.map((place) => place.latitude);
    const lngs = list.map((place) => place.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      minLat,
      maxLat,
      minLng,
      maxLng,
      latSpan: maxLat - minLat || 0.01,
      lngSpan: maxLng - minLng || 0.01,
    };
  })();

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Saved Places', 'Geofence console']}
          title="Geofence console"
          description="Zone geometry, boundary events, and the store list each zone will surface."
          titleSize="headline"
          actions={
            <>
              <Button variant="outline" size="lg" onClick={useMyLocation} disabled={report.isPending}>
                <Icon name="gps_fixed" className="text-[18px] text-primary" />
                {report.isPending ? 'Reading position…' : 'Report my position'}
              </Button>
              <Link to="/places" className="inline-flex">
                <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-sage-soft px-4 text-label-lg font-semibold text-secondary transition-all hover:bg-forest-soft">
                  <Icon name="list" className="text-[18px]" />
                  Manage places
                </span>
              </Link>
            </>
          }
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="info">{notice}</Alert>}

        {list.length === 0 && places.isSuccess ? (
          <EmptyState
            title="No zones to plot"
            description="Add a saved place and its geofence radius appears here."
            action={
              <Link to="/places" className="inline-flex">
                <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-secondary px-4 text-label-lg font-semibold text-on-secondary shadow-e1">
                  <Icon name="add_location_alt" className="text-[18px]" />
                  Add a place
                </span>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
            {/* Zone selector */}
            <div className="flex flex-col gap-2 xl:col-span-4">
              {list.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => {
                    setSelected(place.id);
                    setRadius(null);
                  }}
                  aria-pressed={active?.id === place.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-left transition-all ${
                    active?.id === place.id
                      ? 'border-secondary/40 bg-forest-soft/60 shadow-e2'
                      : 'border-[rgba(43,45,66,0.05)] bg-surface shadow-e1 hover:shadow-e2'
                  }`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-label-lg text-on-surface">{place.name}</span>
                    <span className="text-body-sm text-muted">
                      {place.radius_meters} m · {place.category ?? 'other'}
                    </span>
                  </span>
                  <Badge tone={(place.active_requests_count ?? 0) > 0 ? 'primary' : 'neutral'}>
                    {place.active_requests_count ?? 0}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Plot + inspector */}
            <div className="flex flex-col gap-5 xl:col-span-8">
              {active && (
                <div className="relative h-[560px] overflow-hidden rounded-3xl bg-[#EAE8DE] shadow-e1">
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

                  <span className="absolute right-4 top-4 flex items-center gap-2 rounded-xl bg-surface/90 px-3 py-1.5 text-label-sm text-secondary shadow-e1 backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    {list.length} zones plotted
                  </span>

                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-surface/95 p-4 shadow-e2 backdrop-blur-md">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="text-label-sm uppercase tracking-wider text-muted">
                          Selected zone inspector
                        </span>
                        <span className="flex items-center gap-2">
                          <h2 className="truncate text-headline-sm text-on-surface">{active.name}</h2>
                          <Badge tone="primary">{active.radius_meters} m</Badge>
                          {active.kind_label && <Badge tone="neutral">{active.kind_label}</Badge>}
                        </span>
                        <span className="truncate text-body-sm text-muted">
                          {active.latitude.toFixed(4)}, {active.longitude.toFixed(4)}
                          {active.address ? ` · ${active.address}` : ''}
                        </span>

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

                      <Button
                        variant="soft"
                        disabled={report.isPending}
                        onClick={() =>
                          report.mutate({
                            latitude: active.latitude,
                            longitude: active.longitude,
                          })
                        }
                      >
                        <Icon name="sensors" className="text-[18px]" />
                        Test simulated ping
                      </Button>
                    </div>

                    <p className="mt-2 text-body-sm text-muted">
                      Schematic plot of real stored coordinates, drawn to relative scale. Live map tiles
                      need a tile-provider key.
                    </p>
                  </div>
                </div>
              )}

              <Card className="p-5">
                <h2 className="text-headline-sm text-on-surface">Recent boundary events</h2>
                <p className="text-body-sm text-muted">
                  Enter and exit transitions recorded from reported positions.
                </p>

                <ul className="mt-4 flex flex-col gap-2">
                  {(events.data ?? []).slice(0, 8).map((event) => (
                    <li
                      key={event.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas px-4 py-3"
                    >
                      <span className="flex items-center gap-3">
                        <Badge tone={event.event === 'enter' ? 'success' : 'neutral'}>
                          {event.event}
                        </Badge>
                        <span className="text-body-md text-on-surface">
                          {event.place?.name ?? 'Unknown place'}
                        </span>
                      </span>
                      <span className="text-body-sm text-muted">
                        {event.user?.name} · {new Date(event.occurred_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                  {(events.data ?? []).length === 0 && (
                    <li className="rounded-xl bg-canvas px-4 py-6 text-center text-body-sm text-muted">
                      No boundary events recorded yet.
                    </li>
                  )}
                </ul>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
