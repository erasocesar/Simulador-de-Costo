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

// ---------------- Tipos -----------------
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

// ---------- Herramienta auxiliar ----------
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

// ----------- Componente principal ---------------
export default function ServiciosCombinadosCalculadora() {
  // --- Estados para combos (Departamento, Grupo)
  const [departamentosFiltro, setDepartamentosFiltro] = useState<string[]>([])
  const [gruposFiltro, setGruposFiltro] = useState<string[]>([])
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("Todos")
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("Todos")

  // --- Estados para Catálogo
  const [serviciosCargados, setServiciosCargados] = useState<Servicio[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroCombinado, setFiltroCombinado] = useState("")
  const [codigosCombinadosSeleccionados, setCodigosCombinadosSeleccionados] = useState<number[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // --- Estados para cálculos
  const [tiempoTotal, setTiempoTotal] = useState<number>(0)
  const [costosBase, setCostosBase] = useState<CostoBase[]>([])
  const [costosTotalesFull1, setCostosTotalesFull1] = useState<number>(0)
  const [costosTotalesFull2, setCostosTotalesFull2] = useState<number>(0)
  const [costosTotalesPromo1, setCostosTotalesPromo1] = useState<number>(0)
  const [costosTotalesPromo2, setCostosTotalesPromo2] = useState<number>(0)
  const [costosTotalesPromo3, setCostosTotalesPromo3] = useState<number>(0)
  const [indiceDetalleActual, setIndiceDetalleActual] = useState(0)

  // --- Estado para almacenar el map/diccionario de Servicios Combinados
  const [mapCombinados, setMapCombinados] = useState<{ [key: string]: number[] }>({})

  //--------------------------------------------------------------------
  // 1. Cargar Catálogo de Servicios
  //--------------------------------------------------------------------
  const cargarDatos = async () => {
    try {
      setCargando(true)
      setError(null)
      const url =
        "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Catalogo_de_Servicios.geojson"
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-cache",
      })
      if (!response.ok) throw new Error(`Error ${response.status}`)
      const data = await response.json()
      if (!Array.isArray(data.features)) throw new Error("Sin features")

      const serviciosFormateados: Servicio[] = data.features.map((f: any, i: number) => {
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
          Notas_Adicionales: p.Notas_Adicionales || "Sin notas",
          Descripción_Técnica_del_Servicio: p["Descripción_Técnica_del_Servicio"] || "",
          costoBase: Number(p.costoBase) || 0,
          seleccionado: false,
        }
      })

      setServiciosCargados(
        serviciosFormateados.filter((s) => s.Area_IsaGIS_Technologies !== "Uso Interno IsaGIS")
      )
    } catch (e: any) {
      setError(e.message)
      setServiciosCargados([])
    } finally {
      setCargando(false)
    }
  }

  //--------------------------------------------------------------------
  // 2. Cargar combos Departamento / Grupo
  //--------------------------------------------------------------------
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/erasocesar/GeoJSONs/refs/heads/main/Grupos_Servicios.geojson"
    )
      .then((r) => r.json())
      .then((d) => {
        const deps = [...new Set(d.features.map((f: any) => f.properties.Area_Estrategica))]
        setDepartamentosFiltro(deps)
        const grps = [...new Set(d.features.map((f: any) => f.properties.Grupo))]
        setGruposFiltro(grps)
      })
      .catch(console.error)
  }, [])

  //--------------------------------------------------------------------
  // 3. Cargar Catálogo al iniciar
  //--------------------------------------------------------------------
  useEffect(cargarDatos, [])

  //--------------------------------------------------------------------
  // 4. Filtro principal (acentos + descripción técnica)
  //--------------------------------------------------------------------
  useEffect(() => {
    let filtrados = [...serviciosCargados]

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
      filtrados.map((sv) => ({ ...sv, seleccionado: selectedServiceIds.includes(sv.id) }))
    )
  }, [
    serviciosCargados,
    codigosCombinadosSeleccionados,
    departamentoSeleccionado,
    grupoSeleccionado,
    busqueda,
    selectedServiceIds,
  ])

  //--------------------------------------------------------------------
  // 5. Calcular tiempo y costos (idéntico al original)
  //--------------------------------------------------------------------
  useEffect(() => {
    const seleccionados = serviciosCargados.filter((s) => selectedServiceIds.includes(s.id))

    if (!seleccionados.length) {
      setTiempoTotal(0)
      setCostosTotalesFull1(0)
      setCostosTotalesFull2(0)
      setCostosTotalesPromo1(0)
      setCostosTotalesPromo2(0)
      setCostosTotalesPromo3(0)
      return
    }

    const totalTE = seleccionados.reduce(
      (sum, s) => sum + (Number(s.Tiempo_dias_habiles) || 0),
      0
    )
    setTiempoTotal(totalTE)

    const totalBasicos = seleccionados.reduce((sum, s) => sum + (Number(s.Basicos) || 0), 0)
    const totalIntermedios = seleccionados.reduce((sum, s) => sum + (Number(s.Intermedios) || 0), 0)
    const totalAvanzados = seleccionados.reduce((sum, s) => sum + (Number(s.Avanzados) || 0), 0)

    const getCostoBase = (tipo: string, modalidad: string): number => {
      const c = costosBase.find((cb) => cb.Tipo_de_Servicio === tipo && cb.Modalidad_de_Contrato === modalidad)
      return c ? c.Costos_Base : 0
    }

    setCostosTotalesFull1(
      totalBasicos * getCostoBase("Basico", "Full 1") +
        totalIntermedios * getCostoBase("Intermedio", "Full
