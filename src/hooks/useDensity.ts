import { useEffect, useState } from "react";

export type Density = "rich" | "compact";

export function useDensity(): [Density, (d: Density) => void] {
  const [density, setDensity] = useState<Density>(() => {
    return (localStorage.getItem("reporadar-density") as Density | null) ?? "rich";
  });
  useEffect(() => {
    localStorage.setItem("reporadar-density", density);
  }, [density]);
  return [density, setDensity];
}
