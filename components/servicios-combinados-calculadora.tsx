"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Check,
  Clock,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

/* ---------------------------------------------------------------------
   Tipos
------------------------------------------------------------------------ */
type Servicio = {
  id: number
  Nro: string
  Nombre_del_Servicio: string
  Area_IsaGIS_Technologies: string
  Grupo: string
  Subgrupo: string
  descripcion?: string
  Basicos: number
  Intermedios: number
  Avanzados: number
  Tiempos_de_entrega: string
  Tiempo_dias_habiles: number
  Detalles_Costo_Base: string
  Notas_Adicionales: string
  Descripción_Técnica_del_Servicio: string
  costoBase?: number
  seleccionado: boolean
}

type CostoBase = {
  id: number
  Tipo_de_Servicio: string
  Modalidad_de_Contrato: string
  Costos_Base: number
}

/* ---------------------------------------------------------------------
   Componente principal
------------------------------------------------------------------------ */
export default function ServiciosCombinadosCalculadora() {
  /* ------------------ Estados ------------------ */
  // Combos
  const [departamentosFiltro, setDepartamentosFiltro] = useState<string[]>([])
  const [gruposFiltro, setGruposFiltro] = useState<string[]>([])
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("Todos")
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("Todos")

  // Catálogo
  const [serviciosCargados, setServiciosCargados] = useState<Servicio[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroCombinado, setFiltroCombinado] = useState("")
  const [codigosCombinadosSeleccionados, setCodigosCombinadosSeleccionados] = useState<number[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cálculos
  const [tiempoTotal, setTiempoTotal] = useState<number>(0)
  const [costosBase, setCostosBase] = useState<CostoBase[]>([])
  const [costosTotalesFull1, setCostosTotalesFull1] = useState<number>(0)
  const [costosTotalesFull2, setCostosTotalesFull2] = useState<number>(0)
  const [costosTotalesPromo1, setCostosTotalesPromo1] = useState<number>(0)
  const [costosTotalesPromo2, setCostosTotalesPromo2] = useState<number>(0)
  const [costosTotalesPromo3, setCostosTotalesPromo3] = useState<number>(0)
  const [indiceDetalleActual, setIndiceDetalleActual] = useState(0)

  // Servicios combinados
  const [mapCombinados, setMapCombinados] = useState<{ [key: string]: number[] }>({})

  /* -------------------------------------------------------------------
     1. Cargar Catálogo de Servicios
  ------------------------------------------------------------------- */
  const cargarDatos = async () => {
    try {
      setCargando(true)
      setError(null)
      const url =
        "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Catalogo_de_Servicios.geojson"
      const r = await fetch(url, { cache: "no-cache" })
      if (!r.ok) throw new Error(`Error ${r.status}`)
      const data = await r.json()
      if (!Array.isArray(data.features)) throw new Error("Sin features")

      const formateados: Servicio[] = data.features.map((f: any, i: number) => {
        const p = f.properties || {}
        return {
          id: i + 1,
          Nro: p.Nro || `SRV${String(i + 1).padStart(3, "0")}`,
          Nombre_del_Servicio: p.Nombre_del_Servicio || "Servicio sin nombre",
          Area_IsaGIS_Technologies: p.Area_IsaGIS_Technologies || "Sin área",
          Grupo: p.Grupo || "Sin grupo",
          Subgrupo: p.Subgrupo || "Sin subgrupo",
          descripcion: p.descripcion || "",
          Basicos: Number(p.Basicos) || 0,
          Intermedios: Number(p.Intermedios) || 0,
          Avanzados: Number(p.Avanzados) || 0,
          Tiempos_de_entrega: p.Tiempos_de_entrega || "N/A",
          Tiempo_dias_habiles: parseFloat(String(p.Tiempo__Dias_habiles_ || "0").replace(",", ".")),
          Detalles_Costo_Base: p.Detalles_Costo_Base || "Sin detalles",
          Notas_Adicionales: p.Notas_Adicionales || "Sin notas adicionales",
          Descripción_Técnica_del_Servicio: p["Descripción_Técnica_del_Servicio"] || "",
          costoBase: Number(p.costoBase) || 0,
          seleccionado: false,
        }
      })

      setServiciosCargados(
        formateados.filter((s) => s.Area_IsaGIS_Technologies !== "Uso Interno IsaGIS")
      )
    } catch (e: any) {
      setError(e.message)
      setServiciosCargados([])
    } finally {
      setCargando(false)
    }
  }

  /* -------------------------------------------------------------------
     2. Cargar combos (Departamento y Grupo)
  ------------------------------------------------------------------- */
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Grupos_Servicios.geojson"
    )
      .then((r) => r.json())
      .then((d) => {
        setDepartamentosFiltro([...new Set(d.features.map((f: any) => f.properties.Area_Estrategica))])
        setGruposFiltro([...new Set(d.features.map((f: any) => f.properties.Grupo))])
      })
      .catch(console.error)
  }, [])

  /* -------------------------------------------------------------------
     3. Cargar catálogo al montar
  ------------------------------------------------------------------- */
  useEffect(cargarDatos, [])

  /* -------------------------------------------------------------------
     4. Filtro principal  (ACENTOS + MAY/MIN + DESCRIPCIÓN TÉCNICA)
  ------------------------------------------------------------------- */
  useEffect(() => {
    const normalizar = (str: string) =>
      str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // quita diacríticos
        .toLowerCase()

    let filtrados = [...serviciosCargados]

    // Servicio combinado activo
    if (codigosCombinadosSeleccionados.length) {
      filtrados = filtrados.filter((s) => codigosCombinadosSeleccionados.includes(Number(s.Nro)))
    } else {
      if (departamentoSeleccionado !== "Todos")
        filtrados = filtrados.filter((s) => s.Area_IsaGIS_Technologies === departamentoSeleccionado)

      if (grupoSeleccionado !== "Todos")
        filtrados = filtrados.filter((s) => s.Grupo === grupoSeleccionado)

      if (busqueda) {
        const b = normalizar(busqueda)
        filtrados = filtrados.filter(
          (s) =>
            normalizar(s.Nombre_del_Servicio).includes(b) ||
            normalizar(s.Descripción_Técnica_del_Servicio || "").includes(b)
        )
      }
    }

    setServicios(
      filtrados.map((s) => ({ ...s, seleccionado: selectedServiceIds.includes(s.id) }))
    )
  }, [
    serviciosCargados,
    codigosCombinadosSeleccionados,
    departamentoSeleccionado,
    grupoSeleccionado,
    busqueda,
    selectedServiceIds,
  ])

  /* -------------------------------------------------------------------
     5. (TODO el resto de tus efectos, cálculos y JSX ORIGINAL)
     Nada más cambió la sección anterior; el resto permanece idéntico.
  ------------------------------------------------------------------- */

  /* ------------- Resto de tu código (JSX) aquí -------------- */
  return (
    /* ⚠️ Pega aquí TODO el JSX que ya funcionaba:
         - catálogo
         - resumen
         - botones
         - etc.
       NO he tocado esa parte; simplemente sustituye la vieja por esta cabecera y el useEffect de filtrado */
    <div>Reemplaza este fragmento con tu JSX existente (no ha cambiado structurally)</div>
  )
}
