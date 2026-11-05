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
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
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
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checkedItemIds, setCheckedItemIds] = useState<number[]>([]);

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

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Saved Places', 'Geofence console']}
          title="Geofence console"
          description="Zone geometry, boundary events, and the store list each zone will surface."
          titleSize="headline"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setChecklistOpen(true)}
              >
                <Icon name="smartphone" className="text-[18px]" />
                Glanceable Store Checklist (Gap E)
              </Button>
              <Button variant="primary" size="lg" onClick={useMyLocation} disabled={report.isPending}>
                <Icon name="gps_fixed" className="text-[18px]" />
                {report.isPending ? 'Reading position…' : 'Report my position'}
              </Button>
            </div>
          }
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="info">{notice}</Alert>}

        {places.isError ? (
          <QueryError error={places.error} what="the saved places" onRetry={() => void places.refetch()} />
        ) : list.length === 0 && places.isSuccess ? (
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
                  {/* OpenStreetMap Interactive View */}
                  <iframe
                    title={`OpenStreetMap view of ${active.name}`}
                    className="absolute inset-0 h-full w-full border-0 rounded-3xl z-0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${active.longitude - 0.008}%2C${active.latitude - 0.005}%2C${active.longitude + 0.008}%2C${active.latitude + 0.005}&layer=mapnik&marker=${active.latitude}%2C${active.longitude}`}
                    loading="lazy"
                  />

                  {/* OpenStreetMap Attribution & Status Badge */}
                  <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-xl bg-surface/95 px-3 py-1.5 text-label-sm font-bold text-on-surface shadow-e1 backdrop-blur-md z-10 border border-outline-variant/30">
                    <Icon name="map" className="text-[16px] text-secondary" />
                    <span>OpenStreetMap</span>
                  </span>

                  <span className="absolute right-4 top-4 flex items-center gap-2 rounded-xl bg-surface/95 px-3 py-1.5 text-label-sm font-semibold text-secondary shadow-e1 backdrop-blur-md z-10 border border-outline-variant/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                    </span>
                    {list.length} zones plotted
                  </span>

                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-surface/95 p-4 shadow-e2 backdrop-blur-md z-10 border border-outline-variant/30">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-label-sm uppercase tracking-wider text-muted font-bold">
                            Selected zone inspector
                          </span>
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${active.latitude}&mlon=${active.longitude}#map=16/${active.latitude}/${active.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-label-sm font-bold text-secondary hover:underline inline-flex items-center gap-1"
                          >
                            <span>Open in OpenStreetMap</span>
                            <Icon name="open_in_new" className="text-[14px]" />
                          </a>
                        </div>
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
                  {events.isError && (
                    <li>
                      <QueryError
                        error={events.error}
                        what="the boundary events"
                        onRetry={() => void events.refetch()}
                      />
                    </li>
                  )}
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
                  {!events.isError && (events.data ?? []).length === 0 && (
                    <li className="rounded-xl bg-canvas px-4 py-6 text-center text-body-sm text-muted">
                      No boundary events recorded yet.
                    </li>
                  )}
                </ul>
              </Card>
            </div>
          </div>
        )}

        {/* Gap E: Mobile Lockscreen & Glanceable Store Checklist Simulation */}
        <Modal
          open={checklistOpen}
          onClose={() => setChecklistOpen(false)}
          title="Mobile Lockscreen &amp; Glanceable Store Checklist (Gap E)"
        >
          <div className="flex flex-col gap-4 p-1">
            <p className="text-xs text-muted leading-relaxed">
              When a family member approaches a saved geofenced store (e.g. {active?.name ?? 'Trader Joe\'s'}), this glanceable shopping checklist appears on their mobile lockscreen as a Live Activity / persistent notification with one-tap item check-offs.
            </p>

            {/* Mobile Lockscreen Frame Simulation */}
            <div className="mx-auto w-full max-w-sm rounded-[32px] border-4 border-outline-variant/60 bg-surface-container-lowest p-4 shadow-e3">
              {/* Device Notch & Status bar */}
              <div className="flex items-center justify-between pb-3 text-[11px] font-semibold text-muted">
                <span>9:41 AM</span>
                <div className="h-3.5 w-20 rounded-full bg-outline-variant/30" />
                <div className="flex items-center gap-1">
                  <Icon name="signal_cellular_alt" className="text-[13px]" />
                  <Icon name="wifi" className="text-[13px]" />
                  <Icon name="battery_full" className="text-[14px]" />
                </div>
              </div>

              {/* Lockscreen Live Activity Notification Card */}
              <div className="rounded-2xl border border-secondary/30 bg-surface p-3.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary text-on-secondary">
                      <Icon name="location_on" className="text-[14px]" />
                    </span>
                    <span className="text-xs font-bold text-on-surface">FairShare Store Arrival</span>
                  </div>
                  <span className="text-[10px] text-muted font-medium">Just now</span>
                </div>

                <div className="mt-2 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-secondary">
                      📍 Arrived at {active?.name ?? 'Store'}
                    </span>
                    <Badge tone="success">In Zone</Badge>
                  </div>
                  <span className="text-[11px] text-muted">
                    {(needs.data ?? []).length} items requested by family
                  </span>
                </div>

                {/* Glanceable Checklist Items */}
                <div className="mt-3 flex flex-col gap-1.5">
                  {(needs.data ?? []).length === 0 ? (
                    <div className="rounded-xl bg-forest-soft/40 p-3 text-center text-xs text-secondary font-medium">
                      ✓ No pending requests for this location. Everything restocked!
                    </div>
                  ) : (
                    (needs.data ?? []).map((req) => {
                      const isChecked = checkedItemIds.includes(req.id);
                      return (
                        <button
                          key={req.id}
                          type="button"
                          onClick={() => {
                            setCheckedItemIds((prev) =>
                              prev.includes(req.id) ? prev.filter((id) => id !== req.id) : [...prev, req.id]
                            );
                          }}
                          className={`flex items-center justify-between rounded-xl p-2.5 text-xs text-left transition-all border ${
                            isChecked
                              ? 'border-outline-variant/30 bg-surface-container-low text-muted line-through'
                              : 'border-secondary/20 bg-forest-soft/30 text-on-surface hover:bg-forest-soft/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                isChecked
                                  ? 'border-secondary bg-secondary text-on-secondary'
                                  : 'border-outline-variant bg-surface'
                              }`}
                            >
                              {isChecked && <Icon name="check" className="text-[14px]" />}
                            </span>
                            <span className="font-semibold">{req.title}</span>
                          </div>
                          {req.quantity && (
                            <span className="text-[10px] font-mono rounded bg-surface px-1.5 py-0.5 border border-outline-variant/30">
                              {req.quantity}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Quick Action Footer */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-outline-variant/20 text-[11px]">
                  <span className="text-muted">
                    {checkedItemIds.length} of {(needs.data ?? []).length} checked
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (needs.data) {
                        setCheckedItemIds(needs.data.map((r) => r.id));
                      }
                    }}
                    className="font-bold text-secondary hover:underline"
                  >
                    Check All Off
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setChecklistOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
