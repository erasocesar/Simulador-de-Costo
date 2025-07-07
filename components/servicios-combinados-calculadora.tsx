"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Check,
  Clock,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

// [Código anterior conservado sin modificaciones...]

  // 5. Filtros del Catálogo
  useEffect(() => {
    const normalizar = (str: string) =>
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    let serviciosFiltrados = [...serviciosCargados];

    // 1. Si hay un Servicio Combinado activo, mostramos SOLO esos códigos:
    if (codigosCombinadosSeleccionados.length > 0) {
      serviciosFiltrados = serviciosFiltrados.filter((s) =>
        codigosCombinadosSeleccionados.includes(Number(s.Nro))
      );
    } else {
      // 2. De lo contrario, aplicamos los filtros normales:
      if (departamentoSeleccionado !== "Todos") {
        serviciosFiltrados = serviciosFiltrados.filter(
          (s) => s.Area_IsaGIS_Technologies === departamentoSeleccionado
        );
      }
      if (grupoSeleccionado !== "Todos") {
        serviciosFiltrados = serviciosFiltrados.filter(
          (s) => s.Grupo === grupoSeleccionado
        );
      }
      // Filtro por texto (busqueda) en el campo Nombre_del_Servicio y Descripción_Técnica_del_Servicio
      if (busqueda) {
        const busquedaNormalizada = normalizar(busqueda);
        serviciosFiltrados = serviciosFiltrados.filter((s) =>
          normalizar(s.Nombre_del_Servicio).includes(busquedaNormalizada) ||
          normalizar(s.Descripción_Técnica_del_Servicio || "").includes(busquedaNormalizada)
        );
      }
    }

    // Marcar como seleccionado
    serviciosFiltrados = serviciosFiltrados.map((serv) => ({
      ...serv,
      seleccionado: selectedServiceIds.includes(serv.id),
    }));

    setServicios(serviciosFiltrados);
  }, [
    serviciosCargados,
    codigosCombinadosSeleccionados,
    departamentoSeleccionado,
    grupoSeleccionado,
    busqueda,
    selectedServiceIds,
  ]);

// [Resto del código no modificado para mantener el funcionamiento actual]
