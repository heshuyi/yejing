import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

import type { GeoPoint, TrackPoint, TrackPointInput } from "@/lib/api";
import { computeLiveStats } from "@/lib/recordingMetrics";

type RecordingPhase = "idle" | "recording" | "paused";

interface UseGpsRecordingOptions {
  enabled: boolean;
  onUpload: (points: TrackPointInput[]) => Promise<void>;
}

function toGeoPoint(location: Location.LocationObject): GeoPoint {
  return {
    type: "Point",
    coordinates: [location.coords.longitude, location.coords.latitude],
  };
}

function locationToInput(location: Location.LocationObject): TrackPointInput {
  return {
    timestamp: new Date(location.timestamp).toISOString(),
    location: toGeoPoint(location),
    altitude: location.coords.altitude ?? undefined,
    speed: location.coords.speed ?? undefined,
    accuracy: location.coords.accuracy ?? undefined,
  };
}

let mockSeq = 0;

function mockLocation(): Location.LocationObject {
  mockSeq += 1;
  const baseLng = 120.12;
  const baseLat = 30.22;
  return {
    coords: {
      latitude: baseLat + mockSeq * 0.0003,
      longitude: baseLng + mockSeq * 0.0003,
      altitude: 100 + mockSeq * 2,
      accuracy: 10,
      altitudeAccuracy: 5,
      heading: 0,
      speed: 1.2,
    },
    timestamp: Date.now(),
  };
}

export function useGpsRecording({ enabled, onUpload }: UseGpsRecordingOptions) {
  const [phase, setPhase] = useState<RecordingPhase>("idle");
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [durationSec, setDurationSec] = useState(0);
  const [useMock, setUseMock] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bufferRef = useRef<TrackPointInput[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<RecordingPhase>("idle");

  const stats = computeLiveStats(
    points.map((p) => ({ location: p.location, altitude: p.altitude })),
  );

  const flushBuffer = useCallback(async () => {
    if (bufferRef.current.length === 0) return;
    const batch = bufferRef.current.splice(0, bufferRef.current.length);
    await onUpload(batch);
  }, [onUpload]);

  const appendPoint = useCallback((input: TrackPointInput) => {
    setPoints((prev) => [
      ...prev,
      {
        timestamp: input.timestamp,
        location: input.location,
        altitude: input.altitude ?? null,
        speed: input.speed ?? null,
        accuracy: input.accuracy ?? null,
      },
    ]);
    bufferRef.current.push(input);
    if (bufferRef.current.length >= 5) {
      void flushBuffer();
    }
  }, [flushBuffer]);

  const stopWatchers = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    if (mockTimerRef.current) {
      clearInterval(mockTimerRef.current);
      mockTimerRef.current = null;
    }
  }, []);

  const startWatchers = useCallback(async () => {
    stopWatchers();
    if (useMock) {
      mockTimerRef.current = setInterval(() => {
        if (phaseRef.current !== "recording") return;
        appendPoint(locationToInput(mockLocation()));
      }, 3000);
      return;
    }

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      (location) => {
        if (phaseRef.current !== "recording") return;
        appendPoint(locationToInput(location));
      },
    );
  }, [appendPoint, stopWatchers, useMock]);

  const start = useCallback(async () => {
    if (!useMock) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setUseMock(true);
      }
    }
    phaseRef.current = "recording";
    setPhase("recording");
    await startWatchers();
  }, [startWatchers, useMock]);

  const pause = useCallback(async () => {
    phaseRef.current = "paused";
    setPhase("paused");
    stopWatchers();
    await flushBuffer();
  }, [flushBuffer, stopWatchers]);

  const resume = useCallback(async () => {
    phaseRef.current = "recording";
    setPhase("recording");
    await startWatchers();
  }, [startWatchers]);

  const stop = useCallback(async () => {
    phaseRef.current = "idle";
    setPhase("idle");
    stopWatchers();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    await flushBuffer();
  }, [flushBuffer, stopWatchers]);

  const hydrate = useCallback((existing: TrackPoint[]) => {
    setPoints(existing);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    timerRef.current = setInterval(() => {
      if (phaseRef.current === "recording") {
        setDurationSec((s) => s + 1);
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled]);

  useEffect(() => () => stopWatchers(), [stopWatchers]);

  return {
    phase,
    points,
    durationSec,
    stats,
    useMock,
    hydrate,
    start,
    pause,
    resume,
    stop,
  };
}
