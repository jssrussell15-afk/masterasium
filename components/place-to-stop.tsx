"use client";

import { useEffect, useState } from "react";
import { PLACE_TO_STOP, setLengthMinutes } from "@/lib/practice/set-length";

export function PlaceToStop({ minutes, reached = false }: { minutes: number; reached?: boolean }) {
  const [show, setShow] = useState(reached);

  useEffect(() => {
    if (reached) {
      setShow(true);
      return;
    }
    const length = setLengthMinutes(minutes);
    const id = window.setTimeout(() => setShow(true), length * 60 * 1000);
    return () => window.clearTimeout(id);
  }, [minutes, reached]);

  if (!show) return null;
  return (
    <p className="hint place-to-stop" role="status">
      {PLACE_TO_STOP}
    </p>
  );
}
