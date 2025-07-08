"use client"

import { Servicio } from "@/types/servicio";
import { useEffect, useState } from "react";

interface Props {
  servicios: Servicio[];
  onSelect: (servicio: Servicio) => void;
  selectedServicios: Servicio[];
}

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export default function ServiciosCombinadosCalculadora({
  servicios,
  onSelect,
  selectedServicios,
}: Props) {
  const [busqueda, setBusqueda] = useState<string>("");
  const [serviciosFiltrados, setServiciosFiltrados] = useState<Servicio[]>([]);

  useEffect(() => {
    const filtro = normalizeText(busqueda);
    const filtrados = servicios.filter((servicio) => {
      const nombre = normalizeText(servicio.Nombre_del_Servicio);
      const descripcion = normalizeText(servicio.Descripcion_Tecnica_del_Servicio || "");
      return nombre.includes(filtro) || descripcion.includes(filtro);
    });
    setServiciosFiltrados(filtrados);
  }, [busqueda, servicios]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Buscar servicios..."
        className="w-full px-4 py-2 border rounded-md shadow-sm"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      <ul className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto">
        {serviciosFiltrados.map((servicio) => (
          <li
            key={servicio.Nombre_del_Servicio}
            className={`p-2 border rounded cursor-pointer hover:bg-blue-100 transition ${
              selectedServicios.some(
                (s) => s.Nombre_del_Servicio === servicio.Nombre_del_Servicio
              )
                ? "bg-blue-200"
                : ""
            }`}
            onClick={() => onSelect(servicio)}
          >
            <div className="font-semibold">{servicio.Nombre_del_Servicio}</div>
            <div className="text-sm text-gray-600">
              {servicio.Descripcion_Tecnica_del_Servicio}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
